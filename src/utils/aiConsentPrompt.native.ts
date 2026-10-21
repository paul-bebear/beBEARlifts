import { AiConsent_disclosure } from "../models/aiConsent";
import { ActionSheet_show } from "./actionSheet";

export function AiConsentPrompt_show(): Promise<boolean> {
  return new Promise((resolve) => {
    ActionSheet_show({ title: AiConsent_disclosure, options: ["Allow", "Not now"], cancelButtonIndex: 1 }, (index) =>
      resolve(index === 0)
    );
  });
}
