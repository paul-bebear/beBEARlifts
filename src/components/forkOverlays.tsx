import { Component, ErrorInfo, JSX, ReactNode, useEffect, useState } from "react";
import RB from "rollbar";
import { AiConsent_disclosure } from "../models/aiConsent";
import { AiConsentPrompt_answer, AiConsentPrompt_subscribe } from "../utils/aiConsentPrompt";
import { ForkSheet, ForkSheetButton } from "./forkSheet";
import { InviteRequest } from "./inviteRequest";

declare let Rollbar: RB | undefined;

// The sheets render beside AppView, outside every screen boundary. A sheet that throws disappears and the app stays.
class OverlayErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  public state = { hasError: false };

  public static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    if (typeof Rollbar !== "undefined" && Rollbar != null) {
      Rollbar.error(error, { componentStack: info.componentStack, screen: "forkOverlays" });
    }
  }

  public render(): ReactNode {
    return this.state.hasError ? null : this.props.children;
  }
}

function AiConsentSheet(): JSX.Element | null {
  const [open, setOpen] = useState(false);
  useEffect(() => AiConsentPrompt_subscribe(setOpen), []);
  return open ? (
    <ForkSheet title="Use AI features?" testId="ai-consent-sheet">
      <p>{AiConsent_disclosure}</p>
      <p className="text-sm text-text-secondary">You can change this later in Settings → AI features.</p>
      <ForkSheetButton primary label="Allow AI" onClick={() => AiConsentPrompt_answer(true)} />
      <ForkSheetButton label="No thanks" onClick={() => AiConsentPrompt_answer(false)} />
    </ForkSheet>
  ) : null;
}

export function ForkOverlays(): JSX.Element {
  return (
    <>
      <OverlayErrorBoundary>
        <InviteRequest />
      </OverlayErrorBoundary>
      <OverlayErrorBoundary>
        <AiConsentSheet />
      </OverlayErrorBoundary>
    </>
  );
}
