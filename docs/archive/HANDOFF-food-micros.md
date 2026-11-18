# Handoff: micronutrients on the food page

Position: plan only, nothing built. It has five steps, one commit each. It starts after the food page batch is merged, because step 4 draws on that page.

Run this on Sonnet (`claude-sonnet-5-5`). Never on Fable. No simulator and no browser testing. The owner tests on his iPhone.

## Why

The owner tested build 124 (9) on 2026-11-12. He wants micros on the food page. His words: "like built with science where you see the main 3 macros and you can swipe to see micros". He added: "they are logged with barcodes or logging".

Today no food in the app has a micro number. `INutrients` in `src/models/foodLog.ts` holds `calories`, `protein`, `carbs` and `fat`. `parseNutrients` drops every other field. The barcode lookup, the USDA search and the AI prompt ask for those four only.

## Owner decisions, 2026-11-12

- The list has two parts. Four core micros always show: fiber, sugar, saturated fat and salt. Every EU food label prints them. The owner then asked: "why not have all micros possible to be seen in barcodes like potassium and vitamins?" So 18 more show when a food has them. The table is in step 1.
- Numbers only, with no target bars. A target for sugar or salt is health advice, and the app has no source for it yet.
- Sodium is stored in milligrams and shown as salt in grams (sodium times 2.5). EU labels print salt.
- The AI estimates the four core micros only. A vitamin value guessed from a photo would be a made-up number. The owner agreed: "lets avoid any fake data".
- The micro card carries a fixed warning. The owner's words: "micros will likely underreport true value and you should take it as an estimate".

## The rule that matters most: unknown is not zero

A food with no fiber value has unknown fiber. It does not have 0 g. The owner's tester said food apps "are not precise", and a total that counts unknown as zero is wrong without showing it.

- Every micro field is optional. A source that lacks a value leaves the field out.
- The day total for a micro sums only the entries that have it.
- The micro card shows the coverage under the numbers: "From 5 of 7 foods today".
- Food logged before this build has no micro values. It counts as "no data". There is no backfill in this plan.

## Step 1: the type and the table

New module `src/models/foodMicros.ts`, tested in `test/foodMicros.test.ts`. It holds one table. Each row has a key, a label, a unit, a core flag, the Open Food Facts field and the USDA nutrient number.

```
key           unit  core  Open Food Facts   USDA
fiber         g     yes   fiber             291
sugar         g     yes   sugars            269
saturatedFat  g     yes   saturated-fat     606
sodium        mg    yes   sodium            307
potassium     mg    no    potassium         306
calcium       mg    no    calcium           301
iron          mg    no    iron              303
magnesium     mg    no    magnesium         304
zinc          mg    no    zinc              309
phosphorus    mg    no    phosphorus        305
cholesterol   mg    no    cholesterol       601
vitaminA      µg    no    vitamin-a         320
vitaminC      mg    no    vitamin-c         401
vitaminD      µg    no    vitamin-d         328
vitaminE      mg    no    vitamin-e         323
vitaminK      µg    no    vitamin-k         430
thiamin       mg    no    vitamin-b1        404
riboflavin    mg    no    vitamin-b2        405
niacin        mg    no    vitamin-pp        406
vitaminB6     mg    no    vitamin-b6        415
folate        µg    no    vitamin-b9        417
vitaminB12    µg    no    vitamin-b12       418
```

I wrote the field names and the numbers from memory. Check each one against a live response from both services before the first commit, and fix the table where it differs.

The rest is in `src/models/foodLog.ts`, tested in `test/foodLog.test.ts`.

- `INutrients` gets one optional field `micros`, a map from a table key to a number in that row's unit.
- `parseNutrients`, `FoodLog_scale` and `FoodLog_sum` loop over the table keys.
- `parseNutrients` keeps a micro only when its key is in the table and its value is a finite number of 0 or more.
- `FoodLog_scale` scales a micro that is present and leaves an absent one absent.
- `FoodLog_sum` returns a micro only when one item or more has it.
- `src/models/nutritionLabel.ts` has its own `parseNutrients`. It gets the same change, or it calls the one in `foodLog.ts`.

An old build that reads a new food log drops the micros, because its `parseNutrients` copies four fields. That happens on a cloud restore to an old build. No current user has two devices, so the plan accepts it.

## Step 2: barcode, search and label

- `src/models/openFoodFacts.ts`, in `per100g`: read every table row's field with the `_100g` and `_serving` suffixes. Open Food Facts gives every nutrient in grams. Convert to the row's unit: times 1000 for mg, times 1,000,000 for µg. When `sodium` is missing and `salt` is present, use salt divided by 2.5. The existing `macro` helper falls back to 0. The micro reader must return `undefined`.
- `src/models/usdaFoodData.ts`: read every table row's nutrient number. USDA reports each in the unit the table names.
- Label scan: `labelPrompt` in `api/food/photo.mjs` adds the four core fields to `perServing` and `per100g`, and says to leave out a field the label does not print. `INutritionLabelForm` in `src/models/nutritionLabel.ts` gets four optional text fields. `src/components/foodLabelForm.tsx` shows them under the macros. The label scan reads the core four only in this plan.
- Tests: `test/openFoodFacts.test.ts`, `test/usdaFoodData.test.ts`, `test/nutritionLabel.test.ts`. One case per source for "value present" and one for "value missing stays undefined".

