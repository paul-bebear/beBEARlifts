# Phase 1 findings: Onboarding and AI chat

Slice `onboarding` of `docs/cleanup/manifest.txt`. Read-only review of `master` at d5df8641. Reader model: Sonnet. An Opus checker that did not write them tried to disprove every high and medium finding.

Counts: 0 high, 2 medium, 11 low. 0 dropped by the checker.
Coverage: 53 paths opened. Every manifest file in this slice was opened.

Each finding has a code. "Seen" means the code path was read end to end or a test proved it. "Suspect" means the code points that way but nothing ran it. Effort is hours with tests.

## Medium

- **O1. A failed or cut-off AI answer still uses up one of the 3 lifetime AI setups**
  - Severity: medium. Seen. Kind: bug.
  - File and line: `api/_auth.mjs:152-176 (AiAuth_check counts before the call); api/ai/onboard.mjs:106; src/utils/onboardingCommand.ts:167-205 (two-attempt loop)`
  - Scenario: A free user taps Build my plan. The server counts the call in ai_usage_take, then the provider times out (504) or stops at 12000 tokens. onboard.mjs drops finishReason, so a cut-off answer is sent on as text. The client retries once with the broken text. That is two counted calls for one setup. After 1 or 2 such runs the user has no AI setups left and sees 'You used all 3 AI setups'. report.mjs and warmup.mjs also count before a provider failure.
  - Fix: Return finishReason from onboard.mjs and have OnboardingCommand_run skip the retry on 'length'. Add an ai_usage refund call (or a decrement RPC) in AiAuth_check callers when aiChat returns ok false.
  - Effort: 3 hours.
  - Checker: keep. AiAuth_check runs ai_usage_take (lifetime cap AiAuth_onboardRuns = 3) before aiChat, onboard.mjs drops the finishReason that aiChat returns and sends no refund on failure, and OnboardingCommand_run posts a second counted call when the cut-off text fails OnboardingAnswer_parse.
- **O2. Starting from onboarding overwrites the saved food profile with blanks**
  - Severity: medium. Suspect. Kind: data.
  - File and line: `src/utils/onboardingCommand.ts:96-104; src/models/onboardingAnswers.ts:119-125`
  - Scenario: A user has a food profile (height, sex, birth year) from a restored backup or an earlier food page visit, no program and no history, so the chat shows. They skip the optional food questions and tap Start. OnboardingAnswers_body returns a profile with heightCm, sex and birthYear set to undefined. The spread {...log.profile, ...body.profile} replaces the saved values with undefined, and activity and goal are always replaced.
  - Fix: In OnboardingCommand_run, merge only the defined keys of body.profile into log.profile. Move that merge into a function in onboardingAnswers.ts with a test where the saved profile has a height.
  - Effort: 1 hours.
  - Checker: keep. OnboardingAnswers_empty does not prefill from the saved profile, and when foodTargets is undefined the spread of body.profile writes heightCm, sex and birthYear as undefined over log.profile, which FoodLog_setProfile stores as is, though a saved profile with no program and no history is a rare starting state.

## Low

- **O3. Age, height, weight and screenshots still go to the AI provider with no zero-retention switch in code**
  - Severity: low. Suspect. Kind: security. Still open from the 26 October audit: P5.
  - File and line: `api/ai/onboard.mjs:98-99; api/_ai.mjs:44-72; src/models/aiConsent.ts:8`
  - Scenario: A 16-year-old taps Import my own. POST /api/ai/onboard sends age, height, weight, sex and up to 6 screenshots to Anthropic through the Vercel AI Gateway. The consent text says they 'are not kept'. Nothing in api/_ai.mjs requests zero data retention. If GEMINI_API_KEY is ever set, the same data goes to Gemini's free tier instead.
  - Fix: Add the gateway zero-data-retention option to the aiChat request body once billing allows. Until then, reword the consent text. Send only age and experience to the onboarding route; height and weight are not needed for the plan.
  - Effort: 1.5 hours.
