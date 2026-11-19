import { SupabaseClient_accessToken, Supabase_notSignedIn } from "./supabaseClient";
import { ApiRequest_errorText, ApiRequest_send } from "./apiRequest";
import { AiConsent_disabledMessage, AiConsent_ensure, AiConsentStore } from "./aiConsentClient";
import { AiConsent_maySend } from "../models/aiConsent";
import { AiCaps_parse, AiCaps_refusalText } from "../models/aiCaps";
import { PlusOfferClient_onRefusal } from "./plusOfferClient";

export const AiRequest_signInMessage =
  "Sign in to use AI features. On the bear's home, tap the gear at the top right, then sign in on the Cloud backup card.";
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
  if (!AiConsent_maySend(await AiConsentStore.load())) {
    return { ok: false, error: AiConsent_disabledMessage };
  }
  const sent = await ApiRequest_send(path, { method: "POST", token: auth.value, json: payload }, timeoutMs);
  if (sent.kind !== "reply") {
    return { ok: false, error: sent.kind === "timeout" ? AiRequest_timeoutMessage : AiRequest_offlineMessage };
  }
  const { status, body } = sent;
  if (status === 504) {
    return { ok: false, error: AiRequest_timeoutMessage };
  }
  if (status === 401) {
    return { ok: false, error: AiRequest_signInMessage };
  }
  const refusal = status === 429 ? AiCaps_parse(body) : undefined;
  if (refusal != null) {
    PlusOfferClient_onRefusal(refusal);
  }
  const capped = status === 429 ? AiCaps_refusalText(body) : undefined;
  if (capped != null) {
    return { ok: false, error: capped };
  }
  if (!sent.ok) {
    return { ok: false, error: ApiRequest_errorText(status, body) };
  }
  return { ok: true, body };
}

export function AiRequest_text(body: unknown): string | undefined {
  const text = (body as { text?: unknown } | undefined)?.text;
  return typeof text === "string" ? text : undefined;
}
