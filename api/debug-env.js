// TEMPORARY DIAGNOSTIC — delete this file once the env var issue is resolved.
// Reports presence/length only, never the actual secret values.
module.exports = async (req, res) => {
  if (req.headers["x-admin-token"] !== process.env.ADMIN_TOKEN || !process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }

  function describe(name) {
    const val = process.env[name];
    if (val === undefined) return { set: false, note: "not set at all" };
    if (val === "") return { set: true, length: 0, note: "set but EMPTY STRING" };
    return {
      set: true,
      length: val.length,
      startsWith: val.slice(0, 4),
      endsWith: val.slice(-4),
      hasLeadingOrTrailingWhitespace: val !== val.trim(),
    };
  }

  res.status(200).json({
    DD_API_KEY: describe("DD_API_KEY"),
    DD_APP_KEY: describe("DD_APP_KEY"),
    DD_SITE: describe("DD_SITE"),
    SUPABASE_URL: describe("SUPABASE_URL"),
    SUPABASE_SERVICE_ROLE_KEY: describe("SUPABASE_SERVICE_ROLE_KEY"),
    ADMIN_TOKEN: describe("ADMIN_TOKEN"),
  });
};
