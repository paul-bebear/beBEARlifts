import {
  AiConsent_decide,
  AiConsent_empty,
  AiConsent_maySend,
  AiConsent_parse,
  AiConsent_shouldAsk,
  IAiConsentAsk,
} from "../models/aiConsent";
import { JsonStore_create } from "./jsonStore";
import { AiConsentPrompt_show } from "./aiConsentPrompt";

export const AiConsentStore = JsonStore_create("bebear_ai_consent", AiConsent_parse, AiConsent_empty);
export const AiConsent_disabledMessage = "AI is off. You can enable AI features in Settings.";
let pending: { ask: IAiConsentAsk; result: Promise<boolean> } | undefined;

export function AiConsent_ensure(ask: IAiConsentAsk = "auto"): Promise<boolean> {
  if (pending != null) {
    if (pending.ask === ask) {
      return pending.result;
    }
    // A background answer never shows the prompt, so a tap waits for it and then runs its own check.
    return pending.result.then(
      () => AiConsent_ensure(ask),
      () => AiConsent_ensure(ask)
    );
  }
  const result = (async () => {
    const stored = await AiConsentStore.load();
    if (!AiConsent_shouldAsk(stored, ask)) {
      return AiConsent_maySend(stored);
    }
    const allowed = await AiConsentPrompt_show();
    try {
      await AiConsentStore.update(() => AiConsent_decide(allowed, Date.now()));
      return allowed;
    } catch {
      await AiConsentStore.update(() => AiConsent_decide(false, Date.now())).catch(() => undefined);
      return false;
    }
  })().finally(() => {
    pending = undefined;
  });
  pending = { ask, result };
  return result;
}
