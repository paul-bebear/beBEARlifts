import { Dispatch, JSX } from "react";
import { IDispatch } from "../ducks/types";
import { IOnboardingEvent, IOnboardingState } from "../models/onboarding";
import { Invite_parseHandle } from "../models/invite";
import { OnboardingChoices_welcomeLabel } from "../models/onboardingChoices";
import { CloudBackupCard } from "./cloudBackupCard";

export const OnboardingWelcome_field =
  "w-full p-3 border rounded-xl bg-background-default border-border-prominent text-text-primary";

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
  return (
    <>
      <div className="flex flex-col items-center gap-3 pt-6 text-center">
        <div className="text-8xl" aria-hidden="true">
          🐻
        </div>
        <h1 className="text-3xl font-bold">Meet your bear</h1>
        <p className="text-lg">This is your bear. Train it, feed it, watch it grow.</p>
      </div>
      <CloudBackupCard dispatch={props.dispatch} compact />
      {props.showInvite && (
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
      {badInvite && <p role="alert">Use 3–20 lowercase letters, numbers, or underscores.</p>}
      <div className="flex-1" />
      <button
        className="w-full p-4 text-lg font-bold text-black rounded-2xl bg-yellow-400 disabled:opacity-40"
        disabled={badInvite || props.busy}
        onClick={props.onContinue}
      >
        {OnboardingChoices_welcomeLabel(props.signedIn)}
      </button>
    </>
  );
}
