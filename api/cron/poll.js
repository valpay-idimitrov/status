const { supabase } = require("../../lib/supabase");
const components = require("../../lib/components");

const DD_SITE = process.env.DD_SITE || "datadoghq.com";
const DD_API_KEY = process.env.DD_API_KEY;
const DD_APP_KEY = process.env.DD_APP_KEY;

const STATE_RANK = { OK: 0, Warn: 1, "No Data": 2, Alert: 3, Ignored: 0, Skipped: 0 };
const STATE_TO_COMPONENT_STATUS = {
  OK: "operational",
  Warn: "degraded_performance",
  "No Data": "degraded_performance",
  Alert: "major_outage",
};

async function fetchMonitorsForTag(tag) {
  const url = `https://api.${DD_SITE}/api/v1/monitor?monitor_tags=${encodeURIComponent(tag)}`;
  const res = await fetch(url, {
    headers: { "DD-API-KEY": DD_API_KEY, "DD-APPLICATION-KEY": DD_APP_KEY },
  });
  if (!res.ok) throw new Error(`Datadog API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function getCurrentStatus(componentId) {
  const { data } = await supabase
    .from("status_events")
    .select("id, status")
    .eq("component_id", componentId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function recordStatus(componentId, status) {
  const current = await getCurrentStatus(componentId);
  if (current && current.status === status) return; // no change

  const now = new Date().toISOString();
  if (current) {
    await supabase.from("status_events").update({ ended_at: now }).eq("id", current.id);
  }
  await supabase.from("status_events").insert({ component_id: componentId, status, started_at: now, ended_at: null });
}

module.exports = async (req, res) => {
  // Vercel Cron sends requests with this header; reject anything else so
  // the poll endpoint can't be triggered by a random public GET.
  const isVercelCron = req.headers["x-vercel-cron"] !== undefined;
  const hasAdminToken = req.headers["x-admin-token"] === process.env.ADMIN_TOKEN && process.env.ADMIN_TOKEN;
  if (!isVercelCron && !hasAdminToken) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const results = [];

  for (const component of components) {
    try {
      const monitors = await fetchMonitorsForTag(component.datadogTag);

      if (monitors.length === 0) {
        console.warn(
          `[poll] No monitors found for tag "${component.datadogTag}" (component "${component.id}"). ` +
            `Tag at least one Datadog monitor with this tag so its status is real, not assumed.`
        );
        results.push({ component: component.id, skipped: true, reason: "no monitors tagged" });
        continue;
      }

      let worstState = "OK";
      for (const m of monitors) {
        const state = m.overall_state || "OK";
        if ((STATE_RANK[state] ?? 0) > (STATE_RANK[worstState] ?? 0)) worstState = state;
      }

      const status = STATE_TO_COMPONENT_STATUS[worstState] || "operational";
      await recordStatus(component.id, status);
      results.push({ component: component.id, status, monitorCount: monitors.length });
    } catch (err) {
      console.error(`[poll] Failed to poll component "${component.id}":`, err.message);
      results.push({ component: component.id, error: err.message });
      // Deliberately do not mark the component down just because the poll
      // itself failed (e.g. Datadog API hiccup) — it keeps its last known
      // state until the next successful poll, rather than showing a false
      // outage triggered by our own infrastructure.
    }
  }

  res.status(200).json({ polledAt: new Date().toISOString(), results });
};