- **O4. Double-tapping Save goal saves twice and can pop two screens**
  - Severity: low. Suspect. Kind: bug.
  - File and line: `src/components/screenGoalWizard.tsx:77-91,163`
  - Scenario: On the result step the user double-taps Save goal. onSave has no in-flight guard and the button is disabled only by canContinue. Both calls run ProgramGoal_set, so the first goal moves into the past list. Body-fat stats are added twice. Each call ends with navigation.goBack(), so the second can leave the screen below as well.
  - Fix: Keep a saving flag in the screen, or have GoalWizard_finish's result applied by one guarded function. Disable the button while saving.
  - Effort: 0.5 hours.
  - Checker: keep. onSave has no in-flight guard and Button only checks disabled, so a second tap during the awaited store updates runs ProgramGoal_set again, which pushes a duplicate goal into past, adds the body-fat stat twice and calls goBack twice; the tap has to land inside that await window and the harm is small.
- **O5. Goal wizard lets the visual path finish without a sex and then silently skips food targets**
  - Severity: low. Suspect. Kind: bug.
  - File and line: `src/models/goalWizard.ts:162-178 (canContinue passes bodyFatVisual); src/models/programGoal.ts:226; src/components/goalWizardSteps.tsx:263-273`
  - Scenario: A user with no saved sex opens the wizard, picks the visual method and slides without tapping Male or Female. Continue is allowed. The body-fat range uses the default shape. ProgramGoal_body returns undefined because sex is missing. The result step says 'Log your weight and fill in Daily targets', which blames the wrong thing.
  - Fix: Require sex in GoalWizard_canContinue for bodyFatVisual, or show a message in the result step that names the missing sex.
  - Effort: 0.5 hours.
- **O6. Age limits differ between onboarding (13) and the food calculator (14)**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/onboardingAnswers.ts:66-69,98-113 vs src/models/foodTargets.ts:96,218-230`
  - Scenario: A 13-year-old enters age 13. OnboardingAnswers_age accepts it and the plan and profile birthYear use it. FoodTargets_parseBody needs 14 or more, so OnboardingAnswers_foodTargets returns undefined and no food targets are set. Height and weight ranges are also written twice (inRange in onboardingAnswers.ts, limits in foodTargets.ts).
  - Fix: Export the limits from foodTargets.ts and use them in OnboardingAnswers_age, heightCm and OnboardingAnswers_body. Add a test for age 13.
  - Effort: 1 hours.
- **O7. Image and answer size limits are written in four places**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/onboarding.ts:49,177-179; src/utils/onboardingCommand.ts:52; src/models/onboardingAnswer.ts:12-13; api/ai/onboard.mjs:11-39`
  - Scenario: The 6 screenshot cap, the 3.5 MB total and the 600000-character answer cap are each typed in the client and in the route. Changing one without the others makes the app accept images the server refuses with a 400.
  - Fix: Put the numbers in one shared constants module (a .json file both the .mjs route and the TypeScript read), and test that both sides use it.
  - Effort: 1 hours.
- **O8. Web onboarding screens repeat style constants and have a full copy in .native.tsx**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/components/onboardingChat.tsx:34-39 and src/components/onboardingQuestions.tsx:14-20 (chip, chipOn, pill, field defined twice; field equals OnboardingWelcome_field); onboardingChat.native.tsx, onboardingPlanCards.native.tsx, onboardingQuestions.native.tsx, onboardingWelcome.native.tsx`
  - Scenario: A style change to chips must be made in two web files and again in the native files. Five .tsx screens duplicate five .native.tsx screens with the same structure. The owner uses iOS only, so the web copy is a test bed.
  - Fix: Export the class constants from one file. Decide whether the web onboarding stays; if it stays, keep only a thin web layer.
  - Effort: 1 hours.
- **O9. OnboardingAnswers_isYouth is called only by its own test**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/models/onboardingAnswers.ts:78-81`
  - Scenario: No file under src calls it. The under-18 rules live in bearPlanRecommend.ts and in the server prompt.
  - Fix: Delete the function and its two assertions in test/onboardingAnswers.test.ts.
  - Effort: 0.25 hours.
- **O10. Save sequence and sign-in decision sit inside .tsx files**
  - Severity: low. Seen. Kind: view-logic.
  - File and line: `src/components/screenGoalWizard.tsx:77-91; src/components/onboardingChat.tsx:157-165,266-273`
  - Scenario: onSave runs three store writes in a fixed order (goal, food, body-fat stat), then goes back. onContinue decides 'signed in and AI on' and saves the invite. The Import my own button checks AI consent then picks the event. These are save rules and decisions, not rendering. None has a unit test.
  - Fix: Move the goal save into a function in goalWizard.ts or a util that takes the stores and returns when done. Move the welcome and import decisions into onboarding.ts as pure functions with tests.
  - Effort: 2 hours.
