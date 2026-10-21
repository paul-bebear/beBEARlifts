# Handoff: one-link invite and an AI onboarding chat in the app

Branch `handoff-onboarding`. Read `AGENTS.md` first and follow it: logic in pure modules with mocha tests, thin `.tsx` files, the prose rules, no AI attribution lines in commits.

Do no simulator or browser testing; the user tests on their iPhone. Verify with `npx tsc --noEmit`, eslint on changed files, and the new mocha files run one by one with `TS_NODE_TRANSPILE_ONLY=1 npx mocha -r ts-node/register <file>`. The full `npm test` does not load on Node 25.9. Open a PR against `master` with a "Check on your iPhone" list.

Another session is building run tracking at the same time. Stay out of run files. If both touch `src/models/fullBackup.ts` or the Progress dashboard, keep your change small.

## Goal

Sharing the app takes one link. A new user adds it to the Home Screen and answers three quick questions in a chat. The app then has their program, their history, their food targets and a friend request to the person who invited them.

## 1. Invite link

- `https://lifts.paulbebear.com/app/?invite=<handle>` opened in Safari, not standalone (`navigator.standalone !== true`), shows a full-screen guide: an arrow to Safari's Share button, then "Add to Home Screen", then "Open beBEARlifts from your Home Screen".
- **iOS keeps a Safari tab's storage separate from the Home Screen app's.** Nothing can be saved in the tab for later. Check whether the manifest's `start_url` or the added page URL keeps the `?invite=` query. If it does, read it in standalone mode. If it does not, the chat asks "Who invited you? (handle, optional)".
- **In standalone mode, after sign-in:** send a friend request to the invite handle with `request_friend`. See the friends code that uses `src/utils/supabaseClient.ts`.
- **Pure module** `src/models/invite.ts`: parse and validate the handle (`^[a-z0-9_]{3,20}$`), and decide whether to show the guide or the chat.

## 2. First-launch chat (offline build only)

**When:** it replaces the "Choose your program" first screen for a new user with no history. Keep a "Skip, I'll pick myself" link to the old screen.

**Steps:**

1. **Sign in** with the email code. Reuse the logic behind `src/components/cloudBackupCard.tsx` and `src/models/cloudBackupForm.ts`. AI calls need a signed-in user (`api/_auth.mjs`).
2. **Three questions**, one per screen, each skippable, as in `llms/program_builder_prompt.md`:
   - goal and days per week
   - height, weight, age and experience
   - "Do you follow a plan? Add screenshots", taking up to 6 images, shrunk like `src/utils/imageResize.ts`
3. **The AI call:** a new Vercel function `api/ai/onboard.mjs`. Reuse `api/_ai.mjs` for the provider and `AiAuth_check` from `api/_auth.mjs`.
   - Base its system prompt on `llms/program_builder_prompt.md` and the program list in `llms/programs_guide.md`.
   - It answers with JSON only: `{"builtin": "<program id>"}`, or `{"liftoscript": "...", "historyCsv": "...", "renamed": [["their name","app name"]]}`, plus `"note"`.
   - Images go in as `image_url` parts, the way `api/food/photo.mjs` sends them. Mind Vercel's 4.5 MB body limit.
4. **Apply the answer:**
   - **A built-in id:** clone that program the way the "Choose a program" screen does.
   - **Liftoscript:** check it with `PlannerMode_commitFullText`. On an error, call the function once more with the error text. Then create the program and make it active, the way "Create New Program" does.
   - **History CSV:** import it with `ImportFromLiftosaur_convertLiftosaurCsvToHistoryRecords` through `Thunk_importCsvData`.
   - **Food profile:** fill height, weight, sex, age and goal (see `FoodLog_setProfile` and `src/components/foodTargetsCalculator.tsx`) so Food targets can be calculated in one tap.
   - **Weight:** add a weight stat.
5. **Done screen:** program name, days per week, "renamed exercises" if any, and a Start button.

**No AI available** (offline, or signed out by choice): pick a built-in program by rules from the answers. Use the "how to pick" path in `llms/programs_guide.md`, coded as a pure function with tests.

**Pure modules with tests:**

- the step machine, which returns the next state and the effects to run
- the AI answer parser, which treats the answer as untrusted JSON
- the rules picker
- the invite parser

## Out of scope (list as next steps in the PR)

- Onboarding by text message or iMessage, through Twilio or WhatsApp Business.
- The App Store route: the invite link opens the App Store page, then a Universal Link opens the installed app with the invite. See `NATIVE_PLAN.md`.

## Check on your iPhone list for the PR

- **The invite link in Safari:** open it, follow the guide, open from the Home Screen. The chat starts.
- **Skip all three questions:** a built-in program is picked and active.
- **New account with plan screenshots:** the program matches the screenshots, the renamed list makes sense, and the history shows on Home.
- **Food → targets → Calculate:** the numbers are already filled in.
