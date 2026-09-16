# ValPay Status Page (Vercel + Supabase)

Same idea as before — Datadog is the source of truth, this reshapes it into
a public status page — rebuilt for a serverless deploy:

```
Datadog (your monitors)
    │  polled every 5 min by Vercel Cron → /api/cron/poll
    ▼
Supabase Postgres (status_events, incidents, incident_updates)
    │  read by
    ▼
/api/status, /api/incidents  (public, no auth)
    │
    ▼
public/index.html  (the page merchants see)
```

## 1. Supabase setup

1. Create a project (or use an existing one).
2. Open the SQL editor and run `supabase/schema.sql`.
3. Project Settings → API: copy the **Project URL** and the **service_role**
   key (not the `anon` key — the service role key is required so these API
   routes can bypass Row Level Security; it must never be exposed to the
   browser).

## 2. Datadog setup

Same as before: tag every relevant monitor with the tag listed in
`lib/components.js` (e.g. `service:payments-api`). Edit that file if you
want different components, names, or tags.

## 3. Vercel setup

```
vercel link      # connect this project to a Vercel project
```

Set environment variables (Project Settings → Environment Variables, or
`vercel env add`):

- `DD_API_KEY`, `DD_APP_KEY`, `DD_SITE`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_TOKEN`

Deploy:

```
vercel --prod
```

### Triggering the poll — no Vercel Pro needed

Vercel Hobby's cron only fires once a day, too coarse to be the real
trigger here. Instead, **Supabase's `pg_cron` + `pg_net` extensions**
(included on Supabase's free tier) call the poll endpoint directly from
Postgres on whatever schedule you want:

1. Deploy to Vercel first, note your deployment domain.
2. Open `supabase/pg_cron_setup.sql`, fill in your domain and `ADMIN_TOKEN`.
3. Run it once in the Supabase SQL editor.
4. Confirm it's firing: `select * from cron.job_run_details order by start_time desc limit 20;`

`vercel.json`'s cron entry (`0 6 * * *`, once daily) is just a free backstop
— if `pg_cron` ever silently stops, you're never more than a day without a
poll, rather than forever. It isn't your main trigger.

## 4. Verify

- `npm test` — runs the pure uptime-calculation unit tests (no network
  needed, safe to run anytime)
- After first deploy, check Vercel's function logs for `/api/cron/poll` —
  confirm no `"No monitors found for tag"` warnings
- Visit your deployment URL — confirm components show real statuses

## 5. Posting incidents

Same two endpoints as before, same shape:

```bash
curl -X POST https://your-domain.vercel.app/api/admin/incidents \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{
    "title": "Elevated latency on Payments API",
    "affectedComponents": ["payments-api"],
    "status": "investigating",
    "body": "We are investigating elevated latency on card authorizations."
  }'
```

```bash
curl -X POST https://your-domain.vercel.app/api/admin/incidents/1/updates \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{"status": "resolved", "body": "Latency has returned to normal."}'
```

## What changed from the self-hosted version, and why

- **SQLite → Supabase Postgres**: Vercel functions are stateless and don't
  keep a local disk between invocations, so SQLite (a single file on disk)
  doesn't work here. Supabase gives the same "one row per status change"
  history model, just over the network.
- **`node-cron` → Supabase `pg_cron`**: there's no always-on process on
  Vercel to run a `setInterval` loop in, and Vercel's own Hobby-tier cron
  only fires daily. Supabase's `pg_cron`/`pg_net` (free tier) call
  `/api/cron/poll` on a real schedule instead — same polling logic inside
  the endpoint, just triggered from Postgres rather than self-scheduled.
- **Express → per-file serverless functions**: each file under `/api`
  is its own function; Vercel routes requests to them by file path
  automatically (`/api/status.js` → `GET /api/status`, etc.) — no router
  needed.
- The frontend (`public/`) and the incident/uptime data model are
  unchanged.

## Still not included

Same gaps as the self-hosted version: no subscriber notifications
(email/SMS/Slack), no admin UI beyond the raw API, no multi-region
aggregation. Worth layering on top if you need them.
