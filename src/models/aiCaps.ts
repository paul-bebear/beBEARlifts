export interface IAiCapsUsage {
  day: number;
  week: number;
}

export type IAiCapsRefusal =
  | { reason: "day" | "week"; plan: "free" | "plus"; used: IAiCapsUsage; caps: IAiCapsUsage; weekFreesIn?: number }
  | { reason: "onboard"; used: number; cap: number }
  | { reason: "report" | "global"; error: string };

// The Vercel defaults in api/_auth.mjs. The app shows them on the beBEAR+ line, because only the server reads the variables.
export const AiCaps_plus: IAiCapsUsage = { day: 30, week: 150 };

function count(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

function usage(raw: unknown, keys: [string, string]): IAiCapsUsage | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  const day = count(r[keys[0]]);
  const week = count(r[keys[1]]);
  return day == null || week == null ? undefined : { day, week };
}

export function AiCaps_parse(body: unknown): IAiCapsRefusal | undefined {
  const r = (body ?? {}) as Record<string, unknown>;
  if (r.reason === "day" || r.reason === "week") {
    const used = usage(r.used, ["day", "week"]);
    const caps = usage(r.caps, ["day", "week"]);
    const weekFreesIn = count(r.weekFreesIn);
    return used == null || caps == null
      ? undefined
      : {
          reason: r.reason,
          plan: r.plan === "plus" ? "plus" : "free",
          used,
          caps,
          ...(weekFreesIn == null ? {} : { weekFreesIn }),
        };
  }
  if (r.reason === "onboard") {
    const used = count((r.used as Record<string, unknown> | undefined)?.lifetime);
    const cap = count((r.caps as Record<string, unknown> | undefined)?.lifetime);
    return used == null || cap == null ? undefined : { reason: "onboard", used, cap };
  }
  if ((r.reason === "report" || r.reason === "global") && typeof r.error === "string") {
    return { reason: r.reason, error: r.error };
  }
  return undefined;
}

export function AiCaps_usageLine(used: IAiCapsUsage, caps: IAiCapsUsage): string {
  return `${used.day} of ${caps.day} today, ${used.week} of ${caps.week} this week`;
}

function weekWait(freesIn: number | undefined): string {
  return freesIn != null && freesIn > 1 ? `in ${freesIn} days` : "tomorrow";
}

export function AiCaps_message(refusal: IAiCapsRefusal): string {
  switch (refusal.reason) {
    case "day":
      return `Your ${refusal.caps.day} AI uses for today are used. More tomorrow.`;
    case "week":
      return `Your ${refusal.caps.week} AI uses for this week are used. More ${weekWait(refusal.weekFreesIn)}.`;
    case "onboard":
      return `You used all ${refusal.cap} AI setups. Pick a beBEAR plan instead.`;
    case "report":
    case "global":
      return refusal.error;
  }
}

export function AiCaps_refusalText(body: unknown): string | undefined {
  const refusal = AiCaps_parse(body);
  if (refusal == null) {
    return undefined;
  }
  const message = AiCaps_message(refusal);
  return refusal.reason === "day" || refusal.reason === "week"
    ? `${message} ${AiCaps_usageLine(refusal.used, refusal.caps)}.`
    : message;
}

export function AiCaps_plusLine(caps: IAiCapsUsage = AiCaps_plus): string {
  return `beBEAR+: ${caps.day} AI uses a day, ${caps.week} a week.`;
}
