# Handoff B1a: bear core rules, no UI

Branch `handoff-b1a-bear-core`. Recommended Codex reasoning: high. These rules decide what every user sees, and the anti-cheat caps guard the feed.

B1 in `REDESIGN_PLAN.md` is split in two. B1a is the pure rules, the store and the backup. B1b, later, draws the bear on My bear, Home, the finish screen and the Journal. B1a draws nothing and touches no `.tsx` file.

Read "The bear" in `REDESIGN_PLAN.md` on `master`: Stats, Growth and the anti-cheat rules, Fullness, Energy, Mood. Build those as written, with the three changes below. The owner decided the changes after the plan, and the generated art follows them.

## Change 1: 12 levels, not 10 species tiers

Replace the 6 tiers in `src/models/bearTier.ts` with these 12 levels. The kg is lifetime counted kg from `BearGrowth`.

- 01 Cub: 0
- 02 Teen: 2,000
- 03 Amateur: 10,000
- 04 Rookie: 25,000
- 05 Regular: 50,000
- 06 Strong: 100,000
- 07 Athlete: 175,000
- 08 Power: 300,000
- 09 Titan: 420,000
- 10 Astronaut: 549,000
- 11 Lunar: 2,970,000
- 12 Mars: 5,000,000

Each level also carries a comparison line for the countdown, for example "more than a car" at Teen. Use these: Teen "more than a car", Amateur "a T. rex", Rookie "2 school buses", Regular "an empty Boeing 737", Strong "a Space Shuttle", Athlete "a blue whale", Power "2 blue whales", Titan "the ISS", Astronaut "a Falcon 9", Lunar "a Saturn V", Mars "a full Starship". Cub has none.

- Levels never go down. A level reached stays reached.
- Keep `BearTier_for` and the `IBearTierProgress` shape (`tier`, `next`, `kgToNext`, `fraction`, `isTierUp`), so callers keep working. Add a `level` number from 1 to 12 to `IBearTier`.
- Level 12 has no `next`. The countdown then shows lifetime kg only.
- The level list is data. Adding a 13th level must be one new entry and one new image, with no other code change.
- The species names (Sun bear, Black bear, Grizzly, Polar, Kodiak) go away from the level list. They become skins in a later batch. Do not build skins.
- `src/models/workoutStoryCard.ts` uses the tiers. Update it and `test/workoutStoryCard.test.ts` to the new levels.

## Change 2: three art moods plus normal

The art has three moods: hungry, tired and pumped. Map the plan's moods to them.

- `pumped`: a counted workout finished in the last 2 hours, or that workout set a personal record. This mood is new.
- `tired`: the plan's "lazy", energy under 40.
- `hungry`: fullness under 20.
- `normal`: the plan's "happy" and "ok". The art shows the plain level sprite.

Priority order: pumped, then tired, then hungry, then normal. Keep `fullness` and `energy` as numbers in `Bear_state`, because My bear draws them as bars.

## Change 3: a male and a female line

The bear has a line, `"male"` or `"female"`, stored in `bebear_bear`. The default is `"male"`. B1b adds the picker.

## The art lookup

New pure `src/models/bearArt.ts` turns the bear state into image paths. Batch R5 copies the files to these exact paths, so tests check strings only.

- `BearArt_sprite(line, level, mood)`:
  - `normal` → `/images/bear/<line>/level-NN.webp`, two-digit level.
  - Any other mood → `/images/bear/<line>/mood-<size>-<mood>.webp`. Size by level: 1 to 3 `small`, 4 to 6 `medium`, 7 to 9 `big`, 10 to 12 `space`.
- `BearArt_gym(level)` → `/images/bear/gyms/<name>.webp`. Name by level: 1 to 3 `bedroom`, 4 to 6 `garage`, 7 to 9 `pro`, 10 `spaceship`, 11 `moon`, 12 `mars`.
- `BearArt_scale(fraction)`: 0.85 at the start of a level, 1.0 at the end, as the plan says.

