import { IWarmupExercise, IWarmupItem, WarmupPlan_parseAi } from "../models/warmupPlan";
import { AiRequest_post, AiRequest_text } from "./aiRequest";

export type IWarmupApiResult = { ok: true; items: IWarmupItem[] } | { ok: false; error: string };

export async function WarmupApi_generate(exercises: IWarmupExercise[]): Promise<IWarmupApiResult> {
  const result = await AiRequest_post("/api/ai/warmup", { exercises });
  if (!result.ok) {
    return result;
  }
  const text = AiRequest_text(result.body);
  const items = text != null ? WarmupPlan_parseAi(text) : undefined;
  return items != null ? { ok: true, items } : { ok: false, error: "The AI answer could not be read." };
}
