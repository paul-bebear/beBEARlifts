import { Dispatch, JSX, ReactNode, useEffect, useReducer, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import {
  IOnboardingAnswers,
  OnboardingAnswers_empty,
  OnboardingAnswers_togglePlace,
} from "../models/onboardingAnswers";
import { IDispatch } from "../ducks/types";
import {
  IOnboardingEvent,
  Onboarding_canGoBack,
  Onboarding_empty,
  Onboarding_mainAction,
  Onboarding_reduce,
} from "../models/onboarding";
import { IBearPlacePick } from "../models/bearPlace";
import { IBearGoal } from "../models/bearPlan";
import { OnboardingCommand_run } from "../utils/onboardingCommand";
import { CloudStore } from "../utils/supabaseClient";
import { InviteClient_current, InviteClient_save, InviteStore } from "../utils/inviteClient";
import { OnboardingImportedPlan, OnboardingQuestions } from "./onboardingQuestions";
import { OnboardingWelcome, OnboardingWelcome_field } from "./onboardingWelcome";
import { OnboardingPlanCards } from "./onboardingPlanCards";
import { AiConsent_showFeatures } from "../models/aiConsent";
import { AiConsent_ensure, AiConsentStore } from "../utils/aiConsentClient";
import { IconEquipmentBarbell } from "./icons/iconEquipmentBarbell";
import { IconEquipmentDumbbell } from "./icons/iconEquipmentDumbbell";
import { IconHome } from "./icons/iconHome";

type IEmit = Dispatch<IOnboardingEvent>;

const chip = "flex items-center gap-3 w-full p-4 text-left text-lg border-2 rounded-2xl";
const chipOn = `${chip} border-yellow-500 bg-yellow-50`;
const chipOff = `${chip} border-border-prominent`;
const pill = "px-4 py-2 border-2 rounded-full";
const pillOn = `${pill} border-yellow-500 bg-yellow-50`;
const pillOff = `${pill} border-border-prominent`;

function IconBars(): JSX.Element {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 5h18M6 5v16M18 5v16M3 21h6M15 21h6" />
    </svg>
  );
}

const places: { pick: IBearPlacePick; label: string; icon: () => JSX.Element }[] = [
  { pick: "gym", label: "Full gym", icon: () => <IconEquipmentBarbell /> },
  { pick: "dumbbells", label: "Only dumbbells", icon: () => <IconEquipmentDumbbell /> },
  { pick: "street", label: "Street workout bars", icon: () => <IconBars /> },
  { pick: "none", label: "No equipment", icon: () => <IconHome /> },
];

const experiences: { key: IOnboardingAnswers["experience"]; label: string }[] = [
  { key: "new", label: "New" },
  { key: "months", label: "A few months" },
  { key: "years", label: "Years" },
];

const goals: { key: IBearGoal; label: string; detail: string }[] = [
  { key: "size", label: "Size", detail: "Bigger muscles" },
  { key: "strength", label: "Strength", detail: "Lift heavier" },
  { key: "both", label: "Both", detail: "Heavy first lift, then muscle work" },
];

function PlaceScreen(props: { a: IOnboardingAnswers; emit: IEmit }): JSX.Element {
  return (
    <>
      <h1 className="text-3xl font-bold">Where do you train?</h1>
      <p className="text-text-secondary">Pick all that fit.</p>
      <div className="space-y-3">
        {places.map((p) => {
          const on = props.a.places.includes(p.pick);
          return (
            <button
              key={p.pick}
              className={on ? chipOn : chipOff}
              aria-pressed={on}
              onClick={() =>
                props.emit({
                  type: "answers",
                  patch: { places: OnboardingAnswers_togglePlace(props.a.places, p.pick) },
                })
              }
            >
              {p.icon()}
              {p.label}
            </button>
          );
        })}
      </div>
    </>
  );
}

