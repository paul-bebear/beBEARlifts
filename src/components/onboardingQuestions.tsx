import { Dispatch, JSX } from "react";
import { IOnboardingEvent, IOnboardingState } from "../models/onboarding";
import { IOnboardingAnswers, OnboardingAnswers_daysLabel } from "../models/onboardingAnswers";
import { OnboardingCommand_images } from "../utils/onboardingCommand";

const field = "w-full p-3 border rounded-lg bg-background-default border-border-prominent text-text-primary";
const chip = "px-4 py-2 border rounded-full border-border-prominent text-text-primary";
const chipActive = "px-4 py-2 border rounded-full border-purple-600 bg-purple-600 text-white";

export function OnboardingQuestions(props: { form: IOnboardingState; emit: Dispatch<IOnboardingEvent> }): JSX.Element {
  const { form, emit } = props;
  const a = form.answers;
  const patch = (value: Partial<IOnboardingAnswers>): void => emit({ type: "answers", patch: value });
  return (
    <div className="space-y-5">
      {form.step === "goal" && (
        <>
          <h2 className="text-2xl font-bold">What is your goal, and how many days can you train?</h2>
          <label className="block">
            Goal
            <select
              className={field}
              value={a.goal}
              onChange={(e) => patch({ goal: e.currentTarget.value as IOnboardingAnswers["goal"] })}
            >
              <option value="muscle">Build muscle</option>
              <option value="strength">Get stronger</option>
              <option value="lose">Lose fat</option>
              <option value="fitness">Get fit</option>
            </select>
          </label>
          <label className="block">
            Days per week
            <select className={field} value={a.days} onChange={(e) => patch({ days: Number(e.currentTarget.value) })}>
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {OnboardingAnswers_daysLabel(n, form.useAi)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Minutes per session
            <select
              className={field}
              value={a.minutes}
              onChange={(e) => patch({ minutes: Number(e.currentTarget.value) })}
            >
              {[30, 45, 60, 90, 120].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Equipment
            <select
              className={field}
              value={a.equipment}
              onChange={(e) => patch({ equipment: e.currentTarget.value as IOnboardingAnswers["equipment"] })}
            >
              <option value="gym">Full gym</option>
              <option value="bodyweight">Bodyweight with pull-up and rowing supports</option>
              <option value="machines">Machines, dumbbells and Smith machine</option>
              <option value="dumbbells">Dumbbells and bench</option>
            </select>
          </label>
        </>
      )}
      {form.step === "body" && (
        <>
          <h2 className="text-2xl font-bold">What are your height, weight, age, and lifting experience?</h2>
          <p>Body details are optional. They prefill your food calculator.</p>
          <fieldset className="space-y-2">
            <legend>Height</legend>
            <div className="flex gap-2">
              {(["ftin", "cm"] as const).map((unit) => (
                <button
                  key={unit}
                  className={unit === a.heightUnit ? chipActive : chip}
                  aria-pressed={unit === a.heightUnit}
                  onClick={() => patch({ heightUnit: unit })}
                >
                  {unit === "cm" ? "cm" : "ft in"}
                </button>
              ))}
            </div>
            {a.heightUnit === "cm" ? (
              <input
                className={field}
                aria-label="Height in cm"
                inputMode="decimal"
                value={a.height}
                onChange={(e) => patch({ height: e.currentTarget.value })}
              />
            ) : (
              <div className="flex items-center gap-2">
                <input
                  className={field}
                  aria-label="Height, feet"
                  inputMode="numeric"
                  value={a.heightFt}
                  onChange={(e) => patch({ heightFt: e.currentTarget.value })}
                />
                <span>ft</span>
                <input
                  className={field}
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
                  className={unit === a.unit ? chipActive : chip}
                  aria-pressed={unit === a.unit}
                  onClick={() => patch({ unit })}
                >
                  {unit}
                </button>
              ))}
            </div>
            <input
              className={field}
              aria-label={`Weight in ${a.unit}`}
              inputMode="decimal"
              value={a.weight}
              onChange={(e) => patch({ weight: e.currentTarget.value })}
            />
          </fieldset>
          <label className="block">
            Age
            <input
              className={field}
              inputMode="numeric"
              value={a.age}
              onChange={(e) => patch({ age: e.currentTarget.value })}
            />
          </label>
          <label className="block">
            Sex used by the food formula (optional)
            <select
              className={field}
              value={a.sex ?? ""}
              onChange={(e) => patch({ sex: (e.currentTarget.value || undefined) as IOnboardingAnswers["sex"] })}
            >
              <option value="">Skip</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
          <label className="block">
            Experience
            <select
              className={field}
              value={a.experience}
              onChange={(e) => patch({ experience: e.currentTarget.value as IOnboardingAnswers["experience"] })}
            >
              <option value="new">New to structured lifting (under 3 months)</option>
              <option value="months">3 to 12 months</option>
              <option value="years">Over a year</option>
            </select>
          </label>
        </>
      )}
      {form.step === "plan" && (
        <>
          <h2 className="text-2xl font-bold">Do you follow a plan? Add screenshots.</h2>
          <p>Add your whole plan and recent workouts. Up to 6 screenshots. The AI can bring in your history too.</p>
          <label className="block">
            Plan, equipment limits, injuries, or other details
            <textarea
              className={field}
              rows={4}
              maxLength={6000}
              value={a.plan}
              onChange={(e) => patch({ plan: e.currentTarget.value })}
            />
          </label>
          {form.useAi && (
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
          )}
          <p aria-live="polite">{form.resizing ? "Resizing screenshots…" : `${form.images.length} of 6 screenshots`}</p>
          <div className="flex flex-wrap gap-3">
            {form.images.map((image, i) => (
              <div key={i}>
                <img src={image} alt={`Screenshot ${i + 1}`} className="w-24 h-32 object-contain" />
                <button className="p-3 text-text-link" onClick={() => emit({ type: "removeImage", index: i })}>
                  Remove {i + 1}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
