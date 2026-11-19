export interface IAiConsent {
  version: 2;
  choice: "unknown" | "allowed" | "declined";
  decidedAt?: number;
}

export const AiConsent_disclosure =
  "AI features send your photo, body-scan printout or text to Google Gemini or Anthropic Claude to get an answer. Requests to Anthropic go through Vercel's AI Gateway. Anthropic may keep them for a limited time under its API terms, and longer if its safety checks flag them. If Google's free Gemini tier answers, Google may use them to improve its products. beBEAR adds no name or email.";

export function AiConsent_empty(): IAiConsent {
  return { version: 2, choice: "unknown" };
}

// Version 1 allowed AI under text that said photos were not kept, so that allowance is asked again.
function isCurrentChoice(version: unknown, choice: unknown): choice is "allowed" | "declined" {
  return version === 2 ? choice === "allowed" || choice === "declined" : version === 1 && choice === "declined";
}

export function AiConsent_parse(raw: unknown): IAiConsent {
  const r = (raw ?? {}) as { version?: unknown; choice?: unknown; decidedAt?: unknown };
  return isCurrentChoice(r.version, r.choice) &&
    typeof r.decidedAt === "number" &&
    Number.isFinite(r.decidedAt) &&
    r.decidedAt >= 0
    ? { version: 2, choice: r.choice, decidedAt: r.decidedAt }
    : AiConsent_empty();
}

export function AiConsent_decide(allowed: boolean, now: number): IAiConsent {
  return { version: 2, choice: allowed ? "allowed" : "declined", decidedAt: now };
}

export function AiConsent_maySend(consent: IAiConsent): boolean {
  return AiConsent_parse(consent).choice === "allowed";
}

export type IAiConsentAsk = "auto" | "tap" | "settings";

export function AiConsent_shouldAsk(consent: IAiConsent, ask: IAiConsentAsk): boolean {
  switch (ask) {
    case "settings":
      return true;
    case "tap":
      return consent.choice !== "allowed";
    case "auto":
      return consent.choice === "unknown";
  }
}

export function AiConsent_showFeatures(consent: IAiConsent): boolean {
  return consent.choice !== "declined";
}

export function AiConsent_isFoodAi(kind: string): boolean {
  return kind === "photo" || kind === "describe" || kind === "label";
}
