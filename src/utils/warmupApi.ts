import { IWarmupExercise, IWarmupItem, WarmupPlan_parseAi } from "../models/warmupPlan";

export type IWarmupApiResult = { ok: true; items: IWarmupItem[] } | { ok: false; error: string };

export async function WarmupApi_generate(exercises: IWarmupExercise[]): Promise<IWarmupApiResult> {
  let response: Response;
  try {
    response = await fetch("/api/ai/warmup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exercises }),
    });
  } catch {
    return { ok: false, error: "No connection" };
  }
  const body = (await response.json().catch(() => undefined)) as { text?: unknown; error?: unknown } | undefined;
  if (!response.ok) {
    return {
      ok: false,
      error: typeof body?.error === "string" ? body.error : `The server returned ${response.status}`,
    };
  }
  const items = typeof body?.text === "string" ? WarmupPlan_parseAi(body.text) : undefined;
  return items != null ? { ok: true, items } : { ok: false, error: "The AI answer could not be read" };
}
