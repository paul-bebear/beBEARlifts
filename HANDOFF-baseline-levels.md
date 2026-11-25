# Handoff: piece L, the level retune

You are the Sonnet build session for the level retune in `BASELINE_WEEK_PLAN.md`. Read its "The level retune" section before the first edit, then `CLAUDE.md` for the repo rules. This piece is fully specified. Make no design calls; where the plan is silent, ask in the PR body.

## What you build

One branch, one PR titled "Retune the bear's level thresholds [skip deploy]". Do not merge it. 3 hours.

- `src/models/bearTier.ts`: the `maleMinKg` values become 0, 2000, 12000, 36000, 80000, 175000, 460000, 820000, 1250000, 3100000, 5000000, 7000000. Names, ids, sizes, gyms, `femaleShare` and `femaleStepKg` do not change.
- `test/bearTier.test.ts`: `maleThresholds` becomes the list above. `femaleThresholds` becomes 0, 1000, 7000, 22000, 48000, 105000, 276000, 492000, 750000, 1860000, 3000000, 4200000. Every other assertion stays.
- `src/models/bearText.ts`: `BearText_levelUp` returns a third field, `milestone`, one line per level from this list, by level number. 2: "Your first pump." 3: "Ten days in. Every lift has your own number now." 4: "Week 3. The bar starts to feel lighter." 5: "Six weeks in. This is when the mirror starts to agree." 6: "Three months. Friends notice before you do." 7: "Six months. Time for a bigger shirt." 8: "Nine months. Most of your lifts have doubled." 9: "One year. The beginner year is done." 10: "Year two. Half as much again, and it shows." 11: "Year three. A lifter, not a beginner." 12: "Year four. You lifted your way to Mars." Level 1 has no milestone and the field is undefined.
- `test/bearText.test.ts`: one case per level checks the milestone text, and level 1 checks undefined.
- The level-up card that calls `BearText_levelUp` shows `milestone` under the subtitle when it is defined. Find the caller with `grep -rn BearText_levelUp src`. Add the one `Text` line and nothing else.
- `test/bearComparison.test.ts` may fail, because `BearComparison_for` reads the thresholds. Move the expected names to the new numbers; do not change `bearComparison.ts`.
- `BEAR_WORLD_PLAN.md`: under the sentence that starts "Every pace below assumes", add one line: "The thresholds were retuned on 2026-10-27 in `BASELINE_WEEK_PLAN.md`; the weeks named in this file follow the old table." Run `npx ts-node scripts/lint-docs.ts BEAR_WORLD_PLAN.md` after.

## What you do not touch

`celebratedLevel` in `bearStoreData.ts` already keeps every bear at its reached level when a threshold rises. Do not add a migration or a one-off. Do not change `bearGrowth.ts`, the counting rules, honey, badges or the share cards. Do not edit the memory file in the owner's project memory folder; say in the PR body that `bear-game-rules.md` there needs the new table.

## Done means

- `npm run onetest test/bearTier.test.ts`, `test/bearText.test.ts` and `test/bearComparison.test.ts` pass, then `npm test` and `npm run lint` are green.
- The PR body lists the eleven numbers that changed, old to new, and a phone checklist of two items: open the house and read the Level line on the whiteboard, and finish a workout that crosses a threshold and read the milestone on the level-up card.

## Conventions

- No simulator or browser testing. The owner tests on the iPhone from the checklist.
- Change files with the Edit and Write tools, never a shell rewrite.
- Zero comments unless the code cannot carry the fact. Commit messages name what the user sees. No AI attribution lines.
