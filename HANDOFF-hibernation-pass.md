# Handoff W2: the Hibernation pass

Branch `handoff-hibernation-pass`. Recommended Codex reasoning: medium. This batch changes how the streak is counted, but adds no server code.

The rules are copied below, so this file is enough to build from. The same rules sit under "The Hibernation pass" in `REDESIGN_PLAN.md`, in PR #109 until it merges.

Read `src/models/dailyChecklist.ts`, `src/models/bearHoney.ts`, `src/models/bearStoreData.ts`, `src/utils/useBear.ts`, `src/utils/useBearBadges.ts`, `src/utils/useBearHoney.ts`, and their tests `test/dailyChecklist.test.ts` and `test/bearHoney.test.ts`.

## Goal

A missed day no longer breaks a streak when the user holds a pass. The bear sleeps through the day (hibernates), and the streak keeps going. Passes cost honey only, never money.

## The rules

- A pass costs 25 honey. A user holds at most 2.
- The user never taps to use a pass. On app open, the app settles missed days.
- Today is still open until midnight, so today is never a missed day.
- Missed days are the days after the last streak day and before today.
- When the user holds at least as many passes as there are missed days, each missed day becomes a covered day, and one pass is spent per day.
- When there are more missed days than passes, nothing is spent and the streak breaks.
- A pass is spent only when the streak that ended on the last streak day is 3 days or more.
- A covered day counts as a streak day everywhere: `DailyChecklist_streak`, the streak badges, the share card, the Journal, and the 7-day honey bonus run.
- A covered day earns no honey of its own.
- A workout or meal logged later for a covered day keeps the day. The pass stays spent.

## What to build

- New pure `src/models/hibernationPass.ts`:
  - Constants: price 25, hold limit 2, minimum streak 3.
  - `HibernationPass_settle(store, doneDays, today)` returns `{ store, covered: string[] }`. `doneDays` is the set from `DailyChecklist_doneDays` without covered days. The function adds the store's `coveredDays` itself. When it covers days, it lowers `passes`, appends the days to `coveredDays`, and sets `pendingWake` to `{ days, streak }`, where `streak` is the streak including the covered days. Running it twice in a row returns the same store the second time.
  - `HibernationPass_buy(store, balance)` returns `{ store }` with `passes + 1` and `spent + 25`, or `{ store, refusal }` unchanged. The refusal is "full" when the user holds 2, or "honey" when the balance is under 25.
  - `HibernationPass_wakeText(pendingWake, passesLeft)` returns the sheet text below.
  - Day keys come from `FoodLog_dayKey` and `FoodLog_shiftDay`, as in `dailyChecklist.ts`.
- `src/models/bearStoreData.ts`: add `passes: number` (0 to 2), `coveredDays: string[]` (`YYYY-MM-DD`, sorted, at most 400, the same limit as `maxCheckIns` in `dailyChecklist.ts`) and `pendingWake?: { days: string[]; streak: number }`. Parse each with the same guards as `spent`. A bad field falls back to its empty value and keeps the rest of the store. Clamp `passes` above 2 down to 2. Drop day keys that do not match the pattern.
- `src/models/dailyChecklist.ts`: `IStreakSources` gains optional `coveredDays?: readonly string[]`. `DailyChecklist_doneDays` adds them to the set.
- `src/models/bearHoney.ts`: `IHoneySources` gains optional `coveredDays`. They go into the `DailyChecklist_doneDays` call that builds the 7-day bonus run. A covered day with no other activity earns nothing, except the streak bonus when the run reaches a multiple of 7 on that day.
- `src/utils/useBear.ts`: settle once the food log and the bear store are both loaded, in the same effect style as the existing `BearCelebration_seed` call. Settling before the food log loads would see food days as missed and spend a pass by mistake. Run it through `BearStore.update`, so two mounts cannot spend twice.
- `src/utils/useBearBadges.ts` and `src/utils/useBearHoney.ts`: pass `store.coveredDays` into `DailyChecklist_doneDays` and `IHoneySources`. `useBearBadges` also returns `coveredDays` as a set for the Streak calendar.
- `src/components/screenJournal.tsx` and `src/components/workoutStoryCard.tsx`: pass covered days into their `DailyChecklist_doneDays` calls. The Journal shows a "Hibernated" chip on a covered day.
- `src/components/screenStreak.tsx`:
  - Covered days show on the calendar in a light blue circle instead of honey.
  - Under the badge grid, a "Hibernation passes" row: "1 of 2", and one line: "Miss a day and your bear sleeps through it. Works on streaks of 3 days or more."
  - A "Buy a pass · 25 honey" button. When refused, it is disabled with "You hold 2, the most." or "You need 25 honey. You have 12."
