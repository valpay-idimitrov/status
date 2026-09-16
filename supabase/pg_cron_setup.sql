-- Run this in the Supabase SQL editor, ONCE, after deploying to Vercel.
-- This replaces Vercel Cron as the thing that triggers polling — pg_cron
-- and pg_net are both included on Supabase's free tier, so this needs no
-- paid plan anywhere.
--
-- Fill in the two placeholders below before running:
--   <YOUR_VERCEL_DOMAIN>  e.g. valpay-status.vercel.app
--   <YOUR_ADMIN_TOKEN>    the same value you set as ADMIN_TOKEN in Vercel

-- 1. Enable the two extensions (or do this via Database > Extensions in
--    the Supabase dashboard UI if this errors on permissions):
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Schedule the poll. Adjust '*/5 * * * *' to taste — pg_cron supports
--    standard cron syntax down to per-minute, no plan restriction.
select cron.schedule(
  'poll-datadog-status',
  '*/5 * * * *',
  $$
  select net.http_get(
    url := 'https://<YOUR_VERCEL_DOMAIN>/api/cron/poll',
    headers := jsonb_build_object('x-admin-token', '<YOUR_ADMIN_TOKEN>')
  );
  $$
);

-- To check it's running:
--   select * from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 20;

-- To stop it:
--   select cron.unschedule('poll-datadog-status');
