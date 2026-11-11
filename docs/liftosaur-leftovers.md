# Liftosaur leftovers audit

Audit done on 2026-11-11. No app code changed. The owner decides each item.

## How to read this

The word "Liftosaur" is almost gone from on-screen text. The dinosaur is not gone. It sits in onboarding art, both tours, the workout share art and one app-bundle icon file.

The iOS app and the web app both build with `__OFFLINE_ONLY__` on by default (`babel.config.js`, `webpack.config.js`). In that build `initialScreen` is `main`, so the old first-launch flow never opens. Each item below says whether the owner can reach it today.

A removal suggestion carries the tag **REMOVE (owner approval needed)**. Every other suggestion changes words or art and keeps the screen.

Where an existing bear screen can replace a Liftosaur screen, the item names it. The bear flow is `onboardingWelcome`, `onboardingChat` and `onboardingQuestions` in `src/components`. `screenProgramSelect` already shows a bear.

Another session fixes the old workout share sheet. It is listed here so the doc stays complete.

## 1. Onboarding

None of these open in the offline build. They open only when the app is built with `LFT_OFFLINE_ONLY=0`. They still ship in the bundle, and a deep link or a future flag change can bring them back.

- **First launch slider** (`first`). Reach it on a fresh install in an online build, before any program exists. File is `src/components/screenFirst.tsx`. The user sees "The most powerful weightlifting planner and tracker app", "Build any weightlifting program using a simple scripting language", and four slides with Liftosaur app screenshots (`slide-2-image.png` to `slide-5-image.png`, the first one shows built-in program cards). Slide 1 shows the bear logo. The screen also preloads four dino images. Suggested action: **REMOVE (owner approval needed)**, and let the bear flow in `onboardingWelcome` start the app. If the owner keeps it, reword every slide and replace slides 2 to 5 with bear-era screenshots.
- **Pick your units** (`units`). Reach it with "Get started" on the first slider. File is `src/components/screenUnitSelector.tsx`. The user sees an orange dinosaur thinking between a kg plate and an lb plate (`images/dinounit.png`) and the text "Pick your units". Suggested action: swap the art for a bear. First check whether the bear flow already asks for units. `onboardingQuestions` has no unit question, so the swap is the safe default.
- **What equipment do you have?** (`setupequipment`). Reach it with "Continue" on the units screen. File is `src/components/screenSetupEquipment.tsx`. The user sees `images/dinoequipment.png` above the heading. Suggested action: swap the art for a bear.
- **Set up your plates** (`setupplates`). Reach it with "Continue" on the equipment screen. File is `src/components/screenSetupEquipment.tsx`, second component. The user sees `images/dinoplates.png`. Suggested action: swap the art for a bear.
- **How did you hear about us?** (`hearaboutus` screen and `hearAboutUsModal` sheet). Reach it from the first-launch flow, or as a load-time sheet after the first program in an online build. Files are `src/components/screenHearAboutUs.tsx`, `src/components/hearAboutUs/hearAboutUsSurvey.tsx` and `src/components/hearAboutUs/hearAboutUsConfig.ts`. The user sees a dinosaur holding a telescope (`images/dino-scope.png`, spoken label "beBEAR mascot with a telescope") and a Reddit choice named `r/liftosaur`. Suggested action: swap the mascot for a bear and drop the `r/liftosaur` choice. Dropping a survey choice is a small removal, so the owner should confirm it.
- **Choose how to start** (`programselect`). Reach it after the survey in an online build. File is `src/components/screenProgramSelect.tsx`. The bear art is already in. The row "Import from link" says "Paste a link from the program web editor", and that web editor is Liftosaur's. Suggested action: reword the row, or hide it until beBEAR has its own link format.
- **Signup request sheet** (`signupRequestModal`). Reach it in an online build, after three workouts, when the user has no account. File is `src/navigation/modals/NavModalSignupRequest.tsx`. The user sees `images/buff-coder-thumbsup.png`, a cartoon bodybuilder with a laptop. This is Liftosaur's coder mascot, not a dinosaur. Suggested action: swap the art for a bear.

## 2. Daily screens

- **Program tour** (the "?" button on the program editor). Reach it with Programs, open a program, then tap the "?" in the top bar. This works in the offline build today. Files are `src/components/tour/programTourConfig.tsx` and `src/components/tour/tourModal.tsx`. The tour has seven steps. Each step shows dinosaur art (`programtourstructure.png`, `programtourupdate.png`, `programtourtext.png`, `programtourliftoscript.png`, `programtouradd.png`, `programtouredit.png`, `programtourplayground.png`). The type field is still named `dino` in `src/components/tour/tourTypes.ts`. Suggested action: swap all seven images for bear versions. The house tour in `houseTourConfig.tsx` already feeds bear images through the same field, so no code change is needed for the swap.
- **Workout tour** (workout screen, "Show Tour" in the three-dot menu). Reach it in an online build only. The offline build hides the menu row and the auto-start. File is `src/components/tour/workoutTourConfig.tsx`. Eight steps show dinosaur art (`dinocoach.svg` plus seven `firstworkouttour*.png` files). Suggested action: if the owner wants a workout tour, swap all eight images for bear art. Otherwise **REMOVE (owner approval needed)** the tour.
- **The word "Liftoscript"** in the program editor help. Reach it with a "?" on the program choice screen or the program editor. Files are `src/components/help/helpChooseProgram.tsx`, `src/components/help/helpChooseProgramFirstTime.tsx`, `src/components/help/helpEditProgramV2.tsx`, `src/components/exerciseRm.tsx` ("Available in Liftoscript as ...") and the tour text above. This is the name of the program scripting language. The owner chose the new name BearScript on 2026-11-11. The rename is in PR 178, covering these five places, the in-app docs text, the backup note and the onboarding AI error. The grammar, parser, code names and `llms/liftoscript.md` keep the old name.
- **Workout share sheet** (History, open a workout, Share). The other session fixes this one. File is `src/components/workoutShareOutput.tsx`. The header shows the orange dinosaur with a barbell (`images/icon512.png`) next to the text "beBEAR". Suggested action: swap `icon512.png` for the bear icon.
- **Social share sheet** (workout Share, then a social option). The other session covers this one too. File is `src/components/workoutSocialShareSheet.tsx`. Both background images (`images/workoutsharebg.jpg`, `images/workoutsharesquarebg.jpg`) show the dinosaur at the top. I opened only the tall one. The square one uses the same name pattern. Suggested action: replace both backgrounds with bear art.

