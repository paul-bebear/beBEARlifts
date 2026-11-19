# Phase 1 findings: Food: adding food

Slice `food-add` of `docs/cleanup/manifest.txt`. Read-only review of `master` at d5df8641. Reader model: Sonnet. An Opus checker that did not write them tried to disprove every high and medium finding.

Counts: 0 high, 4 medium, 17 low. 0 dropped by the checker.
Coverage: 65 paths opened. Every manifest file in this slice was opened.

Each finding has a code. "Seen" means the code path was read end to end or a test proved it. "Suspect" means the code points that way but nothing ran it. Effort is hours with tests.

## Medium

- **F1. Food lookup routes answer anyone with no rate limit**
  - Severity: medium. Seen. Kind: security. Still open from the 26 October audit: P7 S4.
  - File and line: `api/food/search.mjs:3-18, api/food/barcode.mjs:3-24, api/food/usda.mjs:16-44`
  - Scenario: A script calls /api/food/search or /barcode in a loop with no token. Each call goes to Open Food Facts with the fork's User-Agent. Open Food Facts can block that User-Agent for every user. vercel.json has no rate rule.
  - Fix: Add a Vercel Firewall rate limit per IP for /api/food/search, /barcode and /usda. Or require the Supabase token as photo.mjs does.
  - Effort: 0.5 hours.
  - Checker: keep. search.mjs, barcode.mjs and usda.mjs read no auth header and vercel.json has no rate rule, so any caller can loop them under the fork's Open Food Facts User-Agent; a Firewall rule set only on the dashboard cannot be seen from code.
- **F2. USDA barcode fallback still runs on the shared demo key**
  - Severity: medium. Suspect. Kind: bug. Still open from the 26 October audit: P3.
  - File and line: `api/food/usda.mjs:3-4`
  - Scenario: FDC_API_KEY is not set in Vercel, so the code uses DEMO_KEY (about 30 requests an hour per IP). After that, US barcodes missing from Open Food Facts fail. I could not read the Vercel env from here.
  - Fix: Set FDC_API_KEY in Vercel production (copy data_gov), then check with one lookup. Fail loudly in the log when the key is missing.
  - Effort: 0.1 hours.
  - Checker: suspect. usda.mjs falls back to DEMO_KEY when FDC_API_KEY is missing, and REVIEW-2026-10-26.md says `vercel env ls` showed only `data_gov`, but the current Vercel env cannot be read from the repo.
- **F3. A USDA failure shows as 'not in Open Food Facts or USDA'**
  - Severity: medium. Seen. Kind: bug.
  - File and line: `src/utils/foodApi.ts:60-83, src/components/screenFoodAdd.tsx:85`
  - Scenario: Open Food Facts answers 'not found'. The USDA call returns 429, 502 or a timeout. FoodApi_lookupBarcode returns ok with value undefined, because openFoodFacts.ok is true. The screen says the barcode is in neither database.
  - Fix: When USDA fails and Open Food Facts had no product, return the USDA error. NotFound then shows 'try again' rather than a false 'not in USDA'. Add a test in test/foodApi.test.ts.
  - Effort: 1 hours.
  - Checker: keep. In FoodApi_lookupBarcode, `fromUsda != null || openFoodFacts.ok` returns ok with an undefined value when USDA errors after an Open Food Facts not-found, so NotFound gets no error and shows the 'not in Open Food Facts or USDA' text.
- **F4. A slow AI answer can attach to a different photo**
  - Severity: medium. Seen. Kind: bug.
  - File and line: `src/models/foodAiEstimate.ts:60-84, src/components/foodAiPanel.tsx:37-54`
  - Scenario: The user taps Send, then Remove photo or picks another photo while isSending is true. The old answer arrives and 'estimated' sets choices from the old plate. Add then passes the new photo with the old numbers, and the photo can be shared to friends.
  - Fix: Give each send a request id in IFoodAiState. Ignore 'estimated' and 'failed' when the id no longer matches. Clear isSending in photoRemoved and picked. Add reducer tests.
  - Effort: 1.5 hours.
  - Checker: keep. Remove photo and the Take/Choose photo buttons stay active while isSending, the reducer has no request id, and 'estimated' writes the old answer's choices over the new photo, which onAdd then receives.

## Low

- **F5. Consent text says photos 'are not kept' but zero data retention is not on**
  - Severity: low. Suspect. Kind: security. Still open from the 26 October audit: P5.
  - File and line: `src/models/aiConsent.ts:8, api/food/photo.mjs:121-138`
  - Scenario: The consent text names Anthropic and says photos are not kept. The project plan defers zero data retention until revenue. If it is off, the provider's own retention applies, and a teenager's body-scale printout is covered by the promise.
  - Fix: Either turn on per-request zeroDataRetention in api/_ai.mjs, or reword the consent text to match the provider's real retention. Check the Vercel dashboard first.
  - Effort: 0.5 hours.
