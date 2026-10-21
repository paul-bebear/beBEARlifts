export interface IAiConsent {
  version: 1;
  choice: "unknown" | "allowed" | "declined";
  decidedAt?: number;
}

export const AiConsent_disclosure =
  "AI features send your photo or text to Google Gemini or Anthropic Claude to get an answer. They are not used to identify you.";

export function AiConsent_empty(): IAiConsent {
  return { version: 1, choice: "unknown" };
}

export function AiConsent_parse(raw: unknown): IAiConsent {
  const r = (raw ?? {}) as Partial<IAiConsent>;
  return r.version === 1 &&
    (r.choice === "allowed" || r.choice === "declined") &&
    typeof r.decidedAt === "number" &&
    Number.isFinite(r.decidedAt) &&
    r.decidedAt >= 0
    ? { version: 1, choice: r.choice, decidedAt: r.decidedAt }
    : AiConsent_empty();
}

export function AiConsent_decide(allowed: boolean, now: number): IAiConsent {
  return { version: 1, choice: allowed ? "allowed" : "declined", decidedAt: now };
}

export function AiConsent_maySend(consent: IAiConsent): boolean {
  return AiConsent_parse(consent).choice === "allowed";
}

export function AiConsent_showFeatures(consent: IAiConsent): boolean {
  return consent.choice !== "declined";
}

export function AiConsent_isFoodAi(kind: string): boolean {
  return kind === "photo" || kind === "describe" || kind === "label";
}
