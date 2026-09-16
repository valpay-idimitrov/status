const { supabase } = require("../lib/supabase");
const components = require("../lib/components");
const { uptimePercent, dailyHistory, STATUS_RANK } = require("../lib/uptime");

const STATUS_LABEL = {
  operational: "Operational",
  degraded_performance: "Degraded Performance",
  partial_outage: "Partial Outage",
  major_outage: "Major Outage",
};

module.exports = async (req, res) => {
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });

  const since90 = new Date(Date.now() - 90 * 86400 * 1000);
  const since30 = new Date(Date.now() - 30 * 86400 * 1000);
  const now = new Date();

  const componentStatuses = [];

  for (const c of components) {
    // Rows overlapping the last 90 days is all we need for both the 30d
    // and 90d uptime figures and the day-by-day bar.
    const { data: rows, error } = await supabase
      .from("status_events")
      .select("status, started_at, ended_at")
      .eq("component_id", c.id)
      .or(`ended_at.is.null,ended_at.gt.${since90.toISOString()}`)
      .order("started_at", { ascending: true });

    if (error) {
      console.error(`[status] Supabase error for component ${c.id}:`, error.message);
    }

    const safeRows = rows || [];
    const current = safeRows[safeRows.length - 1];
    const status = current ? current.status : "operational";

    componentStatuses.push({
      id: c.id,
      name: c.name,
      description: c.description,
      status,
      statusLabel: STATUS_LABEL[status],
      uptime30d: uptimePercent(safeRows, since30, now),
      uptime90d: uptimePercent(safeRows, since90, now),
      history90d: dailyHistory(safeRows, 90),
    });
  }

  let overall = "operational";
  for (const c of componentStatuses) {
    if (STATUS_RANK[c.status] > STATUS_RANK[overall]) overall = c.status;
  }

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    overallStatus: overall,
    overallLabel: STATUS_LABEL[overall],
    generatedAt: new Date().toISOString(),
    components: componentStatuses,
  });
};
