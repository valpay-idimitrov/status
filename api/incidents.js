const { supabase } = require("../lib/supabase");

module.exports = async (req, res) => {
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });

  const { data: incidents, error } = await supabase
    .from("incidents")
    .select("id, title, affected_components, status, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[incidents] Supabase error:", error.message);
    return res.status(502).json({ error: "failed to load incidents" });
  }

  const withUpdates = await Promise.all(
    incidents.map(async (incident) => {
      const { data: updates } = await supabase
        .from("incident_updates")
        .select("status, body, created_at")
        .eq("incident_id", incident.id)
        .order("created_at", { ascending: true });
      return {
        ...incident,
        affectedComponents: incident.affected_components,
        updates: updates || [],
      };
    })
  );

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ incidents: withUpdates });
};
