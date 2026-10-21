import { JSX, ReactNode, useEffect, useReducer, useRef } from "react";
import { View } from "react-native";
import { IDispatch } from "../ducks/types";
import { Onboarding_empty, Onboarding_reduce } from "../models/onboarding";
import { OnboardingCommand_run } from "../utils/onboardingCommand";
import { CloudStore } from "../utils/supabaseClient";
import { InviteClient_current, InviteClient_save, InviteStore } from "../utils/inviteClient";
import { Invite_parseHandle } from "../models/invite";
import { CloudBackupCard } from "./cloudBackupCard";
import { OnboardingQuestions } from "./onboardingQuestions";
import { AiConsent_showFeatures } from "../models/aiConsent";
import { AiConsent_ensure, AiConsentStore } from "../utils/aiConsentClient";

export function OnboardingChat(props: { dispatch: IDispatch; children: ReactNode }): JSX.Element {
  const cloud = CloudStore.use();
  const showAi = AiConsent_showFeatures(AiConsentStore.use());
  const pending = InviteStore.use();
  const [form, emit] = useReducer(Onboarding_reduce, undefined, () => Onboarding_empty(InviteClient_current()));
  const screen = useRef<HTMLElement>(null);
  useEffect(() => {
    screen.current?.focus();
  }, [form.step]);
  useEffect(() => {
    if (form.command != null) {
      props.dispatch(OnboardingCommand_run(form, emit));
    }
  }, [form.command]);
  useEffect(() => {
    if (pending.handle != null) {
      emit({ type: "invite", value: pending.handle });
    }
  }, [pending.handle]);
  if (form.step === "manual") {
    return <>{props.children}</>;
  }
  const busy = form.command != null || form.resizing;
  return (
    <View className="flex-1 bg-background-default">
      <main
        ref={screen}
        tabIndex={-1}
        className="flex-1 overflow-y-auto p-5 text-base text-text-primary"
        style={{ paddingBottom: "max(32px, env(safe-area-inset-bottom))" }}
      >
        <div className="max-w-lg mx-auto space-y-6">
          <p className="text-sm font-semibold text-text-secondary">beBEAR · Your training setup</p>
          {form.step === "auth" ? (
            <>
              <h1 className="text-3xl font-bold">Let’s set up your training.</h1>
              <p>Sign in with an email code for AI setup. Then answer three quick questions.</p>
              <CloudBackupCard dispatch={props.dispatch} />
              <label className="block">
                Who invited you? (handle, optional)
                <input
                  className="w-full p-3 border rounded-lg bg-background-default border-border-prominent text-text-primary"
                  value={form.invite}
                  autoCapitalize="none"
                  autoCorrect="off"
                  maxLength={20}
                  onChange={(e) => emit({ type: "invite", value: e.currentTarget.value })}
                />
              </label>
              {form.invite !== "" && Invite_parseHandle(form.invite) == null && (
                <p role="alert">Use 3–20 lowercase letters, numbers, or underscores.</p>
              )}
              <button
                className="w-full p-4 rounded-xl bg-purple-600 text-white"
                disabled={form.invite !== "" && Invite_parseHandle(form.invite) == null}
                onClick={() =>
                  InviteClient_save(form.invite)
                    .then(async () =>
                      emit({ type: "auth", signedIn: cloud.session != null && showAi && (await AiConsent_ensure()) })
                    )
                    .catch(() => emit({ type: "failed", error: "Could not save the invite. Try again." }))
                }
              >
                {cloud.session == null || !showAi ? "Continue without AI" : "Continue with AI"}
              </button>
            </>
          ) : form.step === "working" ? (
            <p role="status">Building your program…</p>
          ) : form.step === "done" && form.result != null ? (
            <>
              <h1 className="text-3xl font-bold">Your plan is ready.</h1>
              <h2 className="text-2xl font-semibold">{form.result.name}</h2>
              <p>{form.result.days} training days per week</p>
              <p>{form.result.answer.note}</p>
              {form.result.answer.historyCsv && <p>Your recent workouts will be added to Home.</p>}
              {form.result.answer.renamed.length > 0 && (
                <div>
                  <h3 className="font-semibold">Renamed exercises</h3>
                  <ul>
                    {form.result.answer.renamed.map(([from, to], i) => (
                      <li key={i}>
                        {from} → {to}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                className="w-full p-4 rounded-xl bg-purple-600 text-white"
                disabled={busy}
                onClick={() => emit({ type: "start" })}
              >
                Start
              </button>
            </>
          ) : (
            <>
              <OnboardingQuestions form={form} emit={emit} />
              <button
                className="w-full p-4 rounded-xl bg-purple-600 text-white"
                disabled={busy}
                onClick={() => emit({ type: "next" })}
              >
                {form.step === "plan" ? "Build my program" : "Continue"}
              </button>
              <button className="p-3 text-text-link" disabled={busy} onClick={() => emit({ type: "skip" })}>
                Skip this question
              </button>
              <button className="p-3 text-text-link" disabled={busy} onClick={() => emit({ type: "back" })}>
                Back
              </button>
            </>
          )}
          {form.error != null && (
            <div role="alert" className="space-y-3">
              <p>{form.error}</p>
              <button className="p-3 text-text-link" disabled={busy} onClick={() => emit({ type: "fallback" })}>
                Use a built-in plan
              </button>
            </div>
          )}
          {form.step !== "working" && (
            <button className="p-3 text-text-link" disabled={busy} onClick={() => emit({ type: "manual" })}>
              Skip, I’ll pick myself
            </button>
          )}
        </div>
      </main>
    </View>
  );
}
