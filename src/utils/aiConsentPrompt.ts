import { AiConsent_disclosure } from "../models/aiConsent";
import { Dialog_choice } from "./dialog";

type IListener = (open: boolean) => void;

const listeners = new Set<IListener>();
let answer: ((allowed: boolean) => void) | undefined;

function notify(open: boolean): void {
  listeners.forEach((listener) => listener(open));
}

export function AiConsentPrompt_subscribe(listener: IListener): () => void {
  listeners.add(listener);
  listener(answer != null);
  return () => {
    listeners.delete(listener);
  };
}

export function AiConsentPrompt_answer(allowed: boolean): void {
  const resolve = answer;
  answer = undefined;
  notify(false);
  resolve?.(allowed);
}

// AiConsentSheet in forkOverlays.tsx shows the question. Without a mounted sheet the browser confirm asks instead.
export async function AiConsentPrompt_show(): Promise<boolean> {
  if (listeners.size === 0) {
    return (await Dialog_choice("AI features", AiConsent_disclosure, ["Allow", "Not now"])) === 0;
  }
  answer?.(false);
  return new Promise<boolean>((resolve) => {
    answer = resolve;
    notify(true);
  });
}
