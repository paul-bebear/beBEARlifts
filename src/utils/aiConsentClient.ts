import { AiConsent_decide, AiConsent_empty, AiConsent_maySend, AiConsent_parse } from "../models/aiConsent";
import { JsonStore_create } from "./jsonStore";
import { AiConsentPrompt_show } from "./aiConsentPrompt";

export const AiConsentStore = JsonStore_create("bebear_ai_consent", AiConsent_parse, AiConsent_empty);
export const AiConsent_disabledMessage = "AI is off. You can enable AI features in Settings.";
let pending: Promise<boolean> | undefined;

export function AiConsent_ensure(changeChoice = false): Promise<boolean> {
  if (pending != null) {
    return pending;
  }
  pending = (async () => {
    const stored = await AiConsentStore.load();
    if (!changeChoice && stored.choice !== "unknown") {
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
  return pending;
}
