// Pure functions over a list of status_events rows — no DB access here on
// purpose, so this logic can be unit tested with plain arrays (see
// lib/uptime.test.js) independent of Supabase being reachable.

// "unmonitored" ranks below "operational" on purpose — a component with no
// monitors tagged should never be the thing that drags the overall banner
// down, since there's nothing actually observed to alert on.
const STATUS_RANK = { unmonitored: -1, operational: 0, degraded_performance: 1, partial_outage: 2, major_outage: 3 };

// rows: [{ status, started_at, ended_at }], started_at/ended_at as ISO strings or null
function uptimePercent(rows, windowStart, windowEnd) {
  const startMs = windowStart.getTime();
  const endMs = windowEnd.getTime();
  const totalMs = endMs - startMs;
  if (totalMs <= 0 || rows.length === 0) return 100;

  let operationalMs = 0;
  for (const row of rows) {
    const start = Math.max(new Date(row.started_at).getTime(), startMs);
    const end = row.ended_at ? new Date(row.ended_at).getTime() : endMs;
    const duration = Math.max(0, end - start);
    if (row.status === "operational") operationalMs += duration;
  }
  return Math.round((operationalMs / totalMs) * 10000) / 100; // 2 decimal places
}

// Buckets rows into one worst-status-of-the-day entry per day, for the
// day-by-day uptime bar on the page.
function dailyHistory(rows, days) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    dayStart.setUTCDate(dayStart.getUTCDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const dayRows = rows.filter((r) => {
      const start = new Date(r.started_at).getTime();
      const end = r.ended_at ? new Date(r.ended_at).getTime() : Date.now();
      return start < dayEnd.getTime() && end > dayStart.getTime();
    });

    let worst = dayRows.length === 0 ? "no_data" : "operational";
    for (const r of dayRows) {
      if (worst === "no_data" || STATUS_RANK[r.status] > STATUS_RANK[worst]) worst = r.status;
    }
    out.push({ date: dayStart.toISOString().slice(0, 10), status: worst });
  }
  return out;
}

module.exports = { uptimePercent, dailyHistory, STATUS_RANK };
