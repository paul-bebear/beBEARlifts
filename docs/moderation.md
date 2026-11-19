# Report emails

When a signed-in user reports a feed post, the app inserts a row into `public.post_reports`. The trigger `post_reports_notify` from migration `20261118120000_post_reports_hook.sql` sends that row to `/api/moderation/report` with `pg_net`. The route emails the owner through Resend.

Without the Vault secret `report_webhook_auth`, the trigger logs a warning and sends nothing. The row only sits in the table.

## Owner setup

- In Resend, add a sending domain and create an API key. Use `paulbebear.com` if it is already verified.
- In Vercel, set `RESEND_API_KEY` (the `re_` key) and `REPORT_EMAIL_FROM` (for example `beBEAR <reports@paulbebear.com>`, an address on the verified domain).
- In Vercel, set `REPORT_EMAIL_TO` (the support address that gets the mail) and `REPORT_WEBHOOK_AUTH` (the full header value, for example `Bearer ` plus a long random string). `SUPABASE_SERVICE_ROLE_KEY` is already there.
- Apply migration `20261118120000_post_reports_hook.sql`. It turns on `pg_net` and adds the trigger.
- In the Supabase dashboard, open Integrations → Vault → Add new secret. Name it `report_webhook_auth`. Set the value to the same full header as `REPORT_WEBHOOK_AUTH`, for example `Bearer ` plus the random string.
- Do not also create a hook under Database → Webhooks. Two hooks send two emails for each report.
- Redeploy the web app after you set the Vercel variables.

## What the route does

- It answers 405 to any method except POST.
- It answers 401 when the `Authorization` header differs from `REPORT_WEBHOOK_AUTH`. A missing `REPORT_WEBHOOK_AUTH` also answers 401.
- It answers 400 when the body is not a `post_reports` webhook payload.
- It answers 200 and sends nothing for an UPDATE or DELETE event.
- It answers 503 when a variable is missing or Resend does not accept the mail. Nothing retries it. `pg_net` sends each request once, so that mail is lost. The report row stays in `post_reports`.
- For an INSERT it reads the post with `SUPABASE_SERVICE_ROLE_KEY` and sends one email. The email lists the report id, reporter, reported post, reason, note and time, plus one line about the post.
- A meal post shows its description and says if it has a photo. A workout post shows its day name and program. If the post cannot be read, the email says so and still goes out.

## Not covered

- The email has no link to remove the post. Delete it in the Supabase table editor.
- A failed send is not retried. To find one, run `select status_code, content from net._http_response order by created desc limit 20;` in the SQL editor. `pg_net` keeps these answers for 6 hours.
- To find reports that may have no mail, read `post_reports` in the table editor, newest first.