- New `src/components/hibernationWakeSheet.tsx`, mounted from `src/components/programHistory.tsx` (Home). It shows when `pendingWake` is set, and its button clears `pendingWake`. Text:
  - One day: title "Your bear hibernated", body "It slept through yesterday, so your 12-day streak is safe. 1 pass left."
  - Two days: body "It slept through 2 days, so your 12-day streak is safe. 0 passes left."
  - Button: "Good morning".
- Until the sleeping bear art exists, the sheet shows `BearAvatar` in the tired mood. Name the 5 missing stills in the PR body: one sleeping bear per body stage.

## Tests

- New `test/hibernationPass.test.ts`:
  - no streak days: nothing changes
  - no missed days: nothing changes
  - 1 missed day with 1 pass: covered, 0 passes, `pendingWake` set
  - 2 missed days with 1 pass: nothing spent
  - a 2-day streak with 1 missed day: nothing spent
  - today empty: not a missed day
  - a second settle returns the same store
  - covered days make `DailyChecklist_streak` count through the gap
  - buy succeeds, then refuses at 2 held, and refuses under 25 honey
  - the wake text for 1 and 2 days
- New `test/bearStoreData.test.ts`: parse keeps good fields, drops bad day keys, clamps `passes`, and reads an old store without the new fields.
- `test/dailyChecklist.test.ts`: covered days join the done set.
- `test/bearHoney.test.ts`: a covered day earns nothing, and a run of 6 done days plus 1 covered day pays the 7-day bonus.

## Files

- new `src/models/hibernationPass.ts`, new `test/hibernationPass.test.ts`
- `src/models/bearStoreData.ts`, new `test/bearStoreData.test.ts`
- `src/models/dailyChecklist.ts`, `test/dailyChecklist.test.ts`
- `src/models/bearHoney.ts`, `test/bearHoney.test.ts`
- `src/utils/useBear.ts`, `src/utils/useBearBadges.ts`, `src/utils/useBearHoney.ts`
- `src/components/screenStreak.tsx`, new `src/components/hibernationWakeSheet.tsx`, `src/components/programHistory.tsx`
- `src/components/screenJournal.tsx`, `src/components/workoutStoryCard.tsx`

## Check on your iPhone list for the PR

- Streak screen: the passes row shows "0 of 2". With 25 honey or more, Buy works, the honey balance drops by 25, and the row shows "1 of 2".
- Build a 3-day streak, skip one day, open the app the day after. The wake sheet shows once. The streak count kept going. The Streak calendar shows the skipped day in light blue.
- Skip two days while holding one pass. No pass is spent, and the streak starts again.

## Rules

- Start your work branch from `origin/master`. Do not build on this handoff branch, and do not add this file to your PR.
- Read `AGENTS.md` first and follow it. Its prose and comment rules apply to code, copy, commits and the PR body.
- Logic goes in pure modules with mocha tests. A `.tsx` file only renders and runs effects.
- No AI attribution lines in commits.
- No iOS Simulator and no browser testing. The owner tests on their iPhone.
- Touch only the files listed under Files. Another batch owns every other file at the same time. If you need a file that is not listed, stop and say so in the PR body.
- Verify with `npx tsc --noEmit` and with eslint on each changed file. Run each test file on its own with `TS_NODE_TRANSPILE_ONLY=1 npx mocha -r ts-node/register test/<name>.test.ts`. Run `npm run build:programs` first if `programdata/index.json` is missing. The full `npm test` does not load on this Mac (Node 25), and `test/api.test.ts` always fails here. Both are expected.
- Open a PR against `master`. The body lists what changed, the test counts, and ends with a "Check on your iPhone" list.
