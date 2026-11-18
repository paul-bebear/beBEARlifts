# Phase 1 findings: Duplicates across all slices

Slice `duplicates` of `docs/cleanup/manifest.txt`. Read-only review of `master` at d5df8641. Reader model: Opus. An Opus checker that did not write them tried to disprove every high and medium finding.

Counts: 0 high, 2 medium, 20 low. 0 dropped by the checker.

Each finding has a code. "Seen" means the code path was read end to end or a test proved it. "Suspect" means the code points that way but nothing ran it. Effort is hours with tests.

## Medium

- **D1. The goal wizard sets a calorie deficit for teens that the food calculator blocks**
  - Severity: medium. Seen. Kind: duplicate.
  - File and line: `src/models/programGoal.ts:172-178,237-244 (ProgramGoal_dailyCalorieOffset, ProgramGoal_foodTargets); src/models/foodTargets.ts:83-85,290-321 (FoodTargets_mayDiet, FoodTargets_factor, FoodTargets_compute); src/models/goalWizard.ts:280-330 (GoalWizard_preview, GoalWizard_finish)`
  - Scenario: A 16-year-old, 60 kg, 175 cm, male, opens the goal wizard. He picks Lose fat, fast pace, with update targets on. ProgramGoal_foodTargets returns a 1850 cal target. FoodTargets_compute for the same body and aim returns 2510 cal, the maintenance. The calculator says under 18 stays at maintenance. The wizard skips that guard. A probe run confirmed both numbers.
  - Fix: Keep one calorie rule in src/models/foodTargets.ts. Make ProgramGoal_foodTargets call FoodTargets_mayDiet and clamp a negative offset to 0, setting isDeficitBlocked. Show the same note in the goal wizard result. Callers to move: GoalWizard_preview and GoalWizard_finish. Add cases to test/programGoal.test.ts.
  - Effort: 2 hours.
  - Checker: keep. ProgramGoal_foodTargets adds the negative pace offset straight to maintenance and never calls FoodTargets_mayDiet. GoalWizard_preview and GoalWizard_finish use it, so a user under 18 or with a BMI under 20 gets a deficit that FoodTargets_factor would block.
- **D2. Onboarding accepts age 13 but the food target rule rejects it, so no food goals are set**
  - Severity: medium. Seen. Kind: duplicate.
  - File and line: `src/models/onboardingAnswers.ts:68-76,98-106,118 (inRange, OnboardingAnswers_age, heightCm, OnboardingAnswers_body); src/models/foodTargets.ts:96,194-230,246 (limits, parseNumber, heightCmFrom, FoodTargets_parseBody, FoodTargets_bodyError); src/utils/onboardingCommand.ts:100-106`
  - Scenario: A 13-year-old types age 13 in onboarding. OnboardingAnswers_age accepts it, range 13 to 100. OnboardingAnswers_foodTargets calls FoodTargets_result, which needs 14 to 100, and returns undefined. onboardingCommand saves the profile with no food goals and says nothing. Later the food calculator says Enter an age from 14 to 100. The two height rules also differ: onboarding limits feet to 3-8 and inches to 0-11.99 and rounds; FoodTargets has no inch limit.
  - Fix: Keep FoodTargets_parseBody as the one body-input rule and export its limits. Make OnboardingAnswers_age and heightCm use those limits, or show the same error in onboarding. Add an age-13 case to test/onboardingAnswers.test.ts.
  - Effort: 1.5 hours.
  - Checker: keep. OnboardingAnswers_age accepts 13 to 100, but FoodTargets_parseBody needs age 14 or more. At age 13, OnboardingAnswers_foodTargets gets undefined back from FoodTargets_result, and onboardingCommand saves the profile with no food goals and shows no message.

## Low

