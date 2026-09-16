const STATUS_LABEL = {
  operational: "Operational",
  degraded_performance: "Degraded Performance",
  partial_outage: "Partial Outage",
  major_outage: "Major Outage",
};

function fmtTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function loadStatus() {
  const res = await fetch("/api/status");
  const data = await res.json();

  const banner = document.getElementById("banner");
  banner.dataset.state = data.overallStatus;
  document.getElementById("banner-title").textContent =
    data.overallStatus === "operational"
      ? "All systems operational"
      : `${data.overallLabel}: some services are affected`;
  document.getElementById("banner-time").textContent = `Updated ${fmtTime(data.generatedAt)}`;

  const list = document.getElementById("components");
  list.innerHTML = "";

  for (const c of data.components) {
    const el = document.createElement("div");
    el.className = "component";
    el.innerHTML = `
      <div class="component-row">
        <div>
          <div class="component-name">${c.name}</div>
          <div class="component-desc">${c.description}</div>
        </div>
        <div class="component-status" data-status="${c.status}">${STATUS_LABEL[c.status]}</div>
      </div>
      <div class="history-bar">
        ${c.history90d
          .map((d) => `<div class="history-cell" data-status="${d.status}" title="${d.date}: ${d.status.replace('_',' ')}"></div>`)
          .join("")}
      </div>
      <div class="history-meta">
        <span>90 days ago</span>
        <span>${c.uptime90d}% uptime</span>
        <span>Today</span>
      </div>
    `;
    list.appendChild(el);
  }
}

async function loadIncidents() {
  const res = await fetch("/api/incidents");
  const data = await res.json();
  const el = document.getElementById("incidents-list");

  if (data.incidents.length === 0) {
    el.innerHTML = '<p class="empty-state">No incidents reported in the recent history window.</p>';
    return;
  }

  el.innerHTML = data.incidents
    .map(
      (incident) => `
      <div class="incident">
        <p class="incident-title">${incident.title}</p>
        ${incident.updates
          .slice()
          .reverse()
          .map(
            (u) => `
            <div class="incident-update">
              <div class="incident-update-meta">${u.status.charAt(0).toUpperCase() + u.status.slice(1)} — ${fmtTime(u.created_at)}</div>
              <div>${u.body}</div>
            </div>`
          )
          .join("")}
      </div>`
    )
    .join("");
}

loadStatus();
loadIncidents();
// Refresh every 60s so a merchant leaving the tab open sees live status.
setInterval(loadStatus, 60000);
setInterval(loadIncidents, 60000);