function AboutScreen(props: { a: IOnboardingAnswers; emit: IEmit }): JSX.Element {
  const { a } = props;
  const patch = (value: Partial<IOnboardingAnswers>): void => props.emit({ type: "answers", patch: value });
  return (
    <>
      <h1 className="text-3xl font-bold">About you</h1>
      <fieldset className="space-y-2">
        <legend className="mb-2 font-semibold">How long have you lifted?</legend>
        <div className="flex flex-wrap gap-2">
          {experiences.map((e) => (
            <button
              key={e.key}
              className={a.experience === e.key ? pillOn : pillOff}
              aria-pressed={a.experience === e.key}
              onClick={() => patch({ experience: e.key })}
            >
              {e.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block">
        Age
        <input
          className={OnboardingWelcome_field}
          inputMode="numeric"
          value={a.age}
          onChange={(e) => patch({ age: e.currentTarget.value })}
        />
      </label>
      <fieldset className="space-y-2">
        <legend>Height</legend>
        <div className="flex gap-2">
          {(["ftin", "cm"] as const).map((unit) => (
            <button
              key={unit}
              className={unit === a.heightUnit ? pillOn : pillOff}
              aria-pressed={unit === a.heightUnit}
              onClick={() => patch({ heightUnit: unit })}
            >
              {unit === "cm" ? "cm" : "ft in"}
            </button>
          ))}
        </div>
        {a.heightUnit === "cm" ? (
          <input
            className={OnboardingWelcome_field}
            aria-label="Height in cm"
            inputMode="decimal"
            value={a.height}
            onChange={(e) => patch({ height: e.currentTarget.value })}
          />
        ) : (
          <div className="flex items-center gap-2">
            <input
              className={OnboardingWelcome_field}
              aria-label="Height, feet"
              inputMode="numeric"
              value={a.heightFt}
              onChange={(e) => patch({ heightFt: e.currentTarget.value })}
            />
            <span>ft</span>
            <input
              className={OnboardingWelcome_field}
              aria-label="Height, inches"
              inputMode="numeric"
              value={a.heightIn}
              onChange={(e) => patch({ heightIn: e.currentTarget.value })}
            />
            <span>in</span>
          </div>
        )}
      </fieldset>
      <fieldset className="space-y-2">
        <legend>Weight</legend>
        <div className="flex gap-2">
          {(["lb", "kg"] as const).map((unit) => (
            <button
              key={unit}
              className={unit === a.unit ? pillOn : pillOff}
              aria-pressed={unit === a.unit}
              onClick={() => patch({ unit })}
            >
              {unit}
            </button>
          ))}
        </div>
        <input
          className={OnboardingWelcome_field}
          aria-label={`Weight in ${a.unit}`}
          inputMode="decimal"
          value={a.weight}
          onChange={(e) => patch({ weight: e.currentTarget.value })}
        />
      </fieldset>
      <fieldset className="space-y-2">
        <legend>Sex, for food targets (optional)</legend>
        <div className="flex gap-2">
          {(["male", "female"] as const).map((sex) => (
            <button
              key={sex}
              className={a.sex === sex ? pillOn : pillOff}
              aria-pressed={a.sex === sex}
              onClick={() => patch({ sex: a.sex === sex ? undefined : sex })}
            >
              {sex === "male" ? "Male" : "Female"}
            </button>
          ))}
        </div>
      </fieldset>
    </>
  );
}

function WantScreen(props: { a: IOnboardingAnswers; emit: IEmit }): JSX.Element {
  const { a } = props;
  return (
    <>
      <h1 className="text-3xl font-bold">What do you want?</h1>
      <div className="space-y-3">
        {goals.map((g) => (
          <button
            key={g.key}
            className={a.goal === g.key ? chipOn : chipOff}
            aria-pressed={a.goal === g.key}
            onClick={() => props.emit({ type: "answers", patch: { goal: g.key } })}
          >
            <span className="flex flex-col">
              <span className="font-bold">{g.label}</span>
              <span className="text-base text-text-secondary">{g.detail}</span>
            </span>
          </button>
        ))}
      </div>
      <button
        role="switch"
        aria-checked={a.agile}
        className={a.agile ? chipOn : chipOff}
        onClick={() => props.emit({ type: "answers", patch: { agile: !a.agile } })}
      >
        <span className="flex flex-col flex-1">
          <span className="font-bold">More agile</span>
          <span className="text-base text-text-secondary">Adds jumps and quick feet</span>
        </span>
        <span
          className={`w-12 h-7 rounded-full p-1 flex ${a.agile ? "bg-yellow-500 justify-end" : "bg-gray-300 justify-start"}`}
        >
          <span className="w-5 h-5 bg-white rounded-full" />
        </span>
      </button>
    </>
  );
}

export function OnboardingChat(props: { dispatch: IDispatch; children: ReactNode }): JSX.Element {
  const cloud = CloudStore.use();
  const showAi = AiConsent_showFeatures(AiConsentStore.use());
  const pending = InviteStore.use();
  const [form, emit] = useReducer(Onboarding_reduce, undefined, () =>
    Onboarding_empty(InviteClient_current(), OnboardingAnswers_empty(navigator.language))
  );
  const [hadInvite] = useState(() => form.invite !== "");
  const screen = useRef<HTMLElement>(null);
  useEffect(() => {
    screen.current?.focus();
  }, [form.step]);
  useEffect(() => {
    if (form.command != null) {
      props.dispatch(OnboardingCommand_run(form, emit));
    }
  }, [form.run]);
  useEffect(() => {
    if (pending.handle != null) {
      emit({ type: "invite", value: pending.handle });
    }
  }, [pending.handle]);
  const busy = form.command != null || form.resizing;
  const main = Onboarding_mainAction(form);
  const a = form.answers;
  return (
    <View className="flex-1 bg-background-default">
      <main
        ref={screen}
        tabIndex={-1}
        className="flex-1 overflow-y-auto p-5 text-base text-text-primary"
        style={{ paddingBottom: "max(32px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex flex-col max-w-lg min-h-full gap-5 mx-auto">
          {Onboarding_canGoBack(form) && (
            <button className="self-start py-2 text-text-link" onClick={() => emit({ type: "back" })}>
              ‹ Back
            </button>
          )}
          {form.step === "welcome" ? (
            <OnboardingWelcome
              form={form}
              emit={emit}
              dispatch={props.dispatch}
              signedIn={cloud.session != null}
              showInvite={hadInvite || pending.handle != null}
              busy={busy}
              onContinue={() =>
                InviteClient_save(form.invite)
                  .then(() => emit({ type: "auth", signedIn: cloud.session != null && showAi }))
                  .catch(() => emit({ type: "failed", error: "Could not save the invite. Try again." }))
              }
            />
          ) : form.step === "place" ? (
            <PlaceScreen a={a} emit={emit} />
          ) : form.step === "about" ? (
            <AboutScreen a={a} emit={emit} />
          ) : form.step === "want" ? (
            <WantScreen a={a} emit={emit} />
          ) : form.step === "import" ? (
            <OnboardingQuestions form={form} emit={emit} />
          ) : form.step === "working" ? (
            <div role="status" className="space-y-4">
              <View className="items-start">
                <ActivityIndicator />
              </View>
              <p>Building your plan… This can take up to a minute.</p>
              <button className="p-3 text-text-link" onClick={() => emit({ type: "fallback" })}>
                Stop and show beBEAR plans
              </button>
            </div>
          ) : form.step === "plan" ? (
            <OnboardingPlanCards
              cards={form.cards}
              selected={form.selected}
              busy={busy}
              onPick={(index) => emit({ type: "pick", index })}
            />
          ) : (
            <OnboardingImportedPlan form={form} emit={emit} busy={busy} />
          )}
          {form.notice != null && <p className="text-text-secondary">{form.notice}</p>}
          {form.error != null && (
            <div role="alert" className="space-y-3">
              <p>{form.error}</p>
              {form.step === "import" && (
                <button className="p-3 text-text-link" onClick={() => emit({ type: "fallback" })}>
                  Show beBEAR plans
                </button>
              )}
            </div>
          )}
          {main != null && (
            <>
              <div className="flex-1" />
              <button
                className="w-full p-4 text-lg font-bold text-black rounded-2xl bg-yellow-400 disabled:opacity-40"
                disabled={!main.enabled}
                onClick={() => emit(main.event)}
              >
                {main.label}
              </button>
            </>
          )}
          {form.step === "want" &&
            (form.useAi ? (
              <button
                className="self-center p-3 text-text-link"
                disabled={busy}
                onClick={() =>
                  AiConsent_ensure().then((ok) =>
                    emit(ok ? { type: "import" } : { type: "failed", error: "Import needs AI turned on." })
                  )
                }
              >
                Import my own
              </button>
            ) : (
              <p className="self-center text-text-secondary">Import needs sign-in</p>
            ))}
        </div>
      </main>
    </View>
  );
}
