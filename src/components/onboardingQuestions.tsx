import { Dispatch, JSX } from "react";
import { IOnboardingEvent, IOnboardingState } from "../models/onboarding";
import { OnboardingCommand_images } from "../utils/onboardingCommand";
import { OnboardingHistory_summary } from "../models/onboardingHistory";
import { IOnboardingAnswers } from "../models/onboardingAnswers";
import { FoodTargets_activities, FoodTargets_goals } from "../models/foodTargets";
import { IBearGoal } from "../models/bearPlan";

const field = "w-full p-3 border rounded-xl bg-background-default border-border-prominent text-text-primary";
const chip = "flex items-center gap-3 w-full p-4 text-left text-lg border-2 rounded-2xl";
const chipOn = `${chip} border-yellow-500 bg-background-cardyellow`;
const chipOff = `${chip} border-border-prominent`;
const pill = "px-4 py-2 border-2 rounded-full";
const pillOn = `${pill} border-yellow-500 bg-background-cardyellow`;
const pillOff = `${pill} border-border-prominent`;

const goals: { key: IBearGoal; label: string; detail: string }[] = [
  { key: "size", label: "Size", detail: "Bigger muscles" },
  { key: "strength", label: "Strength", detail: "Lift heavier" },
  { key: "both", label: "Both", detail: "Heavy first lift, then muscle work" },
];

export function OnboardingFoodQuestions(props: {
  a: IOnboardingAnswers;
  emit: Dispatch<IOnboardingEvent>;
}): JSX.Element {
  const { a, emit } = props;
  return (
    <>
      <h2 className="text-xl font-semibold">Food targets (optional)</h2>
      <p className="text-text-secondary">
        Answer both questions to set your targets using your age, height, weight and sex. Leave either blank to skip.
      </p>
      <fieldset className="space-y-2">
        <legend className="mb-2 font-semibold">How active are you?</legend>
        <div className="space-y-2">
          {FoodTargets_activities.map((activity) => (
            <button
              key={activity.key}
              className={a.activity === activity.key ? chipOn : chipOff}
              aria-pressed={a.activity === activity.key}
              onClick={() =>
                emit({ type: "answers", patch: { activity: a.activity === activity.key ? undefined : activity.key } })
              }
            >
              <span className="flex flex-col">
                <span className="font-bold">{activity.label}</span>
                <span className="text-base text-text-secondary">{activity.detail}</span>
              </span>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="mb-2 font-semibold">What is your weight goal?</legend>
        <div className="flex flex-wrap gap-2">
          {FoodTargets_goals.map((goal) => (
            <button
              key={goal.key}
              className={a.foodGoal === goal.key ? pillOn : pillOff}
              aria-pressed={a.foodGoal === goal.key}
              onClick={() =>
                emit({ type: "answers", patch: { foodGoal: a.foodGoal === goal.key ? undefined : goal.key } })
              }
            >
              {goal.label}
            </button>
          ))}
        </div>
      </fieldset>
      <button
        className="self-start py-2 text-text-link"
        onClick={() => emit({ type: "answers", patch: { activity: undefined, foodGoal: undefined } })}
      >
        Skip food targets
      </button>
    </>
  );
}

export function OnboardingWantQuestions(props: {
  a: IOnboardingAnswers;
  emit: Dispatch<IOnboardingEvent>;
}): JSX.Element {
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
      <fieldset className="space-y-2">
        <legend className="mb-2 font-semibold">How many days a week can you train?</legend>
        <div className="flex flex-wrap gap-2">
          {([2, 3, 4, 5, 6] as const).map((days) => (
            <button
              key={days}
              className={a.days === days ? pillOn : pillOff}
              aria-pressed={a.days === days}
              onClick={() => props.emit({ type: "answers", patch: { days: a.days === days ? undefined : days } })}
            >
              {days === 6 ? "6+" : days}
            </button>
          ))}
        </div>
      </fieldset>
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

export function OnboardingQuestions(props: { form: IOnboardingState; emit: Dispatch<IOnboardingEvent> }): JSX.Element {
  const { form, emit } = props;
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">Import my own</h1>
      <p>Add screenshots of your plan and recent workouts. Up to 6. The AI brings in your history too.</p>
      <label className="block">
        Screenshots
        <input
          className={field}
          type="file"
          accept="image/*"
          multiple
          disabled={form.resizing}
          onChange={(e) => {
            OnboardingCommand_images(e.currentTarget.files, emit);
            e.currentTarget.value = "";
          }}
        />
      </label>
      <p aria-live="polite">{form.resizing ? "Resizing screenshots…" : `${form.images.length} of 6 screenshots`}</p>
      <div className="flex flex-wrap gap-3">
        {form.images.map((image, i) => (
          <div key={i}>
            <img src={image} alt={`Screenshot ${i + 1}`} className="object-contain w-24 h-32" />
            <button className="p-3 text-text-link" onClick={() => emit({ type: "removeImage", index: i })}>
              Remove {i + 1}
            </button>
          </div>
        ))}
      </div>
      <label className="block">
        Plan, injuries, or other details (optional)
        <textarea
          className={field}
          rows={4}
          maxLength={6000}
          value={form.answers.plan}
          onChange={(e) => emit({ type: "answers", patch: { plan: e.currentTarget.value } })}
        />
      </label>
    </div>
  );
}

export function OnboardingImportedPlan(props: {
  form: IOnboardingState;
  emit: Dispatch<IOnboardingEvent>;
  busy: boolean;
}): JSX.Element | null {
  const result = props.form.result;
  if (result == null) {
    return null;
  }
  return (
    <>
      <h1 className="text-3xl font-bold">Your plan is ready.</h1>
      <h2 className="text-2xl font-semibold">{result.name}</h2>
      <p>{result.days} training days per week</p>
      <p>{result.answer.note}</p>
      {result.history != null && (
        <div className="space-y-2">
          <p>{OnboardingHistory_summary(result.history)}</p>
          {result.history.records.length > 0 && (
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="w-6 h-6"
                checked={props.form.importHistory}
                disabled={props.busy}
                onChange={() => props.emit({ type: "toggleHistory" })}
              />
              Add these workouts to my history
            </label>
          )}
        </div>
      )}
      {result.answer.renamed.length > 0 && (
        <div>
          <h3 className="font-semibold">Renamed exercises</h3>
          <ul>
            {result.answer.renamed.map(([from, to], i) => (
              <li key={i}>
                {from} → {to}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
