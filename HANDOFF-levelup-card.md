# Handoff: the level-up card with celebration art

Branch `handoff-levelup-card`. Recommended Codex reasoning: medium.

When a workout crosses a bear level, the finish screen shows a plain level-up card (`src/components/bearFinishBanner.tsx`, rules in `src/models/bearCelebration.ts`). Codex generated one celebration picture per level for each bear: the bear cheering in its level's gym, with honey confetti. This batch puts that art on the finish screen and adds a level-up share card.

Read first: `AGENTS.md`, `src/components/bearFinishBanner.tsx`, `src/models/bearCelebration.ts`, `src/models/bearTier.ts`, `src/models/bearText.ts`, the share card files under `src/components/shareCards/` (`workoutSharePage.tsx`, `shareCardPager.tsx`, `rankCard.tsx`), `src/models/workoutStoryCard.ts` and `src/models/shareCardExport.ts`.

## Part 1: import the art

Source: `/Users/paulbebear/Documents/Codex/2026-10-22/make-the-level-up-celebration-art/outputs/bebear-levelup/`. 22 PNGs, 1024 × 1536, with full backgrounds (not transparent), named `levelup_<m|f>_NN.png` for levels 02 to 12. Skip the review sheets.

- Convert each with `cwebp -q 75 -resize 768 1152` to `images/bear/<male|female>/levelup-NN.webp`. Each should land under 140 KB. Put the commands in the PR body.
- New pure module `src/models/bearLevelUpArt.ts`: the image path for a line and a level, `undefined` for level 1. Test both lines, levels 1, 2 and 12.
- Native: do not edit `src/utils/bearImage.native.ts`, because the outfit shop batch edits it at the same time. Add a new `src/utils/levelUpImage.ts` and `levelUpImage.native.ts` with their own `require` map and URI function, following `bearImage.native.ts`.

## Part 2: the finish screen

- When the workout crossed a level, the level-up card shows the picture full width as its background. The top third of each picture is kept calm for text: "Level up!", the new level's name ("Level 4 · Rookie"), and the comparison line from `bearText.ts`.
- Keep the card's existing behaviour: it shows once, and saving `celebratedLevel` stays as it is.
- The text must stay readable on every picture: add a soft dark gradient behind it, top to transparent.

## Part 3: the level-up share card

- When this workout crossed a level, the share pager's first card is a new `src/components/shareCards/levelUpCard.tsx`: the picture full-bleed, "Level up!" and the level name in the top third, and the beBEAR logo row at the bottom like the other cards. The other cards follow as now.
- Add it to the page list in `src/models/workoutStoryCard.ts`, and add its image to the export image list, so the export waits for it (`shareCardExport.ts`, `WorkoutStoryCard_exportImages`).
- A workout that crossed no level shows the pager exactly as now.

## Files

- new `images/bear/<line>/levelup-*.webp`
- new `src/models/bearLevelUpArt.ts`, `test/bearLevelUpArt.test.ts`
- new `src/utils/levelUpImage.ts`, `src/utils/levelUpImage.native.ts`
- `src/components/bearFinishBanner.tsx`
- new `src/components/shareCards/levelUpCard.tsx`, `src/components/shareCards/workoutSharePage.tsx`, `src/components/shareCards/shareCardPager.tsx`
- `src/models/workoutStoryCard.ts`, `test/workoutStoryCard.test.ts`, `src/models/shareCardExport.ts`, `test/shareCardExport.test.ts`

## Order

It can run now, beside the outfit shop handoff (`handoff-outfit-shop`), which owns `bearArt.ts`, `bearImage.native.ts`, `bearScene`, the honey sheet and the bear store. Do not touch those. Before you open the PR, rebase onto the latest `origin/master`. If a file conflicts, keep both sides' lines.

## Check on your iPhone list for the PR

- Finish a workout that crosses a level. The finish screen shows the celebration picture with "Level up!" and the new level, and the text is readable.
- Open the share cards. The first card is the level-up card with the picture. Save it to Photos: the saved image has the picture.
- Finish a workout that crosses no level. The finish screen and the share cards look as before.

## Rules

- Start your work branch from `origin/master`. Do not build on this handoff branch, and do not add this file to your PR.
- Read `AGENTS.md` first and follow it. Its prose and comment rules apply to code, copy, commits and the PR body.
- Logic goes in pure modules with mocha tests. A `.tsx` file only renders and runs effects.
- No AI attribution lines in commits.
- No iOS Simulator and no browser testing. The owner tests on their iPhone.
- Touch only the files listed under Files. If you need another file, stop and say so in the PR body.
- Verify with `npx tsc --noEmit` and with eslint on each changed file. Run each test file on its own with `TS_NODE_TRANSPILE_ONLY=1 npx mocha -r ts-node/register test/<name>.test.ts`. In a fresh checkout, first copy `localdomain.js` and `src/generated/` from `/Users/paulbebear/Code/GitHub/beBEARlifts`, run `npm run build:programs`, and run `npm install` if `@callstack/liquid-glass` is missing. The full `npm test` does not load on this Mac (Node 25), and `test/api.test.ts` always fails here. Both are expected.
- Deploys: Vercel builds previews only for branches named `preview/*`, so your branch push does not deploy. Do not push to `preview/*` unless asked.
- The owner has authorized you to push your branch and open the PR against `master`.
- Open a PR against `master`. The body lists what changed, the image sizes, the test counts, and ends with a "Check on your iPhone" list.
