import { AiConsent_disclosure } from "../models/aiConsent";
import { Dialog_choice } from "./dialog";

export async function AiConsentPrompt_show(): Promise<boolean> {
  return (await Dialog_choice("AI features", AiConsent_disclosure, ["Allow", "Not now"])) === 0;
}
