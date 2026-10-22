# Onboarding steps — plan

*2026-10-23 · branch `onboarding-steps`, based on `origin/native-onboarding` (PR #95) · worktree `.claude/worktrees/onboarding-steps`*

- [x] 0 intake
- [x] 1 draft
- [x] 2 codex arch
- [x] 3 approved
- [x] 4 contract
- [x] 5 implement
- [x] 6 verify
- [x] 6b comment pass
- [x] 7 reviews
- [x] 8 triage
- [ ] 9 documented

## What the user gets

A new user opens beBEAR and gets a Duolingo-style first run with 74 short screens. Each screen has a back arrow, one progress bar, the bear with a speech bubble, answer cards and one big button at the bottom.

The order and the step types copy Liftoff's recorded onboarding. The words and the art are ours.

The answers that matter still feed the plan cards and the same apply step as today: place, experience, goal, days, age, height, weight and sex.

The owner tries it on an iPhone and cuts screens by deleting lines from one list in `src/models/onboardingSteps.ts`.

## The 74 steps

Each line gives the number, the kind, what the bear says or asks, and where the answer goes. "extra" means the answer stays in memory and feeds nothing yet. A step marked "only if" is skipped when its condition is false.

The promise.

- 1 · signIn · "Hi! Ready to grow a bear?" Buttons: "Let's go" and "I already have an account". Signing in uses today's `OnboardingSignIn`.
- 2 · say + levels row · "Your bear has 12 levels. Cub all the way to Mars."
- 3 · say + growth art · "Every set you log makes it bigger."
- 4 · say + plan art · "You get a plan made for you. No guessing."
- 5 · say + food art · "Log your meals to keep it fed."
- 6 · say · "I'm your bear. Answer a few questions and I'll build your plan."

Answers, reassurance and the promise.

- 7 · text · "What should I call you?" Skip allowed. Goes to `answers.name`.
- 8 · single · "How much have you trained?" Never, Tried it, A few months, Years. Never and Tried it both set `experience: "new"`.
- 9 · single · "What do you want most?" Size, Strength, Both. Goes to `answers.goal`.
- 10 · say · Depends on the goal. Size: "Size it is. That means 8 to 12 reps and eating enough."
- 11 · multi · "Why do you want to train?" Confidence, Look better, A sport, Health, Impress someone, Other. extra.
- 12 · multi · "What usually stops you?" Not sure what to do, No time, Hard to stay consistent, No one to train with, Pain. extra.
- 13 · say · Depends on step 12. No time: "Every plan fits in about 45 minutes."
- 14 · hold · "I'll train my bear and grow with it." Hold the bear for 2 seconds.

Where you found us, and your body.

- 15 · single · "How did you find beBEAR?" TikTok, Instagram, A friend, App Store, YouTube, Other. extra.
- 16 · single · only if TikTok or Instagram · "Was it an ad or a creator?" extra.
- 17 · text · only if creator · "Which creator?" Skip allowed. extra.
- 17b · text · only if A friend · "What's your friend's handle?" Goes to `invite`, same rule as today's welcome field.
- 18 · single · "Are you male or female?" Male, Female, Skip. Goes to `answers.sex`. The bear on screen switches line from here.
- 19 · number · "How tall are you?" cm or ft in. Goes to `answers.height*`.
- 20 · number · "How much do you weigh?" kg or lb. "I use it for food targets." Goes to `answers.weight`.
- 21 · number · "How old are you?" Goes to `answers.age`. Under 18 gets the youth plan.
- 21b · single · "How active are you on a normal day?" Today's four `FoodTargets_activities`, plus Skip. Goes to `answers.activity`.
- 21c · single · "Do you want to gain, keep or lose weight?" Today's `FoodTargets_goals`, plus Skip. Goes to `answers.foodGoal`. Steps 21b and 21c keep the food targets that today's About screen sets.

Meet the bear.

- 22 · say · "This is about you. And me."
- 23 · say · "Let's meet properly."
- 24 · say + big cub · "This is me now. Level 1, Cub."
- 25 · say + growth art · "Lift and I grow. Train long enough and I end up on Mars."
- 26 · say + outfits art · "You'll unlock outfits for me as you go."
- 27 · single · "Which bear is yours?" Two bears. Goes to the bear line.
- 28 · say, pumped · "Nice. We're a team now."

The problem, then the answer.

- 29 · single · "How often do you think about getting fit?" Rarely, Sometimes, Often, All the time. extra.
- 30 · single · "How is your energy in a workout?" Four choices. extra.
- 31 · yesNo · "It's hard to see my progress." extra.
- 32 · yesNo · "I repeat the same workout and don't know what's missing." extra.
- 33 · yesNo · "I could push harder than I do." extra.
- 34 · say, tired · "Training without a plan feels slow."
- 35 · say, tired · "It's hard to know if you're doing enough."
- 36 · say, pumped · "I show your progress. Every kg you lift counts."

The plan quiz.

- 37 · single · "Want me to build your plan?" Build me one, Import my own. Import needs sign-in and AI, then runs today's import steps.
- 38 · multi · "What kind of training do you like?" Muscle building, Powerlifting, Calisthenics, Circuits, Not sure. extra.
- 39 · multi · "Where do you train?" Full gym, Only dumbbells, Street workout, No equipment. Goes to `answers.places`.
- 40 · say · "Your equipment: barbell, dumbbells, cables… Change it any time in Settings." The list comes from `BearPlace_equipmentKeys`.
- 41 · multi · "Any muscles you want to focus on?" Chest, Back, Arms, Shoulders, Legs, Abs. extra.
- 42 · single · "How long can a workout be?" 30, 45, 60, 90 minutes. extra.
- 43 · single · "How many days a week?" 2 to 6. Goes to `answers.days`.
- 44 · multi · "Which days work?" Mon to Sun, at least as many as step 43. extra.
- 45 · multi · "Anything that hurts?" Back, Knees, Shoulders, Wrists, Elbows, Nothing. extra.

The plan.

- 46 · loading · "Building your plan…" for 2.5 seconds.
- 47 · plans · today's `OnboardingPlanCards`, with your answers summed up above the cards.
- 48 · permission · "Want a reminder on training days?" Allow, Later. extra for now.
- 49 · say + widget art · "Put me on your Home Screen."
- 50 · say · only on iPhone · "Press and hold an empty spot on your Home Screen."
- 51 · say · only on iPhone · "Tap Edit, then Add Widget."
- 52 · say · only on iPhone · "Search for beBEAR and add me."
- 53 · say · "Lifters like you are growing their bears right now."

Your first number.

- 54 · lift · "What's a set you did recently?" An exercise, a weight and reps. Skip allowed. extra.
- 55 · result · "That set moved 400 kg. I need 5,000 kg to become a Teen." Uses `BearTier`. Share allowed.
- 56 · say + forecast · "At 3 workouts a week I reach Regular around 12 February." Uses the 6,000 kg per session pace.
- 57 · loading · three bars: your bear, your plan, your food targets.
- 58 · say · "I grow with every kg you lift."
- 59 · say, hungry · "Feed me by logging meals."
- 60 · say, tired · "Miss a day and I get tired. I never get smaller."

beBEAR+ (open question below).

- 61 · say · "Tracking is free. Forever."
- 62 · say · "beBEAR+ adds AI: meal scans, warmups and workout reports."
- 63 · say · "Try beBEAR+ later from Settings." Only "Got it", no purchase.
- 64 · say, pumped · "Let me show you what's inside."
- 65 · say · "Scan a meal and I count the calories."
- 66 · say · "I can plan your warmup from today's workout."
- 67 · say · "After each workout you get a report."
- 68 · say · "Type what you ate. I work out the macros."
- 69 · say + outfits art · "Some outfits are beBEAR+ only."
- 70 · say · "That's beBEAR+."

Finish.

- 71 · result + badge · "Setup done. First badge unlocked."
- 72 · permission · only in the iPhone app · "Connect Apple Health?" Allow, Later. extra for now.
- 73 · signIn · "Save your bear." Apple, Google, email, or "Not now".
- 74 · say, pumped · "Welcome, Paul! Let's do your first workout." The button runs today's `start`.

Liftoff also shows an App Store rating prompt at step 57. It is left out, because Apple limits how often apps may ask.

## How it works

Today the reducer in `src/models/onboarding.ts` walks a fixed set of screens.

```ts
export type IOnboardingStep = "welcome" | "place" | "about" | "want" | "import" | "working" | "done" | "plan";

const backSteps: Partial<Record<IOnboardingStep, IOnboardingStep>> = {
  place: "welcome",
  about: "place",
  want: "about",
  import: "want",
  plan: "want",
  done: "import",
};
```

The new shape keeps the reducer and its `command` and `run` numbers. It replaces the fixed screens with one list of steps and a location.

```
OnboardingFlow (component)
  step = OnboardingSteps_current(state)          one step def from the list
  OnboardingStepFrame                            back arrow, progress bar, bear + bubble, bottom button
    OnboardingStepBody switch on step.kind
      say        art + text
      choice     cards, single or multi
      measure    age, height or weight, with unit chips
      text       one text field
      hold       press and hold the bear, 2 s
      loading    bars, then the component emits next for this visit
      plans      OnboardingPlanCards
      lift       exercise, weight, reps
      result     bear level card or badge
      permission Allow / Later, recorded only
      signIn     OnboardingSignIn, then the same invite save + auth event as today
  button press -> emit({ type: "next", visit })
Onboarding_reduce
  next in flow  -> OnboardingSteps_next(list, id, ctx), skipping steps whose when(ctx) is false
  last step     -> command "apply", the same OnboardingCommand_run as today
  choice "Import my own" -> phase "import" -> working -> done -> back into the flow after the plans step
  import fallback        -> back into the flow at the plans step
```

**Location.** State gets `at: { phase: "flow"; id: string } | { phase: "import" } | { phase: "working" } | { phase: "done" }`. A step id has meaning only inside the flow, so it lives only there. Codex asked for this shape.

**Visit number.** Each move to a new step adds 1 to `visit`. The hold and loading timers send their event with the visit they started in. The reducer drops an event from an old visit, the same way it already drops an old `run`:

```ts
if (
  (event.type === "ready" || event.type === "failed" || event.type === "fallback") &&
  event.run != null &&
  event.run !== state.run
) {
  return state;
}
```

**The picked plan.** Today the picked card exists only while the screen is "plan":

```ts
export function Onboarding_selectedCard(state: IOnboardingState): IBearPlanCard | undefined {
  return state.step === "plan" ? state.cards[state.selected] : undefined;
}
```

After the plans step there are 27 more steps, so apply would find no card and stop without a word (Codex point 1). The new state stores `pickedDays?: 3 | 4 | 5`. The cards come from the current answers each time, through `BearPlan_recommend(OnboardingAnswers_planInput(answers))`. The picked card is the card with `pickedDays`, or the recommended card when none is picked. Changing an answer after the plans step cannot leave stale cards, and Back keeps the pick (Codex point 4).

**Extras.** Answers that feed nothing yet go in `state.extras: Record<string, string[]>`, beside `answers` and outside it. The import call posts `form.answers` to `/api/ai/onboard`, so extras inside `answers` would reach the server (Codex point 2). A dedicated `{ type: "extra"; id; value }` event writes one key, so one answer cannot wipe another.

**Typed choices.** A choice step names the field it writes, and each field pins the type of its option values (Codex point 3):

```ts
type IOnboardingChoiceField =
  | { field: "experience"; options: IOnboardingOption<IOnboardingAnswers["experience"]>[] }
  | { field: "goal"; options: IOnboardingOption<IBearGoal>[] }
  | { field: "places"; multi: true; options: IOnboardingOption<IBearPlacePick>[] }
  | { field: "extra"; multi?: boolean; options: IOnboardingOption<string>[] };
```

Height, weight and age keep their own `measure` kind. It reuses today's unit chips and fields from `OnboardingAboutQuestions`.

**Branches.** A step may have `when(ctx)`, where `ctx` is `{ answers, extras, platform }`. The same `ctx` drives Next, Back and the progress bar. A hidden step's answer stays in `extras` and is ignored. The friend handle is the one hidden answer with an effect. Apply sends the invite only when the friend step was visible.

**Side effects.** The sign-in step runs today's welcome effect: `InviteClient_save`, then the `auth` event that decides if AI import is allowed. The reminder and Health steps record Allow or Later and ask the OS for nothing in this pass (Codex point 7).

**Scroll.** The scroll-to-top effect keys on the step id and the phase, instead of `form.step` (Codex point 8).

**Safety for trimming.** A test walks the list from start to end with default answers and checks that apply gets a card. A second test deletes every step that writes an extra and checks the same. A third test requires these steps: one place step, one plans step, and a last step. Deleting one of those fails the test, and its message names the step.

## The contract (API · types · state)

Approved answers to the open questions: beBEAR+ steps stay as info only, the bear pick saves to `BearStore`, the name is used only in the bear's lines, and PR #95 merges first.

Types in `src/models/onboardingSteps.ts`:

```ts
export type IOnboardingPlatform = "ios" | "android" | "web";

export interface IOnboardingContext {
  answers: IOnboardingAnswers;
  extras: Record<string, string[]>;
  platform: IOnboardingPlatform;
  now: number;
}

export type IOnboardingText = string | ((ctx: IOnboardingContext) => string);
export type IOnboardingArt = "levels" | "growth" | "plan" | "food" | "cub" | "outfits" | "widget" | "forecast" | "badge";

export interface IOnboardingOption<T> {
  id: string;
  label: string;
  detail?: string;
  value: T;
}

interface IOnboardingStepBase {
  id: string;
  bear: IBearMood;
  say: IOnboardingText;
  when?: (ctx: IOnboardingContext) => boolean;
}

export type IOnboardingChoiceField =
  | { field: "experience"; options: IOnboardingOption<IOnboardingAnswers["experience"]>[] }
  | { field: "goal"; options: IOnboardingOption<IBearGoal>[] }
  | { field: "sex"; options: IOnboardingOption<"male" | "female" | undefined>[] }
  | { field: "days"; options: IOnboardingOption<NonNullable<IOnboardingAnswers["days"]>>[] }
  | { field: "activity"; options: IOnboardingOption<IFoodActivity | undefined>[] }
  | { field: "foodGoal"; options: IOnboardingOption<IFoodGoalKind | undefined>[] }
  | { field: "bearLine"; options: IOnboardingOption<IBearLine>[] }
  | { field: "source"; options: IOnboardingOption<"recommend" | "import">[] }
  | { field: "places"; multi: true; options: IOnboardingOption<IBearPlacePick>[] }
  | { field: "extra"; multi?: boolean; min?: (ctx: IOnboardingContext) => number; options: IOnboardingOption<string>[] };

export type IOnboardingStepDef = IOnboardingStepBase &
  (
    | { kind: "say"; title?: IOnboardingText; art?: IOnboardingArt }
    | ({ kind: "choice" } & IOnboardingChoiceField)
    | { kind: "measure"; measure: "age" | "height" | "weight" }
    | { kind: "text"; field: "name" | "invite" | "extra"; label: string }
    | { kind: "hold"; holdMs: number }
    | { kind: "loading"; ms: number; bars: string[] }
    | { kind: "plans" }
    | { kind: "lift" }
    | { kind: "result"; result: "lift" | "badge" }
    | { kind: "permission"; permission: "reminder" | "health" }
    | { kind: "signIn"; variant: "start" | "save" }
  );

export type IOnboardingChoiceStep = Extract<IOnboardingStepDef, { kind: "choice" }>;

export interface IOnboardingChoicePatch {
  answers?: Partial<IOnboardingAnswers>;
  extra?: { id: string; value: string[] };
  source?: "recommend" | "import";
}
```

Public API in `src/models/onboardingSteps.ts`:

```ts
export const OnboardingSteps_all: readonly IOnboardingStepDef[];
export function OnboardingSteps_text(text: IOnboardingText, ctx: IOnboardingContext): string;
export function OnboardingSteps_visible(steps: readonly IOnboardingStepDef[], ctx: IOnboardingContext): IOnboardingStepDef[];
export function OnboardingSteps_find(steps: readonly IOnboardingStepDef[], id: string): IOnboardingStepDef | undefined;
export function OnboardingSteps_next(steps: readonly IOnboardingStepDef[], id: string, ctx: IOnboardingContext): IOnboardingStepDef | undefined;
export function OnboardingSteps_prev(steps: readonly IOnboardingStepDef[], id: string, ctx: IOnboardingContext): IOnboardingStepDef | undefined;
export function OnboardingSteps_progress(steps: readonly IOnboardingStepDef[], id: string, ctx: IOnboardingContext): number;
export function OnboardingSteps_canContinue(step: IOnboardingStepDef, ctx: IOnboardingContext): boolean;
export function OnboardingSteps_isSelected(step: IOnboardingChoiceStep, ctx: IOnboardingContext, optionId: string): boolean;
export function OnboardingSteps_choose(step: IOnboardingChoiceStep, ctx: IOnboardingContext, optionId: string): IOnboardingChoicePatch;
export function OnboardingSteps_liftKg(extras: Record<string, string[]>): number | undefined;
export function OnboardingSteps_forecast(ctx: IOnboardingContext, days: number): { level: IBearLevel; date: number } | undefined;
export function OnboardingSteps_check(steps: readonly IOnboardingStepDef[]): string[];
```

`OnboardingSteps_check` returns one message per problem: a duplicate id, no `places` choice, no `plans` step, or a last step that a `when` can hide. Tests call it. The app does not.

Changed in `src/models/onboarding.ts`:

```ts
export type IOnboardingAt = { phase: "flow"; id: string } | { phase: "import" } | { phase: "working" } | { phase: "done" };

export interface IOnboardingState {
  at: IOnboardingAt;
  visit: number;
  steps: readonly IOnboardingStepDef[];
  platform: IOnboardingPlatform;
  now: number;
  answers: IOnboardingAnswers;
  extras: Record<string, string[]>;
  source: "recommend" | "import";
  pickedDays?: IBearPlanCard["days"];
  images: string[];
  invite: string;
  useAi: boolean;
  command?: "prepare" | "apply";
  run: number;
  result?: IOnboardingResult;
  importHistory: boolean;
  error?: string;
  notice?: string;
  resizing: boolean;
}

export type IOnboardingEvent =
  | { type: "answers"; patch: Partial<IOnboardingAnswers> }
  | { type: "choose"; optionId: string }
  | { type: "extra"; id: string; value: string[] }
  | { type: "invite"; value: string }
  | { type: "auth"; signedIn: boolean }
  | { type: "next" | "back"; visit?: number }
  | { type: "pick"; days: IBearPlanCard["days"] }
  | { type: "resizing" | "toggleHistory" }
  | { type: "fallback"; reason?: string; run?: number }
  | { type: "images"; images: string[] }
  | { type: "removeImage"; index: number }
  | { type: "ready"; result: IOnboardingResult; run?: number }
  | { type: "failed"; error: string; run?: number };

export function Onboarding_empty(options?: {
  invite?: string;
  answers?: IOnboardingAnswers;
  platform?: IOnboardingPlatform;
  now?: number;
  steps?: readonly IOnboardingStepDef[];
}): IOnboardingState;
export function Onboarding_context(state: IOnboardingState): IOnboardingContext;
export function Onboarding_current(state: IOnboardingState): IOnboardingStepDef | undefined;
export function Onboarding_cards(state: IOnboardingState): IBearPlanCard[];
export function Onboarding_selectedCard(state: IOnboardingState): IBearPlanCard | undefined;
export function Onboarding_progress(state: IOnboardingState): number;
export function Onboarding_mainAction(state: IOnboardingState): { label: string; event: IOnboardingEvent; enabled: boolean } | undefined;
export function Onboarding_canGoBack(state: IOnboardingState): boolean;
export function Onboarding_reduce(state: IOnboardingState, event: IOnboardingEvent): IOnboardingState;
```

Removed: `IOnboardingStep`, `step`, `cards`, `selected`, and the `recommend`, `import` and `start` events. The plans step comes from Next, the import branch from choosing "Import my own", and apply from Next on the last step.

Changed in `src/models/onboardingAnswers.ts`: `IOnboardingAnswers` gains `name: string` and `bearLine?: IBearLine`. `OnboardingAnswers_empty` sets `name: ""`.

All new state:

- `IOnboardingState.at`, `visit`, `steps`, `platform`, `now`, `extras`, `source`, `pickedDays`. They live in the `useReducer` of `OnboardingFlow`, as all onboarding state does today. Nothing is saved until apply.
- `IStorage`: no change.
- `BearStore` (`bebear_bear`): apply writes `line` when `answers.bearLine` is set. The field and its parser exist already.
- `useState` and `useRef`: none new. The hold and loading timers are `setTimeout` handles inside `useEffect`, cleared on cleanup.

Tests:

- `test/onboardingSteps.test.ts`, new. `OnboardingSteps_check` passes on the real list. A walk with default answers reaches apply with a card. A trimmed list without extra steps still reaches apply. Branch reversal hides the creator step. Progress counts only visible steps. `choose` returns typed patches. `liftKg` and `forecast` give the numbers shown on screen.
- `test/onboarding.test.ts`, rewritten for the new state. An old visit is ignored. Back keeps `pickedDays`. Extras never enter `answers`. Import success rejoins after the plans step, and fallback rejoins at the plans step.
- `test/onboardingCommand.test.ts`, updated. Apply finds the card after the flow left the plans step, and saves `bearLine`.
- `test-render/onboarding.test.tsx`, updated. It drives the native screens through a short list passed in through `steps`.

Where the logic lives:

- Step order, visibility, progress, the Continue rule, and choice patches: `onboardingSteps.ts`, tested in `test/onboardingSteps.test.ts`.
- Lift kg and the level forecast: `onboardingSteps.ts`, tested in `test/onboardingSteps.test.ts`.
- Location, visit filtering, the picked plan, extras, the import rejoin, and when apply runs: `onboarding.ts`, tested in `test/onboarding.test.ts`.
- The card apply uses and the bear line save: `onboardingCommand.ts`, tested in `test/onboardingCommand.test.ts`.
- `onboardingFlow.tsx` holds the reducer and runs the effects: the command, the invite save, the auth event, the loading timer, and the scroll reset.
- `onboardingStepFrame.tsx` draws the frame.
- `onboardingStepKinds.tsx` draws each kind and owns the hold timer. When the timer ends, it emits Next with the visit.

## Files

- `src/models/onboardingSteps.ts`, new. The step types, the 77-entry list `OnboardingSteps_all` (Liftoff's 74 plus the friend handle and the two food questions), and the pure helpers `OnboardingSteps_next`, `_prev`, `_current`, `_canContinue`, `_progress`, `_choose`, `_isSelected`.
- `src/models/onboarding.ts`, changed. Location, visit, `pickedDays`, `extras`, and the new events.
- `src/models/onboardingAnswers.ts`, changed. Adds `name` and `bearLine`.
- `src/utils/onboardingCommand.ts`, changed. Reads the picked card from `pickedDays`, saves `bearLine` to `BearStore`, saves the friend invite.
- `src/components/onboardingFlow.tsx`, changed. Renders the current step, runs the effects and timers.
- `src/components/onboardingStepFrame.tsx`, new. The back arrow, progress bar, bear with bubble and bottom button.
- `src/components/onboardingStepKinds.tsx`, new. One small component per kind.
- `src/components/onboardingProfileQuestions.tsx`, `onboardingQuestions.tsx` (want part) and `onboardingWelcome.tsx`, removed or cut down. Their parts move into the kinds.
- `test/onboardingSteps.test.ts`, new. `test/onboarding.test.ts` and `test-render/onboarding.test.tsx`, updated.

## Effort

About 3 hours for the list module and reducer, 4 hours for the frame and the 11 kinds, 2 hours for the 77 entries, and 2 hours for tests. That totals about 11 hours if PR #95's native screens keep working as they do now.

## What we're not doing

- No OS permission requests. The reminder and Health steps record the answer only.
- No App Store rating prompt.
- No purchase. The beBEAR+ steps are info only, see the open questions.
- Extras are not saved after onboarding. Only the answers that survive trimming get saved, in a later pass.
- No sliders or wheels. Height, weight and age use number fields with unit chips first.
- No new art. Every screen uses the existing bear sprites from `BearArt_sprite` and the moods.
- No Liftoff wording, art or layouts.

## Open questions

- **beBEAR+ steps 61 to 70.** Recommended: keep them as info only with "Got it", and trim on the phone. Alternative: wait for the paywall plan in PR #101.
- **Bear choice, step 27.** Recommended: save the pick to `BearStore` as the bear line at apply. Alternative: keep it as an extra and use the sex answer, as today.
- **Name, step 7.** Recommended: use it only for the bear's lines during onboarding. Alternative: also save it as the display name for friends.
- **Merge order.** This branch sits on PR #95, so #95 merges first. Recommended: keep it that way. Alternative: rebase on master and redo #95's native work here.

## Codex

Transcript: `/Users/paulbebear/Code/GitHub/beBEARlifts/lambda/scripts/plans/20261023-onboarding-steps.codex.md`.

Round 1 only. All 8 points were checked against the code and accepted:

- 1, apply after the plans step finds no card. Fixed by `pickedDays`.
- 2, extras would reach the import API, and a shallow merge would wipe them. Fixed by `state.extras` and its own event.
- 3, a bare field key cannot type the values. Fixed by typed choice fields and the `measure` kind.
- 4, cards go stale and lose the pick on Back. Fixed by deriving cards and storing `pickedDays`.
- 5, an index beside every phase allows nonsense states. Fixed by the `at` location. yes/no folds into choice.
- 6, `when` needs one shared context, and trimming needs guards. Fixed by `ctx` and the trimming tests.
- 7, sign-in and permissions need effects. Sign-in keeps today's effects, permissions only record.
- 8, scroll reset and the render tests depend on `form.step`. Both get updated.

## Review triage

The owner approved fixes for 8 findings and rejected 4. All 8 are fixed and tested:

- Import skipped the place question. `places` and `equipment` now sit before `source`, and `OnboardingSteps_check` refuses the old order.
- A double tap on Next moved two screens. Every Next, Back and Skip now carries the visit number.
- The hold screen had no web screen reader path. It has a "Can't hold? Tap to continue" link.
- Height, weight and age could not be skipped. A Skip link clears the value and moves on, through the `skip` event.
- After an import fell back, the source screen still showed "No, I have my own". The fallback now resets that pick.
- The friend handle was saved before the end. Apply saves it through `Onboarding_inviteToSave`, only while the friend step is shown.
- A trimmed list could open on a hidden step or end on a screen with no button. The flow starts on the first visible step, and the check requires a last step with a button.
- Import access was read only on "Get started". The `capability` event now updates it whenever sign-in changes.

Rejected: turning the list into data keys, a single store for each answer, moving thin press handlers into modules, and one combined Allow/Later event.