- **D3. Body weight shows different numbers on different screens because two kg/lb rules exist**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/weight.ts:557-573 (Weight_convertTo, Anton's, rounds to 0.5 with 2.205); src/models/programGoal.ts:63,218,253-259; src/models/foodTargets.ts:89,164-169; src/models/workoutStoryCard.ts:79,221-224; src/models/bodyScans.ts:187-194; src/models/bodyScanRead.ts:11,40,61; src/models/bearBoard.ts:78,95; src/models/progressDashboard.ts:31`
  - Scenario: A user logs 176 lb and sets app units to kg. BearBoard_latestWeight and the dashboard use Weight_convertTo and show 80 kg. ProgressHub weight row uses ProgramGoal_formatWeight and shows 79.8 kg. A probe run printed 80 and 79.8 kg. Five files also keep their own kgPerLb or lbPerKg constant, as 0.45359237 or 2.20462.
  - Fix: Add one exact Weight_valueIn(weight, unit) helper and one kgPerLb constant in src/models/weight.ts. Move ProgramGoal_weightIn, foodTargets weightIn, BodyScans_massIn, bodyScanRead, workoutStoryCard to it. Use it in bearBoard.ts and progressDashboard.ts for body weight, where 0.5 rounding is wrong. Keep Weight_convertTo for lifted weights.
  - Effort: 2 hours.
  - Checker: keep. BearBoard_latestWeight and progressDashboard round body weight to 0.5 with Weight_convertTo (factor 2.205), but progressHub uses ProgramGoal_formatWeight (exact kgPerLb, 0.1 rounding), so screens differ by up to about 0.25 kg, which is a display mismatch with no data loss.
- **D4. Latest weight and logged-ago text are built three times; the dashboard copy is mostly dead**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/progressDashboard.ts:21-35,64-69,71-85 (latestWeight, ProgressDashboard_loggedAgo, ProgressDashboard_caloriesPill); src/models/progressHub.ts:61-86 (loggedAgo, weightRow); src/models/bearBoard.ts:70-79 (weightEntries, BearBoard_latestWeight); src/models/goalWizard.ts:93-105 (GoalWizard_latestLengths); src/components/screenProgressDashboard.tsx:85-107`
  - Scenario: screenProgressDashboard builds both ProgressDashboard_build and ProgressHub_build. It reads only dashboard.nutrition.daysLogged and dashboard.workouts. dashboard.weight, ProgressDashboard_caloriesPill and ProgressDashboard_loggedAgo have no caller. BearBoard drops future and non-positive weigh-ins; the other two copies do not.
  - Fix: Add Stats_latestWeight(stats, now) in a new src/models/statsLatest.ts, with BearBoard's filter. Use it in progressHub.ts, bearBoard.ts and GoalWizard_latestLengths. Delete latestWeight, caloriesStatus, ProgressDashboard_caloriesPill and ProgressDashboard_loggedAgo from progressDashboard.ts and their tests.
  - Effort: 1.5 hours.
- **D5. Decimal-comma number parsing is written twelve times with different empty and range rules**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/foodTargets.ts:194-198; src/models/nutritionLabel.ts:103-110; src/models/goalWizard.ts:145-152; src/models/onboardingAnswers.ts:68-71; src/models/bodyScanMassShare.ts:32-35; src/models/bodyScans.ts:116; src/models/recipeCatalog.ts:130-133; src/models/foodAddFlow.ts:63-66; src/models/openFoodFacts.ts:65; src/components/foodQuickAddPanel.tsx:21-24; src/components/foodSaveGroupPanel.tsx:17; Anton's src/utils/math.ts:67-78 (MathUtils_parse, MathUtils_normalizeNumStr)`
  - Scenario: Each copy does text.replace(",", ".") then Number(). Some trim and reject empty text, some rely on Number("") being 0. Only the first comma is replaced, so 1,234.5 becomes NaN everywhere. foodQuickAddPanel and foodSaveGroupPanel parse inside the view.
  - Fix: Add MathUtils_parseDecimal(text): number | undefined in src/utils/math.ts on top of MathUtils_normalizeNumStr, returning undefined for empty or non-finite text. Range checks stay with each caller. Move all twelve callers, including the two views. Test in test/math.test.ts.
  - Effort: 2 hours.
- **D6. Unknown-value guards num, str and parseNutrients are copied across 14 parsers with different rules**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `num: src/models/feed.ts:52, musicLog.ts:22, notes.ts:52, workoutPost.ts:189 (any finite); nutritionLabel.ts:32, savedFoods.ts:36, spotifyTracks.ts:26, usdaFoodData.ts:16 (finite and >= 0); openFoodFacts.ts:15, foodPhotoEstimate.ts:20. str: cloudBackup.ts:69, friends.ts:36, spotifyTracks.ts:22 (no trim); nutritionLabel.ts:36, usdaFoodData.ts:20, openFoodFacts.ts:25 (trim). nonnegative: runLog.ts:41, setClips.ts:45. parseNutrients: nutritionLabel.ts:40-52, savedFoods.ts:40-52, FoodLog_parseNutrients foodLog.ts:118-135. parseWeight: programGoal.ts:76, workoutPost.ts:221. 22 copies of the raw == null object guard in 14 files; Anton has VersionTrackerUtils_isRecord.`
  - Scenario: FoodLog_parseNutrients drops an entry with a missing protein field and keeps negative numbers. savedFoods parseNutrients keeps the food with protein 0 and drops negatives. nutritionLabel and savedFoods copies differ only in the micros source.
  - Fix: Add src/models/unknownValue.ts with UnknownValue_record, UnknownValue_finite, UnknownValue_nonNegative, UnknownValue_text and UnknownValue_trimmedText. Move the copies listed. Make one FoodLog_parseNutrients with a lenient option for saved foods and labels, and one parseWeight in src/models/weight.ts.
  - Effort: 3 hours.
- **D7. The local day key and day start are written four times**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/foodLog.ts:249-255 (pad2, FoodLog_dayKey); src/utils/healthDaily.ts:35-39,47-52 (HealthDaily_localDayStartMs, HealthDaily_dayKey); src/models/plusOffer.ts:117-121 (PlusOffer_day); src/models/localDay.ts:3-7 (LocalDay_start); Anton's src/utils/date.ts:42-56 (DateUtils_formatYYYYMMDD)`
  - Scenario: All give the same YYYY-MM-DD local key today. A change to one, such as a day-start hour for late-night meals, would leave the others behind.
  - Fix: Keep FoodLog_dayKey, or move it to src/models/localDay.ts as LocalDay_key. Make HealthDaily_dayKey and PlusOffer_day call it, and HealthDaily_localDayStartMs call LocalDay_start. Callers: src/utils/plusOfferClient.ts and the healthDaily users.
  - Effort: 0.75 hours.
- **D8. Month and weekday name lists are copied 13 times and dates print in two orders**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/season.ts:7; src/models/monthCalendar.ts:31; src/models/foodLog.ts:94-95; src/models/weekSchedule.ts:30; src/models/gymBagCheck.ts:46; src/models/dailyChecklist.ts:85; src/models/progressHub.ts:43-49 (ProgressHub_formatDate); src/models/bearText.ts:9-10,30-41 (since); src/models/bearBoard.ts:43; src/models/journalExport.ts:152-154; src/models/cloudBackup.ts:63; src/models/spotifyPlaylist.ts:12`
  - Scenario: The bear text writes 5 Nov. ProgressHub_formatDate and FoodLog_dayLabel write Nov 5 for the same kind of date. Anton's DateUtils_formatDayMonth uses the locale instead.
  - Fix: Add src/models/dayNames.ts with full and short month and weekday lists and one DayNames_monthDay(date) that writes Nov 5. Move the 12 files to it. Switch bearText since to Nov 5.
  - Effort: 1.5 hours.
- **D9. Macro summary lines round and name calories differently on each food screen**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/components/foodChoicesReview.tsx:38-41; src/components/foodBasketPanel.tsx:54-56; src/components/foodMealCard.tsx:44-51; src/components/foodAmountPanel.tsx:36-37; src/components/foodBrowsePanel.tsx:128; src/components/foodSummaryCard.tsx:176; src/models/journalExport.ts:219; src/models/foodLog.ts:506-508 (FoodLog_formatNumber)`
  - Scenario: An item with 12.5 g protein shows 13 P in the AI review and basket, and 12.5 P on the meal card. Calories read cal, Cal or kcal by screen. The journal export orders C P F; the screens order P C F.
  - Fix: Add FoodLog_macroLine(nutrients) in src/models/foodLog.ts using FoodLog_formatNumber and one calorie word. Move the seven callers. Test in test/foodLog.test.ts.
  - Effort: 1 hours.
- **D10. The grams row and macro form grid are built three and two times in food views**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/components/foodChoicesReview.tsx:17-59; src/components/foodServingPanel.tsx:32-70; src/components/foodBasketPanel.tsx:32-60; src/components/foodLabelForm.tsx:45-72; src/components/foodQuickAddPanel.tsx:14-60`
  - Scenario: Each row keeps gramsText state, commits through FoodAddFlow_parseGrams on blur, and keeps bad text on screen. A fix to one row, such as resetting bad text, will miss the other two.
  - Fix: Extract a FoodGramsInput component into src/components/foodUi.tsx and use it in the three rows. Extract a FoodMacroFields grid used by foodLabelForm and foodQuickAddPanel.
  - Effort: 1.5 hours.
- **D11. Share cards copy the photo background, stat and equivalent blocks, and the export wiring**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/components/runShareCard.tsx:34-120,169-174,239-265; src/components/shareCards/photoCard.tsx:24-109; src/components/workoutStoryCard.tsx:108-114,163-191; src/components/badgeUnlockedSheet.tsx:87-99`
  - Scenario: RunStoryCard and PhotoCard repeat the full-bleed photo, two scrims, Stat and the emoji equivalent block with small size changes. Three sheets repeat pickPhoto with the same alert and the ShareCardExportSurface block.
  - Fix: Add ShareCardPhotoBackground, ShareCardStat and ShareCardEquivalent to src/components/shareCards/cardParts.tsx. Add a useShareCardPhoto hook for pickPhoto. Move runShareCard, photoCard, workoutStoryCard and badgeUnlockedSheet.
  - Effort: 2 hours.
- **D12. Four client functions each call our API with their own timeout and error reading**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/utils/foodApi.ts:27-58 (request, readResponse); src/utils/aiRequest.ts:19-69 (AiRequest_post); src/utils/cloudBackupClient.ts:166-186 (CloudBackupClient_deleteAccount); src/utils/accountPlanClient.ts:33-58 (AccountPlanClient_sync); src/models/accountDeletion.ts:21`
  - Scenario: foodApi and AiRequest_post abort after 15 s and 60 s. Account delete and billing sync have no timeout and hang as long as fetch does. The body.error or The server returned N text is built four times.
  - Fix: Add ApiRequest_send(path, init, timeoutMs) in src/utils/apiUrl.ts that returns ok with status and body, or an offline or timeout error. Move the four callers to it. Keep each caller's own message mapping.
  - Effort: 2 hours.
- **D13. The No connection text and the Supabase origin are copied as literals and compared by value**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/utils/supabaseClient.ts:14,37; src/utils/cloudBackupClient.ts:178; src/utils/feedClient.ts:38; src/models/invite.ts:128; src/models/oauthFlow.ts:111; src/components/feedShareToggle.tsx:78; src/utils/offlineOnly.ts:8; api/_auth.mjs:5`
  - Scenario: oauthFlow and feedShareToggle compare an error to the literal No connection. If supabaseClient changes its text, the share toggle starts showing the offline error and sign-in shows the wrong message. offlineOnly.ts repeats the Supabase origin.
  - Fix: Export Supabase_offline from src/utils/supabaseClient.ts and use it in the six client places. Import Supabase_origin into src/utils/offlineOnly.ts. api/_auth.mjs keeps its own copy because the server cannot import src.
  - Effort: 0.5 hours.
- **D14. Two server routes read the user from a token with different rules**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `api/account/delete.mjs:19-21,38-52 (AccountDelete_userId); api/_billing.mjs:39-44 (Billing_userFromAuth); api/billing/sync.mjs:16-31`
  - Scenario: Both fetch /auth/v1/user with the same headers. Billing_userFromAuth rejects anonymous users, checks the uuid shape and lowercases. AccountDelete_userId accepts any non-empty id. A 200 answer for an anonymous user is a 401 in sync and allowed in delete.
  - Fix: Add Auth_userFromToken(request, timeoutMs) to api/_auth.mjs that returns the user id or a json error. Decide one rule for anonymous users. Move delete.mjs and sync.mjs to it. Test in the existing api tests.
  - Effort: 1 hours.
- **D15. The AI routes repeat body parsing, clean() and the auth and chat call**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `api/ai/warmup.mjs:21-54; api/ai/report.mjs:17-28; api/food/photo.mjs:99-129`
  - Scenario: Each POST parses JSON with its own error text, trims fields with its own clean(), then calls aiProvider, AiAuth_check and aiChat in the same order. A new route has to copy the order by hand.
  - Fix: Add AiRoute_readJson(request, errorText) and AiRoute_clean(value, max) to api/_ai.mjs. Move the three routes to them.
  - Effort: 1 hours.
- **D16. Views repeat the AI consent and sign-in checks that AiRequest_post already makes**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/components/foodAiPanel.tsx:37-51; src/components/foodLabelPanel.tsx:31-41; src/utils/aiRequest.ts:24-33`
  - Scenario: FoodAiPanel and the web FoodLabelPanel call AiConsent_ensure and SupabaseClient_accessToken, then call FoodApi, which checks both again. On a failed token the web label panel shows the raw Not signed in. AiRequest_post shows AiRequest_signInMessage.
  - Fix: Delete the checks in both views and let AiRequest_post own them. Keep only the label panel's tap-time AiConsent_ensure("tap") call, which iPhone Safari needs.
  - Effort: 0.75 hours.
- **D17. Lift and run equivalents copy the pick-by-seed rule**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/liftEquivalents.ts:75-102 (wrap, LiftEquivalents_pick); src/models/runEquivalents.ts:36-53 (wrap, RunEquivalents_pick)`
  - Scenario: Both wrap the seed, pick a thing and a phrase, and build the same text. LiftEquivalents sorts candidates by name hash so shuffles change kind; RunEquivalents does not.
  - Fix: Export LiftEquivalents_fromCandidates(candidates, total, unitSize, seed) from liftEquivalents.ts. Make RunEquivalents_pick call it. Decide whether runs use the name-hash order too.
  - Effort: 0.75 hours.
- **D18. One-decimal rounding, clamp and plural words are rewritten next to Anton's helpers**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `round1 or oneDecimal: src/models/foodAddFlow.ts:101, foodPhotoEstimate.ts:29, openFoodFacts.ts:55, foodLog.ts:296, savedMeals.ts:27, workoutReport.ts:145, bearBoard.ts:46, bodyScanMassShare.ts:28. clamp: src/models/houseArrange.ts:68. Plural ternaries: bearBoard.ts:86, foodMicroTotals.ts:50, workoutPost.ts:127,157, journalDay.ts:261, onboardingHistory.ts:38, dailyChecklist.ts:160, progressHub.ts:123, workoutStoryCard.ts:108, homeToday.ts:14, exerciseOrderFatigue.ts:116, gymBagCheck.ts:121, screenSleepNutrition.tsx:161. Anton's src/utils/math.ts:25,46 and src/utils/string.ts:10`
  - Scenario: Eight files define Math.round(n * 10) / 10 under two names. houseArrange clamp equals MathUtils_clamp. Thirteen places write count === 1 ? word : words instead of StringUtils_pluralize.
  - Fix: Add MathUtils_round1 to src/utils/math.ts and move the eight copies. Use MathUtils_clamp in houseArrange.ts. Use StringUtils_pluralize in the thirteen places.
  - Effort: 1 hours.
- **D19. Local id makers and random bytes are copied**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/utils/foodLogStore.ts:19-21 (FoodLogStore_newId); src/utils/notesStore.ts:6-8 (NotesStore_newId); src/utils/randomBytes.ts:5-19 (RandomBytes_get); src/utils/spotifyLoginPlatform.native.ts:20-22 (randomBytes)`
  - Scenario: The two newId functions are the same line. spotifyLoginPlatform.native keeps a Math.random byte maker that RandomBytes_get already provides, with the Web Crypto path first.
  - Fix: Add LocalId_new() in a new src/utils/localId.ts and point both stores at it. Make spotifyLoginPlatform.native.ts call RandomBytes_get.
  - Effort: 0.5 hours.
- **D20. useBearBreathing copies the reduce-motion listener from useReduceMotion**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/utils/useBearBreathing.ts:6-28; src/utils/useReduceMotion.ts:4-27`
  - Scenario: Both subscribe to reduceMotionChanged and race isReduceMotionEnabled with the same changed flag. useBearBreathing starts at true and useReduceMotion at false.
  - Fix: Add an initial value parameter to useReduceMotion and call it from useBearBreathing with true. Delete the copied effect.
  - Effort: 0.5 hours.
- **D21. An old photo-to-entries rule survives next to the basket rule**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/models/foodAddFlow.ts:164-181 (FoodAddFlow_entriesFromPhoto); src/models/foodBasket.ts:75-104 (FoodBasket_entries, FoodBasket_fromChoices); test/foodAddFlow.test.ts:203-215`
  - Scenario: Only tests call FoodAddFlow_entriesFromPhoto. The app turns photo choices into entries through FoodBasket_fromChoices then FoodBasket_entries. The old copy ignores isAmountSuspect.
  - Fix: Delete FoodAddFlow_entriesFromPhoto and its tests. Move any missing case to test/foodBasket.test.ts.
  - Effort: 0.5 hours.
- **D22. Two web photo pickers differ in how they attach the file input**
  - Severity: low. Suspect. Kind: duplicate.
  - File and line: `src/utils/foodMealPhoto.ts:5-36 (FoodMealPhoto_pick); src/utils/progressPhotoPick.ts:4-21 (pickFile, ProgressPhotoPick_pick)`
  - Scenario: FoodMealPhoto_pick adds the input to document.body and removes it after. pickFile clicks a detached input and never cleans up. Share cards and progress photos use pickFile on web. iPhone Safari may drop change events from a detached input; nothing has run this.
  - Fix: Extract WebFilePick_image(capture) from FoodMealPhoto_pick into src/utils/webFilePick.ts. Call it from both pickers with environment and user capture.
  - Effort: 0.75 hours.

## Findings from the 26 October audit

- H3: fixed. ReportsHub_actionEffect is in src/models/reportsHub.ts:141 and tested in test/reportsHub.test.ts. screenReportsHub.tsx open only applies the effect. src/components/bearScene.tsx is gone; the breathing effect moved to src/utils/useBearBreathing.ts, which copies useReduceMotion (reported as a new finding).

## Checked with no finding

- SQL migrations: ai_usage_take() is dropped in 20261027000000_ai_allowance_limits.sql, redeem_pro_code(text) is dropped before recreate. No two live functions remain.
- supabase/tests/*.sql repeat pg_temp assert helpers; each file runs alone, so the copies are expected.
- Platform pairs (.native/.web) for onboardingChat, rulerPicker, onboardingQuestions, bodyScanPhoto, backupReminderMarks, progressPhotoFiles, foodBarcodeScanner bodies must differ.
- JsonStore_create is the one store wrapper; all bebear_ stores use it.
- SupabaseClient_call, SupabaseClient_authed and SupabaseClient_readJson are the one Supabase fetch path; feedClient, friendsClient, cloudBackupClient use them.
- FoodLog_sum is the only nutrient sum.
- CollectionUtils_compact drops 0 and empty strings, so runLog compact is right to differ.
- fullBackup.ts IFullBackup and IFullBackupParts repeat the store list by type; low value, not reported.
- Command runners in friendsCommand, inviteClient, cloudBackupCommand, onboardingCommand share a 6-line try/emit; too small to merge.
- Icon files iconFood, iconFoodUi, iconRoute share only imports and props.
