// Run with: node lib/uptime.test.js
const assert = require("assert");
const { uptimePercent, dailyHistory } = require("./uptime");

function hoursAgo(h) {
  return new Date(Date.now() - h * 3600 * 1000).toISOString();
}

// --- uptimePercent ---

// No events at all in the window: treated as 100% (nothing recorded as down).
assert.strictEqual(uptimePercent([], new Date(Date.now() - 86400000), new Date()), 100);

// Fully operational for the whole 24h window.
{
  const rows = [{ status: "operational", started_at: hoursAgo(24), ended_at: null }];
  const pct = uptimePercent(rows, new Date(Date.now() - 24 * 3600 * 1000), new Date());
  assert.strictEqual(pct, 100);
}

// Down for exactly half the window.
{
  const rows = [
    { status: "operational", started_at: hoursAgo(24), ended_at: hoursAgo(12) },
    { status: "major_outage", started_at: hoursAgo(12), ended_at: null },
  ];
  const pct = uptimePercent(rows, new Date(Date.now() - 24 * 3600 * 1000), new Date());
  assert.strictEqual(pct, 50);
}

// --- dailyHistory ---

{
  const rows = [{ status: "major_outage", started_at: hoursAgo(3), ended_at: hoursAgo(1) }];
  const days = dailyHistory(rows, 3);
  assert.strictEqual(days.length, 3);
  assert.strictEqual(days[2].status, "major_outage"); // today should show the outage
  assert.strictEqual(days[0].status, "no_data"); // 2 days ago had no events at all
}

// --- unmonitored ranks below operational, never elevates overall status ---
assert.ok(require("./uptime").STATUS_RANK.unmonitored < require("./uptime").STATUS_RANK.operational);

console.log("All uptime.js tests passed.");
