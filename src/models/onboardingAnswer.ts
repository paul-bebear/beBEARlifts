export interface IOnboardingAnswer {
  builtin?: string;
  liftoscript?: string;
  historyCsv?: string;
  renamed: [string, string][];
  note: string;
}

export function OnboardingAnswer_parse(raw: unknown, builtinIds: string[]): IOnboardingAnswer {
  if (typeof raw === "string") {
    if (raw.length > 600_000) {
      throw new Error("The AI answer is too large.");
    }
    raw = JSON.parse(raw);
  }
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("The AI did not send a program.");
  }
  const r = raw as Record<string, unknown>;
  const builtin = typeof r.builtin === "string" && builtinIds.includes(r.builtin) ? r.builtin : undefined;
  const liftoscript =
    typeof r.liftoscript === "string" && r.liftoscript.trim() !== "" && r.liftoscript.length <= 100_000
      ? r.liftoscript
      : undefined;
  if (
    (builtin == null) === (liftoscript == null) ||
    (r.builtin != null && builtin == null) ||
    (r.builtin != null && r.liftoscript != null)
  ) {
    throw new Error("The AI must send one known built-in program or one Liftoscript program.");
  }
  if (r.historyCsv != null && (typeof r.historyCsv !== "string" || r.historyCsv.length > 400_000)) {
    throw new Error("The AI sent unreadable history.");
  }
  if (
    r.renamed != null &&
    (!Array.isArray(r.renamed) ||
      r.renamed.length > 100 ||
      r.renamed.some(
        (pair) => !Array.isArray(pair) || pair.length !== 2 || pair.some((v) => typeof v !== "string" || v.length > 200)
      ))
  ) {
    throw new Error("The AI sent unreadable exercise names.");
  }
  if (r.note != null && (typeof r.note !== "string" || r.note.length > 4000)) {
    throw new Error("The AI sent an unreadable note.");
  }
  return {
    builtin,
    liftoscript,
    historyCsv: r.historyCsv as string | undefined,
    renamed: (r.renamed ?? []) as [string, string][],
    note: (r.note ?? "") as string,
  };
}
