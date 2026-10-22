import { SupabaseClient_accessToken, Supabase_notSignedIn } from "./supabaseClient";
import { ApiUrl_for } from "./apiUrl";
import { AiConsent_disabledMessage, AiConsent_ensure, AiConsentStore } from "./aiConsentClient";
import { AiConsent_maySend } from "../models/aiConsent";
import { AiCaps_refusalText } from "../models/aiCaps";

export const AiRequest_signInMessage = "Sign in to use AI features. Open Progress → the gear icon → Cloud backup.";
export const AiRequest_offlineMessage = "No connection. AI features need a signal.";
export const AiRequest_timeoutMessage = "The AI took too long to answer.";

// The slowest route, api/food/photo.mjs, gives the model 45 s.
const defaultTimeoutMs = 60_000;

export type IAiRequestResult = { ok: true; body: unknown } | { ok: false; error: string };

// The /api/ai and /api/food/photo functions bill the owner's AI Gateway credit, so they serve signed-in users only.
export async function AiRequest_post(
  path: string,
  payload: unknown,
  timeoutMs: number = defaultTimeoutMs
): Promise<IAiRequestResult> {
  if (!(await AiConsent_ensure())) {
    return { ok: false, error: AiConsent_disabledMessage };
  }
  const auth = await SupabaseClient_accessToken();
  if (!auth.ok) {
    return { ok: false, error: auth.error === Supabase_notSignedIn ? AiRequest_signInMessage : auth.error };
  }
  let response: Response;
  if (!AiConsent_maySend(await AiConsentStore.load())) {
    return { ok: false, error: AiConsent_disabledMessage };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let body: unknown;
  try {
    response = await fetch(ApiUrl_for(path), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.value}` },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    body = await response.json().catch(() => undefined);
  } catch {
    return { ok: false, error: controller.signal.aborted ? AiRequest_timeoutMessage : AiRequest_offlineMessage };
  } finally {
    clearTimeout(timer);
  }
  if (response.status === 504) {
    return { ok: false, error: AiRequest_timeoutMessage };
  }
  if (response.status === 401) {
    return { ok: false, error: AiRequest_signInMessage };
  }
  const capped = response.status === 429 ? AiCaps_refusalText(body) : undefined;
  if (capped != null) {
    return { ok: false, error: capped };
  }
  if (!response.ok) {
    const error = (body as { error?: unknown } | undefined)?.error;
    return { ok: false, error: typeof error === "string" ? error : `The server returned ${response.status}.` };
  }
  return { ok: true, body };
}

export function AiRequest_text(body: unknown): string | undefined {
  const text = (body as { text?: unknown } | undefined)?.text;
  return typeof text === "string" ? text : undefined;
}