## 3. Settings and rare screens

- **Me, bottom of the list, "Source Code on Github"**. Reach it with the Me tab, then scroll to the end. File is `src/components/screenSettings.tsx`, with the URL in `src/utils/offlineOnly.ts`. On iOS the row opens `github.com/astashov/liftosaur`, because only the web build sets `__SOURCE_CODE_URL__`. Suggested action: point the iOS build at the beBEARlifts repo. No removal needed.
- **Me, "📍 Roadmap"**. Same place. The row opens the Liftosaur GitHub discussions page. Suggested action: repoint it to beBEAR, or **REMOVE (owner approval needed)** the row.
- **Me, "beBEAR is based on Liftosaur by Anton Astashov (AGPL-3.0)"**. Same place. This is the license credit. Suggested action: keep it. The AGPL asks for this credit, and Anton agreed to the fork.
- **Import history from CSV file** (Me, Import / Export). Files are `src/components/importerLiftosaurCsv.tsx` and `src/components/screenSettings.tsx`. The label is neutral. The help text links `/liftosaur_example_csv.zip`, and that name is not shown on screen. Suggested action: keep it. The component and file names are code identifiers.
- **Import from link sheet** (Programs, "Import from link"). File is `src/components/modalImportFromLink.tsx`. The heading says "Paste link from /program web editor". The input hint says `https://www.liftosaur.com/...`. Suggested action: reword the heading and replace the hint. Keep accepting liftosaur.com links, since they still work as program imports.
- **What's new sheet** (`whatsnewModal`). Reach it as a load-time sheet when `CHANGELOG.md` has an entry newer than the stored date. A fresh install stores today's date, so a new user does not see it. The offline build hides the manual "Changelog" row. File is `src/navigation/modals/NavModalWhatsnew.tsx`, with text from `CHANGELOG.md`. `src/models/appBrand.ts` swaps the word "Liftosaur" for "beBEAR" in that text. It does not touch links or dino mentions. Suggested action: check that `CHANGELOG.md` holds only beBEAR entries. If it still carries upstream release notes, trim them.
- **Discord Server row** (Me, Miscellaneous). Online build only. File is `src/components/screenSettings.tsx`. The row opens Liftosaur's Discord invite. Suggested action: **REMOVE (owner approval needed)** the row, or point it to a beBEAR server.
- **Subscription info sheet** (`subscriptionInfoModal`). I found no code that opens it. File is `src/navigation/modals/NavModalSubscriptionInfo.tsx`. It shows Liftosaur screenshots (`plates_calculator_subs.png`, `graphs_subs.png`, `week_insights_subs.png`, `notifs_subs_ios.jpg`, `notifs_subs_android.jpg`, `watch_subs_ios.png`, `mcp_subs.png`). Suggested action: **REMOVE (owner approval needed)** the sheet if it stays unreachable. The beBEAR+ screen in `screenSubscription.tsx` already carries its own copy.
- **Affiliate sheet** (Me, "Earn money with beBEAR"). Shown only when the `affiliates` feature flag is on. File is `src/navigation/modals/NavModalAffiliate.tsx`. I did not read its text. Suggested action: read it before the flag turns on.
- **Unused Liftosaur art in `images/`**. `subscriptionhero.png` is preloaded in `NavScreenHome.tsx` and drawn nowhere. It is a Liftosaur marketing collage with a ChatGPT icon. Suggested action: remove the preload and the file once the owner agrees.

## Already clean

- App icon and launch screens. Commit `912a642d` replaced them with the bear.
- `images/logo.svg`. It is the bear, so the program picture export shows a bear.
- `screenSubscription.tsx`. Its copy says beBEAR+.
- The iOS display name. `ios/AppBranding.xcconfig` sets `beBEAR`.
- The watch and widget Swift files. A search for the word on screen found only identifiers and comments.

## Out of scope

Renaming these can break sync, signing or links.

- Code identifiers such as `ImporterLiftosaurCsv`, `NativeLiftosaur*` and `LiftosaurWatch`.
- File and folder names such as `ios/Liftosaur` and `liftosaur_example_csv.zip`.
- The bundle id `com.liftosaur.www` and the Apple sign-in client id `com.liftosaur.www.signinapple`.
- API hosts such as `api3.liftosaur.com` and the sync and deep-link domains.
- Marketing pages under `src/pages` and web-only chrome in `src/components` (`footerPage.tsx`, `topNavMenu.tsx`, `page.tsx`). They link to Liftosaur social accounts and are not part of the app.
- Licenses and legal HTML.

## Next action

Read the first-launch slider item and tell the session which of the two actions you want, remove or reword.