- **O11. A failed Start can leave food targets and the program goal saved with no program**
  - Severity: low. Suspect. Kind: data.
  - File and line: `src/utils/onboardingCommand.ts:96-122`
  - Scenario: Apply writes the food log, then the program goal, then imports history, and adds the program last. If the history import throws, targets and goal are already saved. On retry, the goal is kept because log.current is set, so a changed choice in the second try does not replace it.
  - Fix: Add the program first, or collect all writes and apply them together. Add a test where Thunk_applyImport rejects.
  - Effort: 1.5 hours.
- **O12. onboard.mjs reads four large files from disk on every request**
  - Severity: low. Seen. Kind: waste.
  - File and line: `api/ai/onboard.mjs:44-50`
  - Scenario: systemPrompt() calls readFile four times (builder, guide, language, exercise names) on every call, including the retry. The files never change between deploys.
  - Fix: Build the prompt once in a module-level promise and reuse it.
  - Effort: 0.25 hours.
- **O13. CsvFromChat_extract and JsonInText_extract have no direct test; braces in prose break the JSON reader**
  - Severity: low. Suspect. Kind: test.
  - File and line: `src/models/csvFromChat.ts; src/models/jsonInText.ts:1-13`
  - Scenario: No test imports either name. JsonInText_extract slices from the first { to the last }. If the model writes 'Use {kg} units' before the JSON, JSON.parse fails and the whole answer is rejected. The retry then costs a counted AI call. OnboardingCatalog_days, OnboardingProgram_dayNames and GoalWizard_setUpdateTargets also have no test.
  - Fix: Add test/jsonInText.test.ts and test/csvFromChat.test.ts with fenced, bare, prose-with-braces and empty cases. Try each balanced object when the first parse fails.
  - Effort: 1.5 hours.

## Findings from the 26 October audit

- H1: fixed. llms/programs_guide.md now has headings for all three beBEAR programs (lines 56, 166, 384). test/onboardingApi.test.ts stubs { plan: 'free', lifetime: 0 } and passes (5 passing). test/programsGuide.test.ts passes (3 passing).
- P5: partly fixed. src/models/aiConsent.ts:8 now names Google Gemini and Anthropic through Vercel's AI Gateway. No zero-data-retention option exists in api/_ai.mjs, and onboard.mjs still sends age, height, weight and screenshots. Kept as an open finding.
- M1: fixed. Commit fb6bae79 and migration 20261027000000_ai_allowance_limits.sql drop the zero-argument ai_usage_take(), add a per-user share and a 10-reports-a-day cap. report.mjs still reads workoutId from the body, but a new id per call is now capped per user.

## Checked with no finding

- api/ai/report.mjs and api/ai/warmup.mjs: inputs are trimmed and capped, auth runs before the provider call, covered by test/aiChat.test.ts
- api/ai/onboard.mjs Onboard_validate: size, image regex and body-size checks run before the AI call and before any quota use; test/onboardingApi.test.ts passes
- src/models/onboarding.ts reducer: stale run numbers are ignored, Start is blocked while a command runs; test/onboarding.test.ts passes (11)
- src/models/onboardingAnswer.ts: one-of builtin or liftoscript is enforced with size caps; test passes
- src/utils/aiRequest.ts: consent check, token check, timeout, 401 and 429 handling are covered by test/aiRequest.test.ts (13 passing)
- src/models/goalWizard.ts: step order, back and canContinue behave; test/goalWizard.test.ts passes (13)
- src/utils/onboardingCatalog.ts: bundled list of 11 programs plus programDetail fetch for others works; tested through onboardingCommand tests
- Mocha run of onboardingApi, programsGuide, onboarding, onboardingCommand, goalWizard, aiRequest, aiChat, onboardingAnswer(s), onboardingProgram, onboardingHistory, onboardingChoices: all pass under TS_NODE_TRANSPILE_ONLY=1
- NavScreenGoalWizard.tsx, onboardingWelcome.tsx, onboardingPlanCards.tsx: thin views, no decisions
