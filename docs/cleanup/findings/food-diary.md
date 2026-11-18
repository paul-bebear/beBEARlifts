# Phase 1 findings: Food: the diary and targets

Slice `food-diary` of `docs/cleanup/manifest.txt`. Read-only review of `master` at d5df8641. Reader model: Sonnet. An Opus checker that did not write them tried to disprove every high and medium finding.

Counts: 0 high, 3 medium, 11 low. 0 dropped by the checker.
Coverage: 64 paths opened. Every manifest file in this slice was opened.

Each finding has a code. "Seen" means the code path was read end to end or a test proved it. "Suspect" means the code points that way but nothing ran it. Effort is hours with tests.

## Medium

- **G1. Food log import accepts any JSON file and can wipe the whole food log**
  - Severity: medium. Seen. Kind: data.
  - File and line: `src/components/foodGoalsContent.tsx:45-61, src/models/foodLog.ts:189-211`
  - Scenario: On web the user taps Import and picks the Export everything file, or any other JSON object. FoodLog_parse returns an empty log with no error. The dialog says 'Replace your food log with 0 foods'. The user confirms. FoodLogStore_replace erases entries, saved meals, recipes, goals and profile.
  - Fix: Add FoodLog_parseImport in foodLog.ts. It returns undefined unless version is 1 and entries is an array. Refuse a file with no entries and no meals or recipes. Keep the decision out of onImport. Test it.
  - Effort: 1.5 hours.
  - Checker: keep. FoodLog_parse returns an empty log for any object without entries, onImport only shows a '0 foods' confirm, and FoodLogStore_replace then overwrites meals, recipes, goals and profile; this is web-only and needs the user to confirm.
- **G2. Calculator saves the season profile before the user saves the targets**
  - Severity: medium. Seen. Kind: bug.
  - File and line: `src/components/foodGoalsContent.tsx:36-40`
  - Scenario: The user opens Calculate my targets, turns on Follow the seasons, taps Use these numbers, then closes the sheet without Save targets. onFill already wrote profile.seasons and lastSeason for the current season. Goals stay old. SeasonNudge_for sees lastSeason equal to the season and shows no change card until the next season. The update promise is also not awaited or caught.
  - Fix: Keep the new profile in view state. Write profile and goals together in the Save targets handler with one FoodLogStore_update. Put the combined step in a model function such as FoodGoals_apply and test it.
  - Effort: 1.5 hours.
  - Checker: keep. onFill calls FoodLogStore_update with FoodLog_setProfile without await or catch, and the profile carries lastSeason from FoodTargets line 378, so leaving without Save targets keeps the old goals while seasonChange returns undefined for the rest of the season.
- **G3. Saved foods without a barcode overwrite each other when only the brand differs**
  - Severity: medium. Seen. Kind: data.
  - File and line: `src/models/savedFoods.ts:17-23`
  - Scenario: The user saves 'Greek yogurt' from brand A (a search result with no barcode). Later they save 'Greek yogurt' from brand B. SavedFoods_save matches on name only, so brand A is deleted. FoodLog_recentKey in foodLog.ts uses name plus brand, so the two rules disagree.
  - Fix: In SavedFoods_save compare name and brand, lower case, when neither product has a barcode. Add a test with two brands.
  - Effort: 0.5 hours.
  - Checker: keep. SavedFoods_save matches products with no barcode on lowercased name only, so a second brand with the same name replaces the first, while FoodLog_recentKey uses name plus brand.

## Low