- **F6. Items you unticked are gone after Back from Serving size**
  - Severity: low. Seen. Kind: bug.
  - File and line: `src/components/foodChoicesReview.tsx:89, src/components/foodAiPanel.tsx:131-134, src/models/foodScanSteps.ts:184`
  - Scenario: The AI finds rice, chicken and sauce. The user unticks sauce and taps Add, then Back. onAdd got only the selected items, so resume holds two items and the sauce row is lost. The note is lost too.
  - Fix: Pass the full choices list to onAdd and let the reducer pick the selected ones. Keep the note in IScanResume.
  - Effort: 1 hours.
- **F7. Saving a food from a label has no guard and no error path**
  - Severity: low. Seen. Kind: bug.
  - File and line: `src/components/screenFoodAdd.tsx:343-349, src/components/foodLabelPanel.tsx:54-64`
  - Scenario: Save is tapped twice quickly, or the write fails. onSave is async but typed as void, so the panel ignores it. A failed FoodLogStore_update ends as an unhandled rejection and the screen does not move. A double tap opens the amount step twice.
  - Fix: Run the label save through FoodSaveGuard_run like logBasket does. Make onSave return Promise<void> and await it in the panel.
  - Effort: 0.5 hours.
- **F8. A failed meal share after Add is silent**
  - Severity: low. Seen. Kind: bug.
  - File and line: `src/components/screenFoodAdd.tsx:203-207`
  - Scenario: Add succeeds and the screen closes. FeedClient_shareMeal then throws (the feed store write fails). Nothing awaits or catches it, so the user believes the meal was shared.
  - Fix: Catch the error in logServing. Queue the share before goBack, or show one notice.
  - Effort: 0.5 hours.
- **F9. The app accepts GIF photos but the server refuses them**
  - Severity: low. Seen. Kind: bug.
  - File and line: `src/models/foodCapture.ts:49, api/food/photo.mjs:112`
  - Scenario: On iPhone the library picker returns an image/gif. FoodCapture_photo accepts it. photo.mjs allows only jpeg, png and webp and answers 'The image must be a base64 data URL'.
  - Fix: Remove gif from the regex in FoodCapture_photo so the app says 'Choose a JPEG or PNG photo' before sending.
  - Effort: 0.2 hours.
- **F10. The Quick add camera mode and quickEntered event cannot be reached**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/models/foodScanSteps.ts:14,52,108,198-199, src/components/foodScanCamera.tsx:26,76, src/components/screenFoodAdd.tsx:246`
  - Scenario: FoodScanSteps_modes returns only barcode and ai. FoodScanSteps_initial sends 'quick' to the quick step, not the camera. No caller sends modePicked with quick. So FoodScanCamera's quick branch, onQuick, quickEntered and the quick serving mode never run. One test checks the title only.
  - Fix: Remove 'quick' from IScanMode, the quickEntered event, the camera quick branch, the onQuick prop and the modeLabels entry. Update test/foodScanSteps.test.ts.
  - Effort: 1 hours.
- **F11. FoodAddFlow_entriesFromPhoto is only called by its test**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/models/foodAddFlow.ts:164-182, test/foodAddFlow.test.ts`
  - Scenario: The AI flow now logs through FoodBasket_entries and FoodScanSteps_entries. Nothing in src calls FoodAddFlow_entriesFromPhoto.
  - Fix: Delete the function and its test.
  - Effort: 0.2 hours.
- **F12. IconCopyDay is never used**
  - Severity: low. Seen. Kind: dead.
  - File and line: `src/components/icons/iconFoodUi.tsx:37-43`
  - Scenario: grep finds IconCopyDay only at its definition.
  - Fix: Delete IconCopyDay.
  - Effort: 0.1 hours.
- **F13. The barcode rule is written in five places**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `api/food/barcode.mjs:5, api/food/usda.mjs:6-8,18, src/models/openFoodFacts.ts:181-183, src/models/usdaFoodData.ts:24-26`
  - Scenario: The 8 to 14 digit regex is in barcode.mjs, usda.mjs and OpenFoodFacts_isBarcode. barcodeKey (strip leading zeros) is in usda.mjs and usdaFoodData.ts. A change to one (for example UPC-E expansion) leaves the others stale.
  - Fix: Put isBarcode and barcodeKey in api/_food.mjs for the server. Keep one copy in the client. Add one shared test table run against both.
  - Effort: 1 hours.
