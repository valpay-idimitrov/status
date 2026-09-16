const { supabase } = require("../../lib/supabase");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  if (req.headers["x-admin-token"] !== process.env.ADMIN_TOKEN || !process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const { title, affectedComponents, status, body } = req.body || {};
  if (!title || !Array.isArray(affectedComponents) || !status || !body) {
    return res.status(400).json({ error: "title, affectedComponents[], status, body are required" });
  }

  const now = new Date().toISOString();

  const { data: incident, error: incidentError } = await supabase
    .from("incidents")
    .insert({ title, affected_components: affectedComponents, status, created_at: now, updated_at: now })
    .select("id")
    .single();

  if (incidentError) {
    console.error("[admin/incidents] insert error:", incidentError.message);
    return res.status(502).json({ error: "failed to create incident" });
  }

  const { error: updateError } = await supabase
    .from("incident_updates")
    .insert({ incident_id: incident.id, status, body, created_at: now });

  if (updateError) {
    console.error("[admin/incidents] update insert error:", updateError.message);
    return res.status(502).json({ error: "incident created but first update failed to save" });
  }

  res.status(201).json({ id: incident.id });
};