- **G4. Three different rules pick the meal from the clock**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/foodLog.ts:283-294, src/models/foodMealForTime.ts:7-16, src/models/seasonNudge.ts:135`
  - Scenario: FoodLog_mealForHour gives lunch to 15:30, snacks to 02:00 and snacks to 23:30. FoodMealForTime_pick gives snacks to 15:30, breakfast to 02:00 and dinner to 23:30. The hungry-bear one-tap food and the Journal Add button therefore choose different meals for the same time.
  - Fix: Keep FoodMealForTime_pick. Change SeasonNudge_entry to call it. Delete FoodLog_mealForHour and its test. Decide once whether 00:00 to 04:00 means breakfast or snacks.
  - Effort: 0.75 hours.
- **G5. Calories bar shows 'over' when only macro targets are set**
  - Severity: low. Seen. Kind: bug.
  - File and line: `src/models/foodLog.ts:495-500, src/components/foodSummaryCard.tsx:108-123`
  - Scenario: The user sets protein, carbs and fat targets and leaves calories at 0 to 0. FoodLog_hasGoals is true. FoodLog_progress returns isOver true for any food, because consumed is above max 0. The calorie bar turns red and Remaining mode adds 'over'.
  - Fix: In FoodLog_progress set isOver to false when range.max is 0. Add a test.
  - Effort: 0.25 hours.
- **G6. An 18-year-old gets different calories from the calculator and the season card**
  - Severity: low. Seen. Kind: bug.
  - File and line: `src/models/seasonNudge.ts:76-82, src/models/foodTargets.ts:298-305`
  - Scenario: The user enters age 18 in the calculator with seasons on. FoodTargets_compute treats them as an adult (bulk x1.15, lean deficit allowed). In the next season SeasonNudge seasonTargets uses age minus 1, so it applies the under-18 rules (bulk x1.1, lean stays at maintenance). The new target jumps for no stated reason.
  - Fix: Store the birth year and month, or apply the same age rule in both places. Put the rule in one FoodTargets function that both call.
  - Effort: 1.5 hours.
- **G7. Three exported functions are used only by tests**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/models/foodLog.ts:470-479, src/models/foodMicros.ts:69-75`
  - Scenario: FoodLog_copyDay, FoodMicros_row and FoodMicros_isKey have no caller in src, api, lambda or scripts. FoodRepeat_copy replaced FoodLog_copyDay.
  - Fix: Delete the three functions and the test cases that cover only them.
  - Effort: 0.25 hours.
- **G8. Food page builds totals, meals and isToday that its screen never reads**
  - Severity: low. Seen. Kind: waste.
  - File and line: `src/models/foodDayPage.ts:37-50, src/components/screenFoodDay.tsx:65`
  - Scenario: ScreenFoodDay reads only label, previousDay, nextDay and micros from FoodDayPage_build. Every render also runs FoodLog_dayTotals and FoodDayPage_meals over the whole entries list. JournalMeals then repeats both calls.
  - Fix: Make FoodDayPage_build return only the fields the screen reads. Move day totals and meals to the caller that renders them. Update test/foodDayPage.test.ts.
  - Effort: 0.75 hours.
- **G9. FoodRepeat_groups repeats FoodDayPage_meals**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/foodRepeat.ts:44-48, src/models/foodDayPage.ts:31-35`
  - Scenario: Both build the four meals from FoodLog_entriesFor and drop empty ones. FoodDayPage_meals with includesEmpty false gives the same result.
  - Fix: Make FoodRepeat_groups call FoodDayPage_meals(log, day, false), or move the function into foodLog.ts.
  - Effort: 0.25 hours.
- **G10. Rounding helpers and nutrient parsers are written two or three times**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/foodLog.ts:114-134,296-302, src/models/savedFoods.ts:36-52, src/models/savedMeals.ts:27-49, src/models/foodMicros.ts:96-98`
  - Scenario: round3 exists in foodLog.ts and foodMicros.ts. round1 exists in foodLog.ts and savedMeals.ts. savedMeals.ts roundMicros repeats mapMicros. FoodLog_parseNutrients needs all four numbers and allows negatives. savedFoods.ts parseNutrients needs only calories and rejects negatives. One shape, two rules.
  - Fix: Export round1 and round3 from foodMicros.ts or a small numbers module. Reuse mapMicros. Pick one nutrient parse rule and test it.
  - Effort: 1 hours.
- **G11. savedMeals.ts holds the Recipes_ functions**
  - Severity: low. Seen. Kind: name.
  - File and line: `src/models/savedMeals.ts:18-64`
  - Scenario: Recipes_fromBasket, Recipes_perServing and Recipes_servingPick live in savedMeals.ts. A reader looking for recipe maths opens the wrong file. recipeCatalog.ts and screenFoodAdd.tsx import them from there.
  - Fix: Move the Recipes_ functions to src/models/recipes.ts and fix the imports. Move their tests.
  - Effort: 0.5 hours.