- **F14. Grams field and number parsing are copied three times with different rules**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/components/foodChoicesReview.tsx:15-22, src/components/foodBasketPanel.tsx:37-44, src/components/foodServingPanel.tsx:37-44, src/components/foodQuickAddPanel.tsx:21-24, src/models/nutritionLabel.ts:103-110,149`
  - Scenario: ChoiceRow, BasketRow and ItemRow hold the same text state and commit-on-blur code. FoodAddFlow_parseGrams, NutritionLabel parseNumber and FoodQuickAddPanel toNumber differ: quick add turns '12abc' into 0 silently, and the 5000 g limit is in two places.
  - Fix: Add one FoodGramsField component. Move one parse function with a stated rule into a model with a test. Use it in all four places.
  - Effort: 2 hours.
- **F15. Consent and sign-in are checked twice for each AI request**
  - Severity: low. Seen. Kind: duplicate.
  - File and line: `src/components/foodAiPanel.tsx:43-51, src/components/foodLabelPanel.tsx:32-39, src/utils/aiRequest.ts:19-31`
  - Scenario: The panel calls AiConsent_ensure and SupabaseClient_accessToken. FoodApi then calls AiRequest_post, which does both again plus AiConsentStore.load. Each AI send reads the token and consent two to three times.
  - Fix: Let AiRequest_post return a typed reason (consent, signedOut). The panels dispatch from that and drop their own checks.
  - Effort: 1.5 hours.
- **F16. Web label panel holds the read sequence that native keeps in a model; baseline entry is stale**
  - Severity: low. Seen. Kind: view-logic.
  - File and line: `src/components/foodLabelPanel.tsx:30-52, scripts/lint-views-baseline.json:86-88`
  - Scenario: onFile (23 lines) runs consent, token, resize, read and state in order. Native uses FoodLabel_reduce and FoodCapture_label for the same job. The baseline lists foodPhotoPanel.tsx onFile, a file that no longer exists, and has no entry for foodLabelPanel.tsx.
  - Fix: Use FoodCapture_label with web deps (resize in readLabel) and FoodLabel_reduce in the web panel. Delete the foodPhotoPanel.tsx baseline entry.
  - Effort: 2 hours.
- **F17. screenFoodAdd.tsx holds basket, save-group and log-then-share rules**
  - Severity: low. Seen. Kind: view-logic.
  - File and line: `src/components/screenFoodAdd.tsx:119-214,264-297,310-322,352-373`
  - Scenario: saveGroup, logServing (save, goBack, then share) and onBarcode run the sequence in the view. The basket useState is edited inline with put, toggle, remove and putAll in nine handlers. Two refs drive the guards. None of it has a model test at screen level.
  - Fix: Move the basket into a reducer module (for example foodBasketFlow.ts) with events and a test. Move the save-and-share order into one function that returns the next step.
  - Effort: 3 hours.
- **F18. Suggestions and day totals are rebuilt on every render of the add screen**
  - Severity: low. Seen. Kind: waste.
  - File and line: `src/components/screenFoodAdd.tsx:267,292`
  - Scenario: FoodSuggestions_forMeal loops over every logged entry. FoodLog_dayTotals reads the log again. Both run on each render of the browse step, including each basket tick, with Date.now() as an input.
  - Fix: Wrap both in useMemo keyed on log, meal and day. Round now to the day.
  - Effort: 0.5 hours.
- **F19. The food API routes and the web photo picker have no tests**
  - Severity: low. Seen. Kind: test.
  - File and line: `api/food/barcode.mjs, api/food/search.mjs, api/food/usda.mjs, src/utils/foodMealPhoto.ts, test/foodBasket.test.ts`
  - Scenario: No test imports barcode, search or usda. The USDA zero-padding, the gtin match and the 429 path are unchecked. FoodSuggestions_forMeal is tested inside foodBasket.test.ts, under the wrong name. Existing food model tests pass (147).
  - Fix: Add test/foodRoutes.test.ts with a stubbed fetch for the three routes. Move the suggestions test to test/foodSuggestions.test.ts.
  - Effort: 2 hours.
- **F20. Names say 'photo' for text estimates, and FoodCapture_ functions live in a utils file**
  - Severity: low. Seen. Kind: name.
  - File and line: `src/models/foodPhotoEstimate.ts, src/models/foodAddFlow.ts:16,117, src/utils/foodCaptureRequest.ts:22-60, src/components/foodBrowsePanel.tsx:30, src/models/foodScanSteps.ts:45`
  - Scenario: IFoodPhotoEstimate, IFoodPhotoChoice and FoodAddFlow_photoChoices also carry Describe results. foodCaptureRequest.ts exports FoodCapture_pick, _mealPhoto and _label, which share the prefix of models/foodCapture.ts. IFoodTile and IScanTile are the same union twice.
  - Fix: Rename to IFoodAiEstimate and IFoodAiChoice. Rename the prefix to FoodCaptureRequest_. Use IScanTile in foodBrowsePanel.tsx.
  - Effort: 1 hours.
- **F21. The food dev server listens on all network interfaces**
  - Severity: low. Seen. Kind: security.
  - File and line: `scripts/food-api-dev.mjs:42-49`
  - Scenario: listen(port) with no host binds every interface. On shared Wi-Fi another machine can call the food and AI routes on port 3010. The AI routes still need a token. The food routes need none.
  - Fix: Call listen(port, "127.0.0.1").
  - Effort: 0.1 hours.

## Findings from the 26 October audit

- X1: fixed. backFrom in src/models/foodScanSteps.ts:138-143 keeps resume. FoodAiEstimate_initial(resume) restores text, photo and choices. Tests in test/foodScanSteps.test.ts:168-199 and test/foodAiEstimate.test.ts:169-175. The old foodPhotoPanel and camera-launch effect are gone.
- X2: fixed. FoodSaveGuard_run in src/models/foodSaveGuard.ts resets the flag on failure. logBasket, logServing and saveGroup in screenFoodAdd.tsx:171-208 use it and call goBack only after a saved write. test/foodSaveGuard.test.ts covers it. The label save path is still unguarded (see findings).
- X3: fixed. barcodeFound and barcodeMissed carry the code and are ignored unless the step is reading for that code (foodScanSteps.ts:134-136,178-181). foodApi.ts:24-38 adds a 15 s AbortController. Tests at foodScanSteps.test.ts:127-145 and foodApi.test.ts.
- X5: fixed. foodAiPanel.tsx:56-58 and foodLabelPanel.tsx:109 show FoodAiSignIn when there is no session. The native label panel does too. The camera opens only on a tap. AiRequest_signInMessage now names the bear's home gear.
- X6: fixed. FoodMealPhoto_pick (foodMealPhoto.ts:5-35) clicks its input inside the tap, and foodLabelPanel.tsx:29,119 clicks first and checks consent and sign-in in onFile. Not run on a device.
- P3: open. api/food/usda.mjs:4 still falls back to DEMO_KEY. I could not read the Vercel env. README and FORK_ROADMAP still say to set FDC_API_KEY. The user-visible symptom changed: a 429 now reads as 'not found' (see findings).
- P5: partly fixed. src/models/aiConsent.ts:8 now names Anthropic and Vercel's AI Gateway. Zero data retention is not on in api/_ai.mjs, so 'are not kept' is unverified.
- P7 S4: open. search, barcode and usda still answer with no token and no rate limit. vercel.json has no firewall rule. Dashboard rules cannot be seen from the repo.

## Checked with no finding

- Ran 11 food mocha files (foodScanSteps, foodAddFlow, foodBasket, foodSaveGuard, foodAiEstimate, foodApi, foodCapture, nutritionLabel, openFoodFacts, usdaFoodData, foodPhotoEstimate): 147 passing.
- api/food/photo.mjs: image prefix check, size cap, text cap and AiAuth_check run in a sound order. Unknown kind falls back to meal. No injection path beyond the user's own quota.
- api/food/usda.mjs: query is digits only and the api key is URL-encoded. Only gtin-matching foods are returned.
- api/food/barcode.mjs and search.mjs: input is validated, errors use no-store, successes are cached with s-maxage.
- FoodSaveGuard_run: keeps the guard set after a screen-closing save and releases it on failure. Tests prove both.
- FoodScanSteps_reduce: late barcode answers cannot replace a serving the user is editing (tested).
- FoodAddFlow_nutrientsFor, FoodAddFlow_regramPick and FoodBasket_setGrams scale fixed-gram picks correctly, including the suspect-amount first edit.
- FoodScanSteps_entries: an edited description merges items by design and has tests.
- useFoodSearch in foodBrowsePanel.tsx: debounce and stale-result guard are correct.
- FoodBarcodeScanner (web): stream stops on detect and on unmount; it restarts when the tab becomes visible.
- foodMealPhoto.ts: input is clicked in the same tap, which keeps iPhone Safari's picker open.
- FoodApi_find: a saved-food hit is returned on a lookup failure, so offline search still shows saved foods.
