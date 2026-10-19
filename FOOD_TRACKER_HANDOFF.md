# Food tracker handoff

Branch `food-tracker`. Status on 2026-10-19: the code is written, the types check and 38 mocha tests pass. Nobody has run the app with it yet.

## Goal

The Food tab copies the layout of Built With Science's Nutrition screen, using only layout and style, no assets. The screen has:

- A header date switcher: "‹ Today, Oct 19 ›".
- A Consumed / Remaining toggle.
- A big calorie number over a range, for example "742 / 3100-3200 cal".
- A blue bar for calories. Protein, carbs and fat bars are purple, green and yellow.
- A "Full Breakdown" row that expands.
- "Food Log" with a gear (targets) and a copy-yesterday button.
- Breakfast, Lunch, Dinner and Snacks cards, each with a "742 Cal" pill, a "28 P" pill and a "+".
- A bottom search bar with barcode and camera buttons.

## Built

- Tab bar: `Home · Program · Workout · Food · Graphs · Me`, in `src/components/footer2.tsx`. The icon is `src/components/icons/iconFood.tsx`.
- Navigation: `ITab` has "food" and `IScreenData` has "food" (`src/models/screen.ts`). `src/navigation/types.ts` has `IFoodStackParamList`, `foodAddModal` and `foodGoalsModal`. The tab and the modals are registered in both `AppNavigator.tsx` and `AppNavigator.native.tsx`.
- Pure modules with tests:
  - `src/models/foodLog.ts`: days, totals, add, remove and edit, copy day, recents, progress, parse.
  - `src/models/foodAddFlow.ts`: turns a product, recent, photo item or quick add into entries.
  - `src/models/openFoodFacts.ts`: parses Open Food Facts responses. It falls back to kJ when the kcal value is wrong.
  - `src/models/foodPhotoEstimate.ts`: parses the AI's JSON.
  - `src/models/foodGoals.ts`: the targets form.
- Storage: `src/utils/foodLogStore.ts` keeps one IndexedDB key, `bebear_foodlog`, outside `IStorage`, so upstream merges do not touch it. The `useFoodLog()` hook gives every screen the same log.
- UI files:
  - `src/components/screenFood.tsx`, `foodSummaryCard.tsx`, `foodMealCard.tsx`, `foodSearchBar.tsx`.
  - `foodAddContent.tsx`: the add sheet with Search, Scan barcode and Plate photo tabs. It also edits and deletes an entry.
  - `foodAmountPanel.tsx`, `foodSearchPanel.tsx`, `foodQuickAddPanel.tsx`, `foodGoalsContent.tsx`, `foodUi.tsx`.
- Barcode: `src/components/foodBarcodeScanner.tsx` lazy-loads `@zxing/browser`, a pure JS decoder with no wasm or CDN, on a `<video>`. It reads EAN-13, EAN-8, UPC-A and UPC-E.
- Photo: `src/components/foodPhotoPanel.tsx` shrinks the picture to 1024 px JPEG on the phone (`src/utils/imageResize.ts`). You review each item and its grams before logging.
- Native builds get `.native.tsx` stubs for the scanner and the photo panel. Only the web app runs this fork.
- Same-origin Vercel functions keep `connect-src 'self'` and the offline fetch guard unchanged:
  - `api/food/barcode.mjs` proxies Open Food Facts product v2 and sends the User-Agent that Open Food Facts asks for.
  - `api/food/search.mjs` proxies `search.openfoodfacts.org`.
  - `api/food/photo.mjs` calls Vercel AI Gateway Chat Completions with `anthropic/claude-sonnet-5.5`, about $0.003 per photo. It signs in with `getVercelOidcToken()` from `@vercel/oidc`, so no API key is needed. `AI_GATEWAY_API_KEY` and `AI_GATEWAY_MODEL` override it.
  - The barcode and search handlers were tested in Node against live Open Food Facts. The photo handler was not called live.
- New dependencies: `@zxing/browser`, `@zxing/library` and `@vercel/oidc`.

## Next steps, in order

1. Fix the 5 lint errors. Run `npx eslint src/models/food*.ts src/components/food*.tsx src/components/screenFood.tsx test/food*.test.ts test/openFoodFacts.test.ts`. One error is `++requestId.current` in `foodSearchPanel.tsx`; the rest are Prettier issues that `--fix` handles.
2. Run the app. `npm run start:offline` serves the PWA, but it does not serve `/api/*`. Either add a webpack `devServer.proxy` for `/api/food` to a tiny Node server that imports the `api/food/*.mjs` handlers, or deploy a Vercel preview of this branch. A preview is simplest, because every non-master branch gets one.
3. Compare the Food screen with the Built With Science screenshot, in dark mode at iPhone width. Things to check:
   - The Consumed/Remaining pill contrast.
   - Card colors. The cards use `bg-background-subtle`.
   - The header title fitting with the arrows.
   - The search bar sitting above the tab bar. It uses the `NavScreenContent` `footer` prop.
4. Test the sheet. Check search, the recents list, the amount panel, quick add, editing and deleting, the copy-yesterday button and saving targets.
5. On the preview URL from an iPhone Home Screen, check the barcode camera and the photo (`input type=file`). For the photo, AI Gateway must be on for the Vercel team. Check the Vercel dashboard for AI Gateway credits.
6. Check the service worker in `src/webpushr-sw.ts`. It must never cache `/api/food/*` responses.
7. Update `README.md` ("What this fork changes") and `FORK_ROADMAP.md` to mark both food items built. Then open a PR to `master`. The repo's CLAUDE.md says no AI attribution lines in commits.

## Decisions already made

- Food is a sixth tab, so upstream's five tabs stay as they are.
- The food log lives outside Liftosaur's `IStorage`. The main JSON export does not include it, so the targets sheet has its own export and import.
- Default targets are 2800-3000 cal, 140-180 g protein, 300-400 g carbs and 70-100 g fat. They can be changed with the gear.
