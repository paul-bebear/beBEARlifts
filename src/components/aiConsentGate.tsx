import { JSX, ReactNode, useEffect } from "react";
import { AiConsent_maySend } from "../models/aiConsent";
import { AiConsent_ensure, AiConsentStore, AiConsent_disabledMessage } from "../utils/aiConsentClient";
import { Text } from "./primitives/text";

export function AiConsentGate(props: { children: ReactNode }): JSX.Element {
  const consent = AiConsentStore.use();
  useEffect(() => {
    AiConsent_ensure().catch(() => undefined);
  }, []);
  return AiConsent_maySend(consent) ? (
    <>{props.children}</>
  ) : (
    <Text className="py-4 text-sm text-text-secondary">
      {consent.choice === "declined" ? AiConsent_disabledMessage : "AI permission required"}
    </Text>
  );
}
