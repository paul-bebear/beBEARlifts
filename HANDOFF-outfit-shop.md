# Handoff B4b: the outfit shop

Branch `handoff-outfit-shop`. Recommended Codex reasoning: high. It spends the user's honey and changes the bear store, which is in every backup.

B4a (#85) built honey earning and the balance, and its honey sheet says "The shop opens soon". The owner replaced the plan's small accessories with full outfits, and the art is done. This batch builds the shop: the user buys outfits with honey, and the bear wears the one they pick.

Read first: `AGENTS.md`, then "Honey and accessories" in `REDESIGN_PLAN.md` (the outfits replace the accessory list and slots), `src/models/bearHoney.ts`, `src/models/bearStoreData.ts`, `src/utils/bearStore.ts`, `src/models/bearArt.ts`, `src/models/bearScene.ts`, `src/components/honeySheet.tsx`, `src/components/bearScene.tsx`, `src/components/bearAvatar.tsx`, `src/utils/bearImage.native.ts`, `src/models/workoutPost.ts`, `src/components/bearTv.tsx`.

## Part 1: import the outfit art

Source: `/Users/paulbebear/Documents/Codex/2026-10-22/make-the-starter-wardrobe-for-the/outputs/bebear-wardrobe/`. 24 transparent PNGs, 1024 × 1536, named `wardrobe_<m|f>_<stage>_<outfit>.png`, plus `asset_manifest.json`. Skip the review sheets and `wardrobe_peak_body_check.png`.

- Convert each with `cwebp -q 80 -resize 512 768` to `images/bear/<male|female>/outfit-<stage>-<outfit>.webp`. Stages: teen, mid, fit, peak. Outfits: gym, fitted, baggy. Each should land under 80 KB.
- Copy the manifest to `images/bear/wardrobe-manifest.json`.
- My bear sizes each sprite from its visible box (`bearScene.ts`, PR #88). Add the visible boxes of the 24 outfit sprites the same way the level and mood sprites have them, with a test that keeps them in sync with the files.
- Native: add the 24 `require` lines to `src/utils/bearImage.native.ts`, in alphabetical order.

## Part 2: the rules

New pure module `src/models/bearShop.ts`, with tests in `test/bearShop.test.ts`.

- Three outfits: gym 25 honey, fitted 40, baggy 60. Keep the prices in one data list, so the owner can change them in one place.
- Buying an outfit unlocks it at every body stage, for good.
- The stage comes from the level: teen for levels 2 and 3, mid for 4 and 5, fit for 6 and 7, peak for 8 and 9. The cub (level 1) and the space levels (10 to 12) have no outfits, so the bear shows its level art there, and the shop says "Outfits unlock at level 2" or "Space suits only up here".
- "Level look" is always owned and free. It is the level art, and it is the default.
- `BearShop_buy(state, outfitId, balance)` refuses when the balance is too low or the outfit is already owned. Otherwise it returns the next state with `spent` raised by the price and the outfit owned. `BearShop_equip(state, outfitId)` equips an owned outfit or the level look.
- Store: add `owned: string[]` and `equipped?: string` to `IBearStoreData`. Old stores and old backups parse with nothing owned and nothing equipped. The full backup and restore keep both, with a round-trip test.
- What the bear wears: with an outfit equipped and the mood `normal`, the sprite is the outfit at the current stage. Any other mood shows the mood art, because the outfits exist only in the standing pose. Put this in `bearArt.ts` as one function with a test, for example `BearArt_wornSprite(line, level, mood, equipped)`.

## Part 3: honey from shares must not drop

B4a counts 1 honey per shared meal or workout from the feed cache (`BearHoney_sharedAt`), which keeps only 50 posts per kind. Once spending is real, honey from old shares must not disappear when the cache rolls over. Record each own shared post (id and day) in the bear store when it is posted, and count from that record joined with the cache. Old shares already in the cache get recorded on the first run. Test that the balance never drops when old posts leave the cache.

## Part 4: the screens

- The honey sheet (`honeySheet.tsx`) becomes the shop. On top: the balance and today's breakdown, as now. Below: four cards, the level look and the three outfits, each showing the bear at the user's current stage in that outfit, the price, and one button: Buy, Wear, or Wearing.
- My bear's scene (`bearScene.tsx`) and Home's bear head (`bearAvatar.tsx`) use the worn sprite.
- Workout posts: `IWorkoutPostSummary` version 2 left room for `equipped`. Fill it with the equipped outfit id. The TV (`bearTv.tsx`) and the feed rows show a friend's bear in that outfit when the post has one.
- Share cards keep the lifting pose. They do not change in this batch.
- Views only render. Every decision is in a pure module with a test.

## Files

- new `images/bear/<line>/outfit-*.webp` and `images/bear/wardrobe-manifest.json`
- `src/utils/bearImage.native.ts`
- new `src/models/bearShop.ts`, `test/bearShop.test.ts`
- `src/models/bearArt.ts`, `test/bearArt.test.ts`
- `src/models/bearScene.ts`, `test/bearScene.test.ts`, `src/components/bearScene.tsx`, `src/components/bearAvatar.tsx`
- `src/models/bearStoreData.ts`, `src/models/fullBackup.ts`, `src/utils/fullBackupFile.ts`, `test/fullBackup.test.ts`, `test/cloudBackupThunks.test.ts`
- `src/models/bearHoney.ts`, `test/bearHoney.test.ts`, `src/utils/useBearHoney.ts`
- `src/components/honeySheet.tsx`, and new shop components
- `src/models/workoutPost.ts`, `test/workoutPost.test.ts`, `src/components/bearTv.tsx`, `src/components/friendsFeed.tsx`
- the place where a meal or workout post is published, only to record the shared post. Name it in the PR body.

## Order

It can run now, beside the level-up card handoff (`handoff-levelup-card`), which owns `bearFinishBanner.tsx`, the share cards and its own image map, and does not touch these files. PR #99 (badge medals) also adds lines to `src/utils/bearImage.native.ts` and will merge in the same batch. Before you open the PR, rebase onto the latest `origin/master`. If a file conflicts, keep both sides' lines.

## Check on your iPhone list for the PR

- Open My bear and tap the honey count. The shop shows the balance, the level look and three outfits at your stage, with prices.
- With enough honey, buy one. The balance drops by the price, and the button turns to Wear. Tap Wear: the bear on My bear and on Home wears it.
- Without enough honey, the Buy button is disabled and says how much more you need.
- Back up, restore on another device or after reinstalling. The outfit is still owned and worn.
- Share a workout. A friend's TV shows your bear in the outfit.

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
- Open a PR against `master`. The body lists what changed, the prices, the image sizes, the test counts, and ends with a "Check on your iPhone" list.
