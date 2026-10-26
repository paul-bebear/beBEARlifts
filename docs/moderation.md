# Report emails

When a signed-in user reports a feed post, the app inserts a row into `public.post_reports`. A Supabase Database Webhook sends that row to `/api/moderation/report`. The route emails the owner through Resend.

Without the webhook, nobody is told about a report. The row only sits in the table.

## Owner setup

- In Resend, add a sending domain and create an API key. Use `paulbebear.com` if it is already verified.
- In Vercel, set `RESEND_API_KEY` (the `re_` key) and `REPORT_EMAIL_FROM` (for example `beBEAR <reports@paulbebear.com>`, an address on the verified domain).
- In Vercel, set `REPORT_EMAIL_TO` (the support address that gets the mail) and `REPORT_WEBHOOK_AUTH` (the full header value, for example `Bearer ` plus a long random string). `SUPABASE_SERVICE_ROLE_KEY` is already there.
- In the Supabase dashboard, open Database → Webhooks → Create a new hook.
- Set the table to `post_reports` and the event to Insert.
- Set the type to HTTP Request, the method to POST, and the URL to `https://lifts.paulbebear.com/api/moderation/report`.
- Add the HTTP header `Authorization` with the same value as `REPORT_WEBHOOK_AUTH`, for example `Bearer <REPORT_WEBHOOK_AUTH>`.
- Redeploy the web app after you set the Vercel variables.

## What the route does

- It answers 405 to any method except POST.
- It answers 401 when the `Authorization` header differs from `REPORT_WEBHOOK_AUTH`. A missing `REPORT_WEBHOOK_AUTH` also answers 401.
- It answers 400 when the body is not a `post_reports` webhook payload.
- It answers 200 and sends nothing for an UPDATE or DELETE event.
- It answers 503 when a variable is missing or Resend does not accept the mail. Supabase retries a failed hook.
- For an INSERT it reads the post with `SUPABASE_SERVICE_ROLE_KEY` and sends one email. The email lists the report id, reporter, reported post, reason, note and time, plus one line about the post.
- A meal post shows its description and says if it has a photo. A workout post shows its day name and program. If the post cannot be read, the email says so and still goes out.

## Not covered

- The email has no link to remove the post. Delete it in the Supabase table editor.
- A hook retry after a timeout can send the same email twice.
