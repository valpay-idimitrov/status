const { createClient } = require("@supabase/supabase-js");

// SUPABASE_SERVICE_ROLE_KEY bypasses Row Level Security — that's correct
// here, since these functions only ever run server-side inside Vercel
// (never in the browser). Never prefix this key with NEXT_PUBLIC_ and
// never send it to the client. RLS should stay ON in Supabase so nothing
// can read/write these tables directly except via these API routes.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = { supabase };