## Step 3: the AI estimate

- `mealPrompt` and `describePrompt` in `api/food/photo.mjs` add `fiber`, `sugar`, `saturatedFat` and `sodiumMg` to each item of the JSON.
- The prompt tells the model to check three limits: fiber plus sugar is at most carbs, saturated fat is at most fat, and sodium is at most 40 percent of the portion's weight in salt terms.
- `FoodAddFlow_photoChoices` in `src/models/foodAddFlow.ts` maps the new fields into `micros`, with `sodiumMg` under the key `sodium`. The same three limits run in that module. A value that breaks a limit is dropped, so it becomes "no data".
- Each item gets four more numbers, so the reply grows by about a quarter. `maxTokens` is 4000 for both tasks and stays.
- Tests: `test/foodAddFlow.test.ts`.

## Step 4: the micro card and the swipe

- New module `src/models/foodMicroTotals.ts`, tested in `test/foodMicroTotals.test.ts`. `FoodMicroTotals_forDay(log, day)` returns one row per micro: the amount, the count of entries with a value, and the count of all entries that day. It also returns the display text, with salt in grams.
- The four core micros always get a row. A core micro with no data shows a dash.
- Each of the other 18 gets a row only when one entry or more has a value that day. So a day of barcode food with full labels shows a long list, and a day of AI estimates shows four rows.
- Every row carries its own coverage, for example "Potassium 410 mg · 2 of 7 foods". A potassium total from 2 of 7 foods reads as low, and the count tells the user why.
- The card ends with one fixed line, shown on every day that has an entry: "Estimate only. Many foods have no micro data, so your real totals are likely higher." The text lives in `src/models/foodMicroTotals.ts`.
- New view `src/components/foodMicrosCard.tsx`. It shows the rows in table order and scrolls inside the card past eight rows. With no entry that has data, it shows one line: "No micro data for today's food yet. Barcodes and the AI fill it in."
- The food day screen from the previous batch puts `FoodSummaryCard` and `FoodMicrosCard` in one horizontal pager with two dots under it. A swipe moves between them. The dots are tappable, so the web app works with a mouse.
- The pager's page index is view state. It holds no decision.

## Step 5: the paths that copy food

- Saved foods, saved meals and "Same as yesterday" copy nutrients from an earlier entry. Check `src/models/savedFoods.ts`, `src/models/savedMeals.ts` and `src/models/foodRepeat.ts` for parse functions that copy four fields by name, and let the micros through.
- `src/models/recipeCatalog.ts` has `printedPerServing` with `fiber`, `sugar` and `sodiumMg`. Pass them into the entry when a recipe is logged.
- Quick add in `src/components/foodQuickAddPanel.tsx` stays as it is. Its entries have no micro data.
- `src/models/fullBackup.ts` describes `food.entries` as "calories and macros per entry". Add the four micros to that text.
- `src/models/mealPost.ts` sends nutrients in feed posts. Leave the micros out of posts.

## Which module owns what

- The table of 22 micros, their units and source fields: `src/models/foodMicros.ts`.
- The `micros` map, parse, scale, sum: `src/models/foodLog.ts`.
- Barcode values: `src/models/openFoodFacts.ts`.
- Search values: `src/models/usdaFoodData.ts`.
- Label values and the label form: `src/models/nutritionLabel.ts`.
- AI values and their three limits: `src/models/foodAddFlow.ts`.
- Day totals, coverage and display text: `src/models/foodMicroTotals.ts`.

No `.tsx` file in this plan holds a decision.

## Rules for the session

- Edit and Write for file changes.
- Zero code comments by default.
- No "Co-Authored-By" line and no AI attribution in commits or in the PR.
- The PR title ends with `[skip deploy]`.
- Run `npm test`, `npm run lint` and the TypeScript check before each commit.

## Not in this plan

- AI estimates of vitamins and minerals.
- Vitamins and minerals from the label scan.
- Targets or warnings for any micro.
- Backfill of old entries from their barcodes.
- Writing micros to Apple Health.
- Editing micro values by hand in `src/components/foodEditEntry.tsx`.

## Done means

- One PR with five commits.
- A barcode scan of a product with a full label stores all four values.
- A described or photographed meal stores the values the AI gave and that passed the limits.
- The food page swipes from macros to micros and shows the coverage line.
- An entry with no data never adds 0 to a total.
- The PR body lists what was not checked on a device.

## Effort

Step 1 takes about 1 hour, most of it checking the 22 table rows against live responses. Step 2 takes about 90 minutes, and 2 hours if the label form needs layout work. Step 3 takes about 45 minutes. Step 4 takes about 1 hour, and 2 hours if the pager needs separate native and web code. Step 5 takes about 30 minutes.

Next action: confirm the food page batch is merged, then branch from `master` and start with `INutrients` in `src/models/foodLog.ts`.
