import { SupabaseClient_accessToken, Supabase_notSignedIn } from "./supabaseClient";
import { ApiUrl_for } from "./apiUrl";
import { AiConsent_disabledMessage, AiConsent_ensure, AiConsentStore } from "./aiConsentClient";
import { AiConsent_maySend } from "../models/aiConsent";

export const AiRequest_signInMessage = "Sign in to use AI features. Open Settings → Cloud backup.";
export const AiRequest_offlineMessage = "No connection. AI features need a signal.";

export type IAiRequestResult = { ok: true; body: unknown } | { ok: false; error: string };

// The /api/ai and /api/food/photo functions bill the owner's AI Gateway credit, so they serve signed-in users only.
export async function AiRequest_post(path: string, payload: unknown): Promise<IAiRequestResult> {
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
  try {
    response = await fetch(ApiUrl_for(path), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.value}` },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, error: AiRequest_offlineMessage };
  }
  const body: unknown = await response.json().catch(() => undefined);
  if (response.status === 401) {
    return { ok: false, error: AiRequest_signInMessage };
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
