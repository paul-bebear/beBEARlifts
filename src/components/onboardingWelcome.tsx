import { Dispatch, JSX, useEffect } from "react";
import { IDispatch } from "../ducks/types";
import { IOnboardingEvent, IOnboardingState } from "../models/onboarding";
import { Invite_parseHandle } from "../models/invite";
import { OnboardingChoices_welcomeLine } from "../models/onboardingChoices";
import { CubClient_refresh } from "../utils/cubClient";
import { useCubCard } from "../utils/useCubCard";
import { CloudBackupCard } from "./cloudBackupCard";
import { CubShare } from "./cubShare";

export const OnboardingWelcome_field =
  "w-full p-3 border rounded-xl bg-background-default border-border-prominent text-text-primary";

// Sign-in is the only way past this page (owner decision 2026-10-27). The cub number is the reason it gives.
export function OnboardingWelcome(props: {
  form: IOnboardingState;
  emit: Dispatch<IOnboardingEvent>;
  dispatch: IDispatch;
  signedIn: boolean;
  showInvite: boolean;
  busy: boolean;
  onContinue: () => void;
}): JSX.Element {
  const { form, emit } = props;
  const badInvite = form.invite !== "" && Invite_parseHandle(form.invite) == null;
  const card = useCubCard();
  useEffect(() => {
    if (props.signedIn) {
      CubClient_refresh().catch(() => undefined);
    }
  }, [props.signedIn]);
  return (
    <>
      <div className="flex flex-col items-center gap-3 pt-6 text-center">
        <div className="text-8xl" aria-hidden="true">
          🐻
        </div>
        <h1 className="text-3xl font-bold">Meet your bear</h1>
        <p className="text-lg" data-testid="onboarding-welcome-line">
          {OnboardingChoices_welcomeLine(props.signedIn, card?.number)}
        </p>
      </div>
      {props.signedIn && card != null && <CubShare data={card} />}
      <CloudBackupCard dispatch={props.dispatch} compact />
      {props.signedIn && props.showInvite && (
        <label className="block">
          Who invited you?
          <input
            className={OnboardingWelcome_field}
            value={form.invite}
            autoCapitalize="none"
            autoCorrect="off"
            maxLength={20}
            onChange={(e) => emit({ type: "invite", value: e.currentTarget.value })}
          />
        </label>
      )}
      {props.signedIn && badInvite && <p role="alert">Use 3–20 lowercase letters, numbers, or underscores.</p>}
      {props.signedIn && (
        <>
          <div className="flex-1" />
          <button
            className="w-full p-4 text-lg font-bold text-black rounded-2xl bg-yellow-400 disabled:opacity-40"
            data-testid="onboarding-welcome-continue"
            disabled={badInvite || props.busy}
            onClick={props.onContinue}
          >
            Continue
          </button>
        </>
      )}
    </>
  );
}
