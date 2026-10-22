# Handoff: badge coin art

Branch `handoff-badge-art`. Recommended Codex reasoning: medium. Most of the work is image generation.

Batch B2 (#83) added 23 badges. Each one is drawn today as a honey coin with an emoji in the middle (`src/components/badgeCoin.tsx`). Each badge in `src/models/bearBadges.ts` has an optional `image` path that replaces the emoji when set. This batch makes the art and sets the paths.

## Part 1: generate the art

Read `src/models/bearBadges.ts` first. It lists all 23 badges with their ids, names, descriptions and emoji:

- 7 achievement badges: First PR, Bear week, Out of hibernation, Honey hunter, Early bear, Night bear, 100 workouts.
- 5 streak badges: 3, 7, 14, 30 and 100 days.
- 11 level badges: Teen, Amateur, Rookie, Regular, Strong, Athlete, Power, Titan, Astronaut, Lunar, Mars.

Style for all 23:
- A round gold-and-honey medal seen straight on, with a thick raised rim and a soft bevel. The same medal shape and lighting on every badge, so the grid reads as one set.
- One simple symbol in the middle, readable at 48 px. Use the badge's idea, not text. For example a flame for the streaks, a bear head growing in size for the level badges, a sunrise for Early bear, a moon for Night bear, a honey jar for Honey hunter.
- Streak badges get more ornate with length: 3 plain, 7 with a small laurel, 14 with a ribbon, 30 with gems, 100 with a crown.
- Level badges follow the level's world: bedroom to garage to pro gym for levels 2 to 9, then space, the moon and Mars for 10, 11 and 12.
- The bear style matches the mascot art in `/Users/paulbebear/Documents/Codex/2026-10-22/i-w/outputs/bebear-assets/` (`bear_level_05.png` for the face).
- No text, letters or numbers on the medal, because the app writes the name under it.
- Transparent background PNG, 512 × 512, the medal filling about 90% of the square, clean edges.

Render 3 first (First PR, the 7-day streak, the Rookie level badge), check they read at 48 px, then render the rest. Make one review sheet with all 23 on a 6 × 4 grid with labels (labels on the sheet only).

## Part 2: add them to the app

- Convert each PNG to WebP with `cwebp -q 85 -resize 256 256` into `images/badges/<badge id>.webp`. Each file should be under 25 KB.
- In `src/models/bearBadges.ts`, set `image` to `/images/badges/<badge id>.webp` for every badge. Keep `emoji` as the fallback.
- Native: if `src/components/badgeCoin.tsx` loads images through a bundled map like `src/utils/bearImage.native.ts`, add the 23 `require` lines the same way. If it uses a plain URI, say so in the PR body.
- The unlocked sheet and the share card (`src/components/badgeUnlockedSheet.tsx`, `src/components/shareCards/badgeCard.tsx`) should show the art when `image` is set. Check that the share card export waits for the image, like the workout cards do (`src/models/shareCardExport.ts`).
- Update `test/bearBadges.test.ts` so it checks that every badge has an `image` under `/images/badges/`.

## Files

- new `images/badges/*.webp`
- `src/models/bearBadges.ts`, `test/bearBadges.test.ts`
- `src/components/badgeCoin.tsx`, `src/components/badgeUnlockedSheet.tsx`, `src/components/shareCards/badgeCard.tsx`, only if they need a change to show the image
- a native image map file, only if one is needed

## Order

It can run now. A Claude session is running review batch K (code health) and touches many model files, but not these. Before you open the PR, rebase onto the latest `origin/master`. If a file conflicts, keep batch K's change and redo yours on top.

## Check on your iPhone list for the PR

- My bear → Workouts this week → the streak screen. The badge grid shows the medals, with locked ones grey.
- Earn a badge, or open one you have. The unlocked sheet shows the medal large.
- Share your badge. The saved image has the medal.

## Rules

- Start your work branch from `origin/master`. Do not build on this handoff branch, and do not add this file to your PR.
- Read `AGENTS.md` first and follow it. Its prose and comment rules apply to code, copy, commits and the PR body.
- Logic goes in pure modules with mocha tests. A `.tsx` file only renders and runs effects.
- No AI attribution lines in commits.
- No iOS Simulator and no browser testing. The owner tests on their iPhone.
- Touch only the files listed under Files. If you need another file, stop and say so in the PR body.
- Verify with `npx tsc --noEmit` and with eslint on each changed file. Run each test file on its own with `TS_NODE_TRANSPILE_ONLY=1 npx mocha -r ts-node/register test/<name>.test.ts`. In a fresh checkout, first copy `localdomain.js` and `src/generated/` from `/Users/paulbebear/Code/GitHub/beBEARlifts`, run `npm run build:programs`, and run `npm install` if `@callstack/liquid-glass` is missing. The full `npm test` does not load on this Mac (Node 25), and `test/api.test.ts` always fails here. Both are expected.
- The owner has authorized you to push your branch and open the PR against `master`.
- Open a PR against `master`. The body lists what changed, the file sizes, the test counts, and ends with a "Check on your iPhone" list.
