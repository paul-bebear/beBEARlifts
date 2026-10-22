import { Dispatch, JSX } from "react";
import { IOnboardingEvent, IOnboardingState } from "../models/onboarding";
import { OnboardingCommand_images } from "../utils/onboardingCommand";
import { OnboardingHistory_summary } from "../models/onboardingHistory";

const field = "w-full p-3 border rounded-xl bg-background-default border-border-prominent text-text-primary";

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
