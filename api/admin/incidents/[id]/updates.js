const { supabase } = require("../../../../lib/supabase");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  if (req.headers["x-admin-token"] !== process.env.ADMIN_TOKEN || !process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const { id } = req.query;
  const { status, body } = req.body || {};
  if (!status || !body) return res.status(400).json({ error: "status and body are required" });

  const now = new Date().toISOString();

  const { error: updateInsertError } = await supabase
    .from("incident_updates")
    .insert({ incident_id: id, status, body, created_at: now });

  if (updateInsertError) {
    console.error("[admin/incidents/:id/updates] insert error:", updateInsertError.message);
    return res.status(502).json({ error: "failed to save update" });
  }

  const { error: incidentUpdateError } = await supabase
    .from("incidents")
    .update({ status, updated_at: now })
    .eq("id", id);

  if (incidentUpdateError) {
    console.error("[admin/incidents/:id/updates] incident status update error:", incidentUpdateError.message);
  }

  res.status(200).json({ ok: true });
};
