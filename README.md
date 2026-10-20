# beBEARlifts

beBEARlifts is a personal fork of [Liftosaur](https://github.com/astashov/liftosaur) by Anton Astashov. It runs offline as a web app on an iPhone Home Screen. It has no subscription. Cloud backup is optional and uses an email code. Without cloud sign-in, workout data stays on the phone. Vercel functions provide food lookups and AI estimates.

All credit for the app goes to the Liftosaur authors. The license stays AGPL-3.0 (see `LICENSE`). This fork is public, and Settings → "Source Code on Github" links to it, as AGPL section 13 asks of a network-served modified version.

The original Liftosaur README follows below, after the fork notes.

## What this fork changes

Changes in this fork, first made in October 2026. AGPL section 5(a) asks a modified version to list them.

- The build flag `LFT_OFFLINE_ONLY=1` makes a no-backend build. `npm run build:pwa` sets it. Without the flag, the code builds the same as upstream.
- In that build, `src/utils/offlineOnly.ts` allows Spotify and `https://qvqwvuuwfueccrmzwyct.supabase.co`. It rejects every other external `fetch`. The app sees the same error as a phone with no signal, and takes its existing offline path.
- `__API_HOST__` becomes `https://api.offline.invalid`. The `.invalid` TLD never resolves. `__HOST__` becomes the page's own origin, so built-in programs load from the same site.
- `src/index.html` no longer loads Rollbar, Google Analytics, the consent script or Apple sign-in. A two-line stub stands in for the global `Rollbar`.
- `Subscriptions_hasSubscription` in `src/utils/subscriptions.ts` always returns true. Every premium feature reads that one function.
- `SubscriptionPlan_derive` reports "Free access", so no screen shows the purchase pitch. The Apple and Google receipt cleanups return before they call a server.
- The offline build skips the startup cloud sync, the sign-up prompt, the "How'd you hear about us?" survey, the "I have an account" button, and the Account, Nickname, API Keys and Discord rows in Settings.
- The tab bar hides during a live workout. It has five tabs, two on each side of the Workout button: Home, Friends, Food and Progress. Friends (`src/components/screenFriends.tsx`) holds friend requests and a feed of shared workouts. "Friends and the workout feed" below says how it works. Progress (`src/components/screenProgressDashboard.tsx`) folds in Graphs and Me: a Program card, daily targets, latest weight, food days logged, workouts and streak, with the profile and settings buttons in its header. The Program card opens the program editor, which has a back arrow to Progress. The program list, the program preview and the 1RM screen open on the Progress tab too (`TabRouting_tabForScreen` in `src/models/tabRouting.ts`).
- An ad-hoc set added with "Add Set" gets the last set's numbers pre-filled but no target (`Reps_addSet` in `src/models/set.ts`). Upstream copied them as the target, so a later set with fewer reps turned red. Program sets keep the target, because progressions read it.
- The finish screen has a story card (`src/components/workoutStoryCard.tsx`): a 1080 × 1920 PNG with weight lifted, duration, sets, a muscle map and a funny comparison such as "You moved 3 grand pianos", over your own photo if you add one. The comparison comes from 50 things (`src/models/liftEquivalents.ts`) and always lands between 2 and 999 of them. Shuffle picks another thing and phrase.
- Four exercises come from other forks: Shoulder Press with a kettlebell, Squat Hops, Split Squat Hops and Calf Jump. They have no pictures yet, so the picker shows a text tile for them.
- The service worker caches only successful responses, so a missing image or a server error is not kept until the next deploy.
- iPhone polish in `src/index.html`: an opaque status bar (the translucent one broke taps on iOS 26, see the comment in `src/index.html`), launch screens for 13 iPhone sizes in light and dark (`icons/launch/`, made by `node scripts/generate-launch-screens.js`), no grey tap flash, no page bounce, and the system font (San Francisco on iPhone) in place of Poppins.
- `src/utils/pressFeedback.ts` dims a button while a finger is on it, as iOS does. It is installed only in the offline build.
- Settings → Appearance → Monochrome turns the app black and white. It is stored as `settings.monochrome` and puts a `mono` class on `<html>`.
- `.claude/hooks/session-start.sh` installs dependencies, runs the codegen steps and installs Playwright's Chromium in Claude Code cloud sessions.
- `src/webpushr-sw.ts` precaches the files the app loads (`/app/` and the bundles it names). It caches lazy chunks, program data and images on first use. One missing file no longer breaks the install.
- The offline build names `app`, `vendors` and their CSS by content hash, for example `/app.736a0190.js`, and `HashedIndexPlugin` in `webpack.config.js` writes those names into `app/index.html`. Vercel ignores the query string on static files. With the old `/app.js?version=<commit>` names, a deploy could hand the service worker the previous `app.js` under the new name, and the phone kept it. The service worker reads the bundle names from the cached `/app/` page on install (`src/utils/bundleNames.ts`).
- On a Home Screen app, JSON and CSV export open the iOS share sheet ("Save to Files", AirDrop, iCloud Drive).
- A backup reminder asks once a week to export, when there is at least one workout and no export in the last 7 days.
- `vercel.json` deploys `dist/`. It proxies `/externalimages/*` to Liftosaur's public exercise image bucket. Its `connect-src` allows the app's origin, in-memory files, Spotify and the Supabase project.
- The Food tab logs calories and macros per meal. Its layout follows Built With Science's Nutrition screen. The screen is `src/components/screenFood.tsx`, and the rules live in `src/models/foodLog.ts` and `src/models/foodAddFlow.ts`.
- Adding food opens a full screen (`src/components/screenFoodAdd.tsx`): search, Barcode, AI Scan, Describe and Quick Log tiles, and Food, Meals and Recipes tabs. Ticked foods collect in an Item Log basket with portions, then log together (`src/models/foodBasket.ts`). Saved meals and batch recipes live in the food log (`src/models/savedMeals.ts`).
- The food log has its own IndexedDB key, `bebear_foodlog`, outside Liftosaur's storage, so upstream merges do not touch it. The main JSON export does not include it. The targets sheet (the gear icon) has its own export and import.
- "Calculate my targets" in the targets sheet asks for weight (from the latest weight stat), height in cm or ft and in, sex, age, activity, and lose, maintain or gain. It uses Mifflin-St Jeor times an activity factor (1.2 to 1.9), then 20% below or 10% above maintenance. Protein is 1.6 to 2.2 g per kg, fat 0.6 to 1.0 g per kg, and carbs fill the rest. The answers only fill the form, so you edit before you save. Height, sex, birth year, activity and goal stay in the food log's `profile` (`src/models/foodTargets.ts`).
- Barcode scanning: `src/components/foodBarcodeScanner.tsx` reads EAN-13, EAN-8, UPC-A and UPC-E from the camera with `@zxing/browser`, a JavaScript decoder. `api/food/barcode.mjs` and `api/food/search.mjs` are Vercel functions on the same site that call Open Food Facts, so `connect-src 'self'` stays as it is.
- AI estimates: AI Scan sends a 1024 px photo and an optional note. Describe sends only text, such as "2 eggs and a buldak". You review each item and its grams before it goes in the basket. `api/food/photo.mjs` uses Google's Gemini when `GEMINI_API_KEY` is set (model `gemini-flash-lite-latest`, free tier). Otherwise it uses `anthropic/claude-haiku-5.5` through Vercel AI Gateway, at about $0.0003 per photo and $0.0002 per description, signed in with Vercel's OIDC token. `GEMINI_MODEL` and `AI_GATEWAY_MODEL` pick other models.
- AI features need a cloud backup sign-in. `src/utils/aiRequest.ts` sends the Supabase access token as `Authorization: Bearer`. `api/_auth.mjs` calls the Supabase function `ai_usage_take` with that token. Supabase rejects a bad or expired token, so the AI function answers 401. Otherwise `ai_usage_take` adds one to today's row in `ai_usage` and returns the count. Over 60 calls in one UTC day the AI function answers 429. `AI_DAILY_CAP` in Vercel changes the 60. The SQL is in `supabase/migrations/20261020221250_ai_usage.sql`.
- A barcode lookup tries three places in order: foods saved on the phone, Open Food Facts, then USDA FoodData Central (`api/food/usda.mjs`). USDA covers products sold in the US. It needs a free api.data.gov key in the Vercel environment variable `FDC_API_KEY`. Without it, the shared `DEMO_KEY` allows about 30 lookups an hour.
- The Open Food Facts parser falls back to the English or another localized name when `product_name` is empty. It converts per-serving nutrition to per 100 g when the serving has a gram weight.
- When no source has a barcode, "Photo the nutrition label" sends a 1600 px photo to the same model with a label prompt (`kind: "label"` in `api/food/photo.mjs`). You check the numbers or type them in. The food is saved in the food log's `savedFoods` under that barcode, so the next scan finds it, even offline. Search finds saved foods by name.
- The service worker never handles `/api/food/*`, so a lookup always goes to the network.
- Workout music: Progress → Workout music connects Spotify (Authorization Code with PKCE, no server). During a workout, `src/components/musicTracker.tsx` asks Spotify for the playing song every 8 seconds while the app is open, and reads `recently-played` when the app comes back from a locked screen. A song heard for half its length, or to within 20 seconds of its end, is kept (`src/models/musicSession.ts`). After the workout, untick songs, then "Save to Spotify" makes a private playlist, and "Play next workout" plays them again. The finish screen links to the list.
- The music log has its own IndexedDB key, `bebear_music`: Spotify tokens, the display name and the last 60 workouts' songs. Only Spotify sees which songs played. No workout data goes to Spotify.
- The service worker never handles `*.spotify.com` requests.
- `llms/program_builder_prompt.md` is a prompt for your own AI chat app. It interviews you, then picks a built-in program or writes one in Liftoscript. "Build your program with your own AI" below says how to use it.

## Cloud backup

Open Settings → Import / Export → Cloud backup. Enter your email, tap "Send code", then enter the code and tap "Sign in".

After each finished workout, the signed-in app uploads the same JSON as "Export everything". It includes workouts, programs, settings, body stats, food, music history, body scans, warmups and workout reports. Spotify tokens and the cloud session in `bebear_cloud` stay on the phone.

Backups go to the private `backups` bucket in Supabase project `bebearlifts` (`qvqwvuuwfueccrmzwyct`). Each account can read and write only its own folder. `latest.json` holds the restore file. Seven weekday files keep the latest backup from each weekday. "Back up now" also saves changes between workouts. "Last backup" shows when both uploads succeeded. A failed automatic upload leaves that time unchanged. Finish another workout or tap "Back up now" to retry.

On a new phone, install the Home Screen app and sign in with the same email. If local workout history is empty, the app checks for a cloud backup and offers to restore it. Tap "Restore from cloud" and confirm. Restore replaces local workouts, settings, food, music, body scans, warmups and reports. It keeps this phone's cloud and Spotify logins. Sign out stops automatic uploads and leaves cloud files in place.

For a new Supabase project on the free plan, configure custom SMTP under Authentication → Emails → SMTP Settings first. The dashboard requires custom SMTP before it allows template edits. Resend needs a verified sending domain and a sending-access API key. The sending address does not need an inbox.

In Authentication → Emails → Templates, add `Your code: {{ .Token }}` to both "Magic link or OTP" and "Confirm sign up". A link alone opens Safari and cannot sign in the Home Screen app. This project's SMTP and both code templates were configured on 2026-10-20. Emails send through Resend from `noreply@mail.paulbebear.com` to the address entered in the app.

## Friends and the workout feed

Friends use the cloud backup sign-in. Signed out, the Friends tab links to Settings.

1. Pick a handle in the Friends tab: 3 to 20 lowercase letters, numbers or `_`. Add a name if you want one.
2. Type a friend's exact handle and tap "Find". Their name shows. Tap "Send request".
3. Your friend sees the request at the top of their Friends tab and taps "Accept". If you both send a request, the second one accepts the first.
4. "Remove", "Decline" and "Cancel" delete the link for both people.

To share a workout, turn on "Share with friends" on the finish screen. It is off the first time. The app remembers your last choice and applies it to the next workout. Turning it off deletes that workout's post.

A post holds a summary, built in `src/models/workoutPost.ts`: program and day name, start time, duration, total weight lifted, sets, the top set per exercise, records that beat an earlier set, and the number of kept songs. It holds no notes, photos, body weight, food or song names.

The feed shows your posts and your friends' posts, newest first, up to 50. It reloads when you open the tab and when you pull down from the top. The last feed stays on the phone (`bebear_feed` and `bebear_friends` in IndexedDB), so it shows offline. A share made offline waits in the same store and goes out on the next finish screen or the next Friends tab visit.

How privacy works. The tables are in Supabase project `bebearlifts`, and every table has row-level security. The SQL is in `supabase/migrations/`.

- `profiles`: you read your own row and the rows of people you share a request or a friendship with. Search goes through `find_profile`, which returns only a handle and a name for an exact handle. It never returns a user id, and no one can list all handles.
- `friendships`: only the two people in a row see it or delete it. Requests go through `request_friend`. Only the person asked can accept, and column grants let them change only the status.
- `workout_posts`: the author and accepted friends read a post. A pending request shows nothing. Only the author can add, change or delete it.

## Run it locally

```bash
npm ci
npm run build:pwa
npx serve dist   # or any static server, then open http://localhost:3000/app/
```

`npm run start:offline` runs the webpack dev server with the same flag. Open http://localhost:8080/app/index.html.

To test the Spotify login locally, open http://127.0.0.1:8080/app/ instead. Spotify rejects `localhost` redirects, and `http://127.0.0.1:8080/app/` must be listed under Redirect URIs in the Spotify developer dashboard. `tests/music.spec.ts` runs the whole music flow against routed Spotify responses: serve `dist` on `127.0.0.1:4173`, then run `MUSIC_PWA_URL=http://127.0.0.1:4173/app/ npx playwright test tests/music.spec.ts`.

For the Food tab's lookups, also run `npm run start:foodapi` in a second terminal. It serves the `api/food/*` functions on port 3010, and the dev server forwards `/api/food/*` to it. Set `FOOD_API_PORT` for both commands to use another port. Outside Vercel, the photo function needs `GEMINI_API_KEY`, `AI_GATEWAY_API_KEY`, or a `VERCEL_OIDC_TOKEN` from `vercel env pull`. The USDA function reads `FDC_API_KEY` the same way.

## Deploy on Vercel (free)

1. Sign in at vercel.com with GitHub. The free Hobby plan covers personal, non-commercial use.
2. Click "Add New… → Project" and import `paul-bebear/beBEARlifts`.
3. Leave "Framework Preset" on "Other". `vercel.json` sets the install command (`npm ci`), the build command (`npm run build:pwa`) and the output folder (`dist`).
4. Under "Build and Output Settings", check that Node.js is 22.x. The repo's `.nvmrc` asks for `lts/jod`, which is Node 22.
5. Click "Deploy". The first build takes about 5 minutes. You get `https://<project>.vercel.app` with HTTPS.
6. Every push to `master` redeploys. Other branches get preview URLs. Data saved on a preview URL lives apart from data saved on the production URL.

The repo has a git submodule (`lambda/scripts`) that points at a private SSH URL. If Vercel warns that it cannot clone it, ignore the warning. The web build does not use it.

## Install on iPhone

1. Open `https://<project>.vercel.app/app/` in Safari.
2. Tap Share → "Add to Home Screen" → Add.
3. Always open the app from the Home Screen icon. Safari tabs and the Home Screen app keep separate storage.
4. Open the app once with a signal, so the service worker caches it. After that it starts in airplane mode.

## Build your program with your own AI

Pick a built-in plan with the [programs guide](llms/programs_guide.md), grouped by experience, schedule, goal, and equipment.

The app does not interview you yet. Until it does, an AI chat app such as ChatGPT or Claude can, with the prompt in [`llms/program_builder_prompt.md`](llms/program_builder_prompt.md).

1. Open the prompt file. Copy everything below its line and paste it into a new chat.
2. The AI first says how to add the app to the Home Screen. Then it asks three questions, and you can skip any of them: your goal and days per week, your height, weight, age and experience, and whether you already follow a plan.
3. If you follow a plan, send screenshots of it. The AI converts it to Liftoscript as it is, and lists every exercise it renamed. Screenshots of past workouts become a `csv` block of history.
4. Otherwise the AI names one of the app's built-in programs, or writes a program for you as one `liftoscript` code block.

To add the history: copy the `csv` block, open Settings and tap "Paste history from clipboard". Safari asks to paste; tap "Paste".

To add a built-in program:

1. Open the Progress tab, tap the Program card at the top, then tap the two-arrows icon right of the program name. "Choose a program" opens.
2. Tap "Built-in", search for the name, tap the program, then tap "Clone".

To add a program the AI wrote:

1. Copy the text inside the code block. Chat apps show a copy button on the block.
2. Open the Progress tab, tap the Program card at the top, tap the two-arrows icon, then tap "Create New Program" at the bottom.
3. Type a name and tap "Create". The program editor opens on the new, empty program.
4. Tap "Edit", then the icon just left of "Save". It shows curly braces around three lines, and it switches the editor to full text mode.
5. Select all the text in the editor and paste.
6. Tap "Save". The app goes to Home with the new program active.

On the app's first launch, the "Choose your program" screen comes up by itself. Tap "Pick a built-in program" or "Create a program" there, in place of the two-arrows icon.

If a line is wrong, a red bar above the editor shows `Error:` with the line and column, for example `Syntax error (12:42)`. "Save" stays grey until the text parses. Paste the error into the chat, and the AI sends the fixed block.

The starting weights are guesses. Change any that feel wrong after the first workout.

`test/programBuilderPrompt.test.ts` parses the prompt's example program with the app's own parser, and imports its example history CSV with the app's own CSV import. It also checks that every exercise name in the prompt exists and that every built-in program is listed. A change that breaks the prompt fails `npm test`.

## Your data and backups

Your data lives only in the phone's IndexedDB, under the origin you installed from. There is no cloud copy.

- iOS does not apply Safari's 7-day storage cap to Home Screen apps. It can still clear data when the phone runs very low on storage. Deleting the Home Screen icon also deletes the data.
- The app asks the browser for persistent storage (`navigator.storage.persist()`) on every launch.
- Changing the URL (a new Vercel project name, a custom domain) starts with empty storage. Export first, then import on the new URL.
- To back up, open Me → "Export data to JSON file" → "Save to Files" (pick iCloud Drive).
- To restore, open Me → "Import data from JSON file" and pick the file. Import replaces all current data.
- "Export history to CSV file" gives a spreadsheet copy, but only the JSON file can be imported back.

## Pull updates from upstream Liftosaur

One-time setup on your computer:

```bash
git remote add upstream https://github.com/astashov/liftosaur.git
```

Each update:

```bash
git checkout master
git fetch upstream
git merge upstream/master
npm ci && npm run build:pwa   # must pass before you push
git push origin master        # Vercel redeploys
```

The GitHub "Sync fork" button does the same merge when it has no conflicts. It does not run the build, so check the Vercel deploy log afterwards.

Conflicts, when they happen, are in the files this fork touches: `src/index.html`, `src/webpushr-sw.ts`, `src/utils/subscriptions.ts`, `src/utils/subscriptionPlan.ts`, `src/utils/exporter.ts`, `src/ducks/thunks.ts`, `src/ducks/reducer.ts`, `src/components/screenSettings.tsx`, `src/navigation/screens/NavScreenFooter2.tsx`, `src/models/exercise.ts`, `src/models/exerciseImage.ts`, `src/models/exerciseDescriptions.ts`, `src/types.ts`, `src/index.tsx`, `src/utils/theme.ts`, `src/utils/appliedTheme.ts`, `llms/exercises.md`, `.claude/settings.json`, `webpack.config.js`, `manifest.webmanifest`. Keep both sides, and keep every `OfflineOnly_isEnabled()` check. `src/models/exerciseDescriptions.ts` is generated: after a conflict there, run `npm run build:exercises`.

## Credits

This fork takes code and ideas from these public AGPL-3.0 forks of Liftosaur. Each ported commit keeps its original author, and its message names the source commit.

- [ishank26/Sabertooth](https://github.com/ishank26/Sabertooth) by Ishank Sharma: the free-access plan state and skipping receipt checks when premium is unlocked, plus the test they are based on. Its self-hosted MCP setup informs the AI warmup section of `FORK_ROADMAP.md`.
- [shoriminimoe/liftosaur](https://github.com/shoriminimoe/liftosaur) by Sam Caldwell: the SessionStart hook for Claude Code cloud sessions. Its removal of paid, promo and social surfaces guided the check for leftover rows in Settings.
- [yeivier/liftosaur-javier-](https://github.com/yeivier/liftosaur-javier-) by yeivier: hiding the tab bar during a live workout, and the monochrome theme idea (black or white accents, a root grayscale filter, the system font). This fork builds it as an option on top of upstream's colours instead of rewriting them.
- [EqyMMxpb/liftosaur](https://github.com/EqyMMxpb/liftosaur) by kayuitai: the kettlebell Shoulder Press and its description.
- [adepssimius/liftosaur](https://github.com/adepssimius/liftosaur) by adepssimius: Squat Hops, Split Squat Hops and Calf Jump.
- [kai119/liftosaur](https://github.com/kai119/liftosaur) by Kai Mumford: nothing ported yet. Its Docker backend and config module are the Phase 2 sync option in `FORK_ROADMAP.md`.

Export a backup before you open the app on a new version. A storage migration in an upstream release runs on your only copy.

---

# 🏋 Liftosaur: Open-source powerful weight lifting tracker PWA for coders.

* Link: https://www.liftosaur.com
* **[Features roadmap](https://github.com/astashov/liftosaur/discussions)**
* **[Bugs](https://github.com/astashov/liftosaur/issues)**

<img src="https://raw.github.com/astashov/liftosaur/master/screenshot2.png" alt="Liftosaur Screenshot" width="360" />

It's mobile app, that's available as:

- [PWA](https://www.liftosaur.com/app) - meaning you can open the page in a browser on your mobile phone, add it to a home screen, and it will behave exactly as a regular app.
- [Android app](https://play.google.com/store/apps/details?id=com.liftosaur.www.twa?referrer=utm_source%3Dgithub) - thin Android app around this PWA with some native features added.
- [iOS app](https://apps.apple.com/app/apple-store/id1661880849?pt=126680920&mt=8&ct=github) - thin iOS app around this PWA with some native features added.

The main idea is to make a weightlifting tracker app, that is flexible enough to implement pretty much any weightlifting routine. It would be a platform for your experiments in weightlifting, you can try any progression and deloading logic you want to see what suits you better. It automatically handles progressive overloads and deloads based on the logic you define. Any program should be possible to implement - Stronglifts 5x5, GZCLP, any 5/3/1s, any PPL, you name it.

To describe the logic, there's a built-in scripting language called [Liftoscript](https://www.liftosaur.com/doc), which is a very simple programming language with JavaScript-like syntax. It has some built-in variables and some custom number types (e.g. `kg` and `lb`), but other than that it's pretty simple. E.g. Stronglifts 5x5 logic could look like this if written in Liftoscript:

```js
if (completedReps >= reps) {
  state.weight = state.weight + 5lb
} else {
  state.failures = state.failures + 1
}
if (state.failures > 2) {
  state.failures = 0
  state.weight = state.weight * 0.9
}
```

# Features

- Built-in workout programs - 5/3/1, GZCLP, Starting Strength, etc
- Any workout program is fully customizable - you can clone existing one and adjust it to your needs. Every single program is written using Liftoscript right in the app, so every bit of it could be changed.
- Simple exercise editor if you don't want to mess with Liftoscript, that still allows to specify simple progression/deload logic.
- Advanced exercise editor if you want to unleash the full power of Liftoscript.
- Workout history
- Offline mode, it doesn't need Internet to work (still needs though if you have an account and want to save progress).
- Plates calculator right on the progress screen. Each weight is prefixed with plates you need to use to get to that weight, it looks like: `45/25/25/10 255lb` meaning you need to add 1x45lb, 2x25lb and 1x10lb plates on each side of the olympic barbell to get `255lb`. You define your plates inventory in Settings.
- All weights are rounded according to your available bars and plates, which you set up in Settings.
- Rest Timers - configurable globally and per exercise, with a Push Notification when the timer is expired (works only on native apps though).
- Cloud storage - if you create an account, your progress will be saved on the server.
- Graphs - see the visual progression of your lifts, define what Graphs you need on the Graphs screen.
- Muscle map - see what muscles get activated in your day or in the whole program relatively to each other.
- Exercise substitution based on similar activated muscles.
- Custom exercises.
- Warmup sets, which you can configure as a percentage of the weight of the first set, or just as an absolute lb or kg value. Each exercise has defaults, but you can change it.
- "Playgrounds" when editing exercises, so you could test the logic or exercises.
- Previews of each program available, with playgrounds, e.g. [Basic Beginner Routine](https://www.liftosaur.com/programs/basicBeginner).
- If you did similar sets x reps for some exercise previously, it shows your last results. Same for AMRAPs.
- Optional public profile page, e.g. this is [mine](https://www.liftosaur.com/profile/tiolnbjbleke).
- Track bodyweight and other body measurements (biceps, chest, waist, etc)
- Correlate bodyweight changes with lifts graphs
- Web Editor to create programs
- Shareable programs - you can build a program, generate a link, and import on another phone.

# Implementation details

It's a regular Preact/TypeScript app. State manager is custom, similar to Redux + Thunks, but using [lens-shmens](https://github.com/astashov/lens-shmens#why) to avoid Redux-like boilerplate. It's a PWA, so there's a simple service worker, that caches the network calls. The setup is similar to what's described in [this blog post](https://www.liftosaur.com/blog/posts/offline-mode-in-liftosaur/).

I try to be efficient with the JavaScript size, and avoid heavy third-party libraries. As a result, the whole app weights ~200kb, where ~100kb are various third-party libs. The major third-party libs are:

- [CodeMirror](https://codemirror.net/) for the code editor
- [Preact](https://preactjs.com/) for a view layer
- [Prism](https://prismjs.com/) for code highlighting
- [uPlot](https://github.com/leeoniya/uPlot) for graphs
- [Rollbar](https://rollbar.com/) for error reporting
- [11ty](https://www.11ty.dev/) for the blog
- [Cypress](https://www.cypress.io/) for integration tests
- [Tailwind CSS](https://tailwindcss.com/) for CSS
- [Jimp](https://github.com/oliver-moran/jimp) for generating dynamic `og:image` images (like [this](https://www.liftosaur.com/profileimage/tiolnbjbleke)) for social media

For RPE multiplier calculations we use the formula from https://gitlab.com/openpowerlifting/plsource

Server-side part is AWS Lambdas + DynamoDB + S3 + a bunch of other AWS services. DynamoDB is not a great choice for this app, I'd prefer a relational database here, frankly. But AWS Lambdas + DynamoDB + S3 are pretty cheap, easily scalable, fully managed with backups, so sticking with it for now.

I deploy everything via AWS CDK, the setup is described in [this blog post](liftosaur.com/blog/posts/how-i-moved-liftosaur-from-cloudflare-workers-to-lambda/). I also created an [AWS CDK Lambda TypeScript starter](https://github.com/astashov/aws-cdk-lambda-typescript-starter), to simplify creating similar environment for pet projects.

# How to run locally

If you want to run liftosaur locally firstly ensure that you have Node 18 and npm installed

Then comment out the 
```
devServer:{ }
```
block from the `webpack.config.js` file

Run
```
$ npm install
$ npm start
```

Then, open http://localhost:8080/app. That's it! But that will only give you offline-like experience, so there will be no local API server running.

Running the server is a bit trickier, and frankly still tied to `liftosaur.com` domain, so probably would not be easy to run, you'd need to modify a bunch of things in `liftosaur-cdk/liftosaur-cdk.ts` file. If you still want to try, then you need to set up AWS account, add `AWS_ACCESS_KEY_ID`,`AWS_SECRET_ACCESS_KEY`,`AWS_REGION` env vars, and set the necessary permission policies for your user:

- SecretsManagerReadWrite
- AmazonDynamoDBFullAccess
- AmazonEC2ContainerRegistryFullAccess
- AmazonS3FullAccess
- CloudFrontFullAccess
- AmazonSESFullAccess
- AmazonAPIGatewayAdministrator
- AmazonSSMFullAccess
- AmazonRoute53FullAccess
- AWSCloudFormationFullAccess
- AmazonElasticContainerRegistryPublicFullAccess
- AWSLambdaFullAccess

Create new secrets in AWS Secrets Manager, with the names listed in `secretArns` variable in `liftosaur-cdk.ts`. Those could be pretty much any random strings.

Then, run `npm cdk-deploy`, that should create 2 environments - one for prod, one for dev. Again, there could be some things you want to change in `lifosaur-cdk.ts` to make it work. After that, run `npm start:server`, and it will start a local server.

# Contributing

If you want to propose a feature, or found a bug - [create an issue](https://github.com/astashov/liftosaur/issues) on Github.