- **G12. Repeat list says 'yesterday' when it copies into another day**
  - Severity: low. Seen. Kind: name.
  - File and line: `src/components/foodRepeatList.tsx:47-48, src/models/foodRepeat.ts:19-20,63`
  - Scenario: After the X4 fix the list copies into the day shown. If the user is on 20 October, the list shows 19 October but still reads 'Same as yesterday' and 'Nothing logged yesterday'. When the fallback weekday is shown, the title is still 'Yesterday'.
  - Fix: Title the list 'Copy from another day' and show the source day label from FoodLog_dayLabel. Change FoodRepeat_offer to 'Nothing on the day before. Show Monday?'.
  - Effort: 0.5 hours.
- **G13. Photo fallback chain and pill text are decided inside .tsx files**
  - Severity: low. Seen. Kind: view-logic.
  - File and line: `src/components/recipePhoto.tsx:28-56, src/components/foodSummaryCard.tsx:173-176`
  - Scenario: RecipePhoto decides cache URI, remote retry and placeholder in onError and onLoad. FoodSummaryCard builds the pill text with rounding and locale grouping. Neither has a test. scripts/lint-views.ts did not flag them because each is under 20 lines.
  - Fix: Move the image source steps to a function in imageCache.ts that returns the next state. Add FoodLog_pillText in foodLog.ts. Test both.
  - Effort: 1 hours.
- **G14. Recipe check texts and the late-night choice have no test**
  - Severity: low. Seen. Kind: test.
  - File and line: `src/models/recipeCatalogData.ts:93,143,204,280,334, src/utils/lateNightMealChoice.ts:4-16`
  - Scenario: Each nutritionCheck string holds typed estimate numbers. test/recipeCatalog.test.ts only looks for the word 'Unresolved'. If an ingredient changes, the text shows old numbers beside new ones. LateNightMealChoice_pick has no test for the no-question case or a cancelled dialog.
  - Fix: In recipeCatalog.test.ts assert each nutritionCheck contains the rounded calories and protein from RecipeCatalog_perServing. Add a test for LateNightMealChoice_pick with a stubbed Dialog_choice.
  - Effort: 1 hours.

## Findings from the 26 October audit

- X4: fixed. FoodRepeatList takes props.day and FoodRepeat_initial(into) copies to that day (src/components/foodRepeatList.tsx:21-23, src/models/foodRepeat.ts:19-20,82). foodScanCamera.tsx:65 passes the shown day. Fixed in 952da80e. test/foodRepeat.test.ts 'copies into the day the Calendar shows' passes. Only the 'yesterday' wording is left, listed as a name finding.
- H1 (progressDashboard goals): fixed. caloriesStatus in src/models/progressDashboard.ts:36-40 returns none when FoodLog_hasGoals is false or max is 0. Fixed in 50a2e63f. test/progressDashboard.test.ts passes 10 of 10. FoodLog_progress still sets isOver when max is 0, listed as a bug.

## Checked with no finding

- FoodTargets_next/back/pick flow with seasons on and off: steps skip goal correctly and back works after toggling seasons.
- Season_for, Season_lastDay and Season_summary agree for north and south, including year wrap.
- FoodLog_shiftDay and dayToDate use noon, so daylight saving does not shift the day key.
- FoodMicroTotals sodium-to-salt display (x2.5, g) matches FoodMicros table units.
- RecipeCatalog data: estimates match the typed nutritionCheck numbers (ran scripts/checkRecipeCatalog.ts). All 5 recipes pass tests; photo files exist.
- RecipeRecommendations filters treat unknown tags as not safe; allergen and diet tags on all five recipes look consistent with their ingredients.
- scripts/lint-views.ts reports 0 warnings for all 16 .tsx files in the slice.
- All 15 mocha test files for the slice pass under Node (food*, lateNightMeal, recipe*, savedFoods, season*).
- FoodEditEntry hook order is safe (useFoodLog runs before the early return). FoodSummaryCard hooks run before its conditional return.
- FoodLog_parse sanitises imported JSON; no code execution or injection path found in the import.
- ScreenFoodDay is reachable (bearHouse bowl and thunks foodDay route); IconFood used by plusSheet and screenProgressDashboard.
- FoodRepeat_copy and FoodLog_setGrams keep micros and scale them correctly.
