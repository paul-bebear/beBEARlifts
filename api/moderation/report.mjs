import { fetchJson, json } from "../_food.mjs";
import { Supabase_origin } from "../_auth.mjs";
import { Billing_webhookAuthorized } from "../_billing.mjs";
import {
  ReportEmail_build,
  ReportEmail_classify,
  ReportEmail_postFromRows,
  ReportEmail_postLookup,
} from "../_reportEmail.mjs";

const timeoutMs = 8000;
const resendUrl = "https://api.resend.com/emails";

async function readPost(report, serviceKey) {
  if (!serviceKey) {
    return null;
  }
  try {
    const { table, id, select } = ReportEmail_postLookup(report);
    const url = `${Supabase_origin}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&select=${select}`;
    const result = await fetchJson(
      url,
      { method: "GET", headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
      timeoutMs
    );
    return result.status === 200 ? ReportEmail_postFromRows(report, result.body) : null;
  } catch {
    return null;
  }
}

export async function POST(request) {
  if (!Billing_webhookAuthorized(request.headers.get("authorization"), process.env.REPORT_WEBHOOK_AUTH)) {
    return json({ error: "Unauthorized" }, 401);
  }
  const body = await request.json().catch(() => undefined);
  const parsed = ReportEmail_classify(body);
  if (parsed.kind === "invalid") {
    return json({ error: "The body is not a post_reports webhook payload." }, 400);
  }
  if (parsed.kind === "ignore") {
    return json({ ignored: true });
  }
  const { RESEND_API_KEY, REPORT_EMAIL_FROM, REPORT_EMAIL_TO } = process.env;
  if (!RESEND_API_KEY || !REPORT_EMAIL_FROM || !REPORT_EMAIL_TO) {
    return json(
      {
        error:
          "The server has no report email settings. Set RESEND_API_KEY, REPORT_EMAIL_FROM and REPORT_EMAIL_TO in Vercel.",
      },
      503
    );
  }
  const post = await readPost(parsed.report, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { subject, text } = ReportEmail_build(parsed.report, post);
  try {
    const sent = await fetchJson(
      resendUrl,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: REPORT_EMAIL_FROM, to: [REPORT_EMAIL_TO], subject, text }),
      },
      timeoutMs
    );
    if (sent.status < 200 || sent.status >= 300) {
      return json({ error: `Resend returned ${sent.status}` }, 503);
    }
  } catch {
    return json({ error: "Resend did not answer." }, 503);
  }
  return json({ sent: true });
}

const notAllowed = () => json({ error: "Method not allowed" }, 405);
export const GET = notAllowed;
export const PUT = notAllowed;
export const PATCH = notAllowed;
export const DELETE = notAllowed;