The size bands and gym bands are data next to the level list, so a 13th level adds one entry.

## The store and the backup

- New `src/utils/bearStore.ts` through `JsonStore_create`, key `bebear_bear`, with a parse function and an empty value in a pure model. Fields: `line`, `celebratedLevel` (the highest level whose level-up was shown), `seenBadges` (string ids). Unknown or broken input parses to the empty value.
- Add `bebear_bear` to the full backup in `src/models/fullBackup.ts`, the same way the other `bebear_*` stores are included. A restore on a new phone must bring back the line and the celebrated level, so a reinstall does not replay old level-ups.

## Inputs

`Bear_state(sources, now)` in new `src/models/bear.ts` takes plain data the app already stores: history records, the food log (`src/models/foodLog.ts`), `storage.stats` for bodyweight, the current program's planned days a week, and `now`. It reads no store and calls no clock. The plan's anti-cheat rules live in new `src/models/bearGrowth.ts`. If no `History_workoutTime` helper exists, compute the workout time from the record's start and end in `bearGrowth.ts`.

Return at least: `level` (the `IBearTierProgress`), `countedKg`, `fullness`, `energy`, `mood`, `lastCountedWorkoutAt`.

## Tests

Mocha tests for every rule, with fixed dates and no real clock:

- `test/bearTier.test.ts`: each threshold, one kg below and at it, level 12 with no next, levels never drop.
- `test/bearGrowth.test.ts`: the 10-minute rule, the 1.3 times best cap, the first-time 2 times bodyweight cap and the 120 kg fallback, 0 kg bodyweight sets, the per-minute and 25,000 kg caps (the plan's 12-minute, 40,000 kg example gives 2,400 kg), one counted workout a day, an imported history in date order.
- `test/bear.test.ts`: fullness fade and the 25 percent post-workout speed-up, energy grace on a 3-day program and with no program, each mood and the priority order.
- `test/bearArt.test.ts`: a sprite path per size band and per mood, both lines, every gym band.
- `test/fullBackup.test.ts`: `bebear_bear` round-trips.

## Files

- `src/models/bearTier.ts`, `test/bearTier.test.ts`
- `src/models/workoutStoryCard.ts`, `test/workoutStoryCard.test.ts`
- new `src/models/bear.ts`, `test/bear.test.ts`
- new `src/models/bearGrowth.ts`, `test/bearGrowth.test.ts`
- new `src/models/bearArt.ts`, `test/bearArt.test.ts`
- new `src/models/bearStoreData.ts` (the parse and empty value), new `src/utils/bearStore.ts`
- `src/models/fullBackup.ts`, `test/fullBackup.test.ts`

## Order

It can run now, beside R2 (running), R5, S1 and the first-use tips batch. None of them touches these files. B1b, B2, B3 and B4 build on this module later.

## Check on your iPhone list for the PR

B1a has no screen. The list has one item: share a workout story card and check the level name on it reads like "Level 3 · Amateur", not a species.

## Rules

- Start your work branch from `origin/master`. Do not build on this handoff branch, and do not add this file to your PR.
- Read `AGENTS.md` first and follow it. Its prose and comment rules apply to code, copy, commits and the PR body.
- Logic goes in pure modules with mocha tests. This batch adds no `.tsx` file.
- No AI attribution lines in commits.
- No iOS Simulator and no browser testing. The owner tests on their iPhone.
- Touch only the files listed under Files. Another batch owns every other file at the same time. If you need a file that is not listed, stop and say so in the PR body.
- Verify with `npx tsc --noEmit` and with eslint on each changed file. Run each test file on its own with `TS_NODE_TRANSPILE_ONLY=1 npx mocha -r ts-node/register test/<name>.test.ts`. Run `npm run build:programs` first if `programdata/index.json` is missing. The full `npm test` does not load on this Mac (Node 25), and `test/api.test.ts` always fails here. Both are expected.
- Open a PR against `master`. The body lists what changed, the test counts, and ends with a "Check on your iPhone" list.
