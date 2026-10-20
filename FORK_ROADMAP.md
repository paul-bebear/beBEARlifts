# beBEARlifts roadmap

Ideas for this fork, with what each one costs and needs. A heading marked "built" is done. The rest are not built yet. Add new ideas at the bottom.

Two rules shape every item. First, the app is a static site, so the page cannot hold a secret. Any paid API key needs a small proxy that keeps the key. A free Cloudflare Worker (100,000 requests a day) is enough, and a Vercel function in `api/` on the same site also works.

Second, `vercel.json` sets `connect-src 'self'` and `src/utils/offlineOnly.ts` blocks other origins. An item that calls an outside API from the page must add that host to both. A same-site function in `api/` needs neither change. The food features use that route.

Facts checked on 2026-10-16.

## Quick notes (per set, per exercise, per session)

- Cost: free. No API, no account.
- Already there: upstream stores notes per exercise (`IHistoryEntry.notes`) and per session (`IHistoryRecord.notes`), and the workout screen can edit them.
- New work: per-set notes. `ISet` in `src/types.ts` has no `notes` field. Add it to the type and its `v.object` schema, then add a text field to the expanded set row.
- Effort: half a day for per-set notes, plus a test for the storage schema.
- Merge risk: a new field in `ISet` touches `src/types.ts`, which upstream changes often. Check whether upstream adds per-set notes first.

## Music: log every song played during a workout (built 2026-10-20)

- Built: Progress → Workout music connects Spotify with PKCE. During a workout `src/components/musicTracker.tsx` polls `currently-playing` every 8 seconds while the app is open. When the app comes back from a locked screen, it fills the gap from `recently-played`. A song heard for half its length, or to within 20 seconds of its end, is kept. Any other song is a skip (`src/models/musicSession.ts`).
- Built: after the workout, the Music screen lists each song with a tick. "Save to Spotify" makes a private playlist of the kept songs. "Play next workout" starts them on the active Spotify device.
- Spotify app: Client ID `3eaf01f171e440139aa2774df77e5f6f`, in Development Mode, 5 users added by email in the dashboard. Registered redirect URI `https://lifts.paulbebear.com/app/`. Local dev also needs `http://127.0.0.1:8080/app/` registered, because Spotify rejects `localhost`.
- Not checked yet: no call has reached the real Spotify API. The playlist endpoints try `POST /me/playlists` and `/playlists/{id}/items` first, then fall back to `/users/{id}/playlists` and `/tracks` on a 404 or 410.
- Checked on an iPhone on 2026-10-20: `played_at` is when a song ended, and it appears in `recently-played` at once. Songs skipped at 1:00 and 2:30 never appeared, so the list holds only songs played to the end. `SpotifyTracks_parseHistory` sets the start to `played_at` minus the song length. Progress → Workout music → "Show Spotify's recently played list (debug)" shows both times.
- Spotify, free to build. Use the Authorization Code with PKCE flow, which needs no server and no secret. `GET /me/player/recently-played` returns the last 50 tracks with a `played_at` time for each. That works with shuffle, and the app can fetch it after the workout ends.
- Spotify limits since February 2026: an app in Development Mode needs its owner to have Spotify Premium. It allows at most 5 users, each added by hand in the developer dashboard. Extended quota is for companies with 250,000+ monthly users, so 5 people is the ceiling for this fork. Spotify also removed several endpoints from Development Mode.
- "Liked this one": Spotify's save-to-library endpoint saves a track for the user. Free. Check its current path in the Web API reference, because the February 2026 migration moved some endpoints.
- Day-specific playlists: the playlist endpoints still work for the user's own playlists in Development Mode. Free.
- Recommendations: Spotify closed its recommendations, audio-features and related-artists endpoints to new apps in November 2024. Build simple ones yourself, for example "songs you liked on leg days".
- Apple Music: MusicKit needs the Apple Developer Program, at $99 a year, to sign the developer token. Each user needs an Apple Music subscription. The recently-played endpoint returns no play time and roughly the last 30 items, so you cannot tell which song played when.
- iOS limit: a Home Screen web app cannot read the "Now Playing" song from the Music or Spotify app, and it stops running when the screen locks. Only Spotify's `played_at` history gets around that.
- Effort: 2 to 3 days for Spotify login, the history fetch and storing tracks on the workout. Add 1 day for likes and playlists.

## Match the song playing to each set (built 2026-10-20)

- Built: `SongPerSet_match` in `src/models/songPerSet.ts` gives each completed set the song playing at its `timestamp`, the time the set was ticked done. It reads the workout's music session, so it needs no extra Spotify call.
- Song windows: a song starts at its `startedAt`. It ends where the next song starts, but never after its full length. A live song never ends before the progress the app last saw. A set in a gap between songs gets no song.
- Shown: under each exercise in the Home tab history card, as "Set 3 · song · artist". The Music screen lists every completed set of the workout under "Song per set", with "no song" for a set that matched nothing.
- Export: Progress → Workout music → "Export music log" writes the `bebear_music` IndexedDB value to a JSON file. `MusicLog_exportJson` leaves out the Spotify tokens, so the refresh token never lands in the file.
- Accuracy: a song paused for a long rest may end early in the match, because the window is capped at the song's length.
- Not possible with Apple Music, because its history has no play times.

## Daily AI-generated warmup

- Needs a paid LLM API. Claude Haiku 5.5 costs $0.10 per million input tokens and $0.50 per million output tokens. One warmup a day (about 500 tokens in, 1,000 out) costs about $0.0006, which is under $0.02 a month per person.
- Needs: an Anthropic account with prepaid credit, and a Cloudflare Worker that holds the API key. The phone calls the Worker, never the API directly.
- Offline: generate the warmup when there is a signal and keep it in local storage, so the gym needs no connection.
- Free fallback: pick from a fixed set of warmups based on the day's exercises. That needs no API.
- Effort: 1 day for the Worker and the call. Add half a day for caching and the UI.

### Can MCP replace the Worker? (checked 2026-10-16)

Upstream replaced its in-app AI generator with an MCP server (`lambda/mcp/`). MCP (Model Context Protocol) lets an AI client such as the Claude app call tools on a server. Upstream's server has about 30 tools, for example `get_history`, `get_program`, `update_program` and `create_history_record`. ishank26/Sabertooth makes the same server configurable for self-hosting (commits 1fd99038a and 3a46a10e1).

The direction is the reverse of the Worker plan. With the Worker, the app calls Claude and pays per token with an API key. With MCP, you open Claude with your own plan, and Claude calls the app's tools. No API key exists anywhere, and the warmup costs nothing beyond your Claude plan.

The blocker is where the data lives. The MCP tools read and write the account data stored on the server (DynamoDB). This fork keeps all data in the phone's IndexedDB. A server cannot reach it, so the MCP server has nothing to read. Claude also reaches a custom connector over public HTTPS with OAuth, so the server must be online. A static Vercel site cannot host it.

Verdict: MCP replaces the Worker only after Phase 2 sync exists. Until then the Worker (or the free fallback) is the only way to get an AI warmup into an offline PWA.

How it would work after Phase 2:

- Deploy upstream's MCP handler next to the sync backend. Sabertooth's access policy shows how to drop the subscription check.
- Add the server as a custom connector in Claude. Check your plan's connector limits first.
- Each morning, ask Claude: "Read today's workout and add a warmup". Claude calls `get_program` and writes the warmup back with `update_program` or as a note. The phone gets it on the next sync and keeps it for the gym.
- Limits: Claude does not run this on its own each day unless you set up a scheduled task. A warmup written as a note needs no app change. A warmup shown as its own block needs UI work.
- Effort: half a day to deploy and connect, once Phase 2 runs. 0 days if the warmup goes into notes.

## Food tracking: barcode scanner (built 2026-10-19)

- Built: the Food tab, with a day switcher, calorie and macro bars, four meal cards, search, recents, quick add, edit and delete, copy from yesterday, and daily targets. The log is stored under the IndexedDB key `bebear_foodlog`.
- Scanner: Safari has no `BarcodeDetector` API, so `src/components/foodBarcodeScanner.tsx` uses `@zxing/browser`, a JavaScript decoder with no wasm. It reads EAN-13, EAN-8, UPC-A and UPC-E.
- Lookups: `api/food/barcode.mjs` and `api/food/search.mjs` call Open Food Facts from the server with the `User-Agent` it asks for. The API is free and needs no key.
- Data: Open Food Facts coverage depends on the country, and some products have no nutrition data. "Quick add" takes calories and macros by hand for those.
- Local run: `npm run start:foodapi` serves the functions on port 3010 for `npm run start:offline`.
- Checked 2026-10-19 on an iPhone Home Screen app: most scans work. Niche imports such as Samyang Buldak ramen did not.
- Added after that (2026-10-19):
  - The parser reads `product_name_en` and other localized names when `product_name` is empty, and converts per-serving values to per 100 g using `serving_size` (`src/models/openFoodFacts.ts`).
  - USDA FoodData Central is the second barcode source (`api/food/usda.mjs`, `src/models/usdaFoodData.ts`). It is free with an api.data.gov key in `FDC_API_KEY`, at 1,000 requests an hour. It only covers products sold in the US.
  - A miss offers "Photo the nutrition label" (`src/components/foodLabelPanel.tsx`, `src/models/nutritionLabel.ts`). The food is saved in `savedFoods` under its barcode (`src/models/savedFoods.ts`), so the next scan finds it on the phone.
- Not checked yet: live USDA lookups and a live label read. This session's network blocked both hosts.
- Other sources looked at: Nutritionix, FatSecret and Edamam have barcode lookup, but it is paid or limited on their free tiers. Check current pricing before adding one.

## Food tracking: photo scanner (built 2026-10-19)

- Built: AI Scan (a photo, with an optional note) and Describe (text only) on the add screen. The phone shrinks the photo to a 1024 px JPEG (`src/utils/imageResize.ts`). You review each item and its grams before it goes in the basket.
- Provider: `api/food/photo.mjs` calls Gemini when `GEMINI_API_KEY` is set, through Google's OpenAI-compatible endpoint, with `gemini-flash-lite-latest` on the free tier. Google may use free-tier prompts to improve its products. Without that key it calls `anthropic/claude-haiku-5.5` through Vercel AI Gateway with the OIDC token.
- Cost per call, checked 2026-10-19: Claude Haiku 5.5 is $0.10 in and $0.50 out per million tokens. A 1024 × 768 photo is about 1,050 tokens, so a photo is about $0.0003 and a description about $0.0002. Claude Sonnet 5.5, the first default, was about $0.006 per photo.
- Accuracy: calorie estimates from a photo have wide error, often 20 to 30% for mixed dishes. The review step lets you fix grams. Describe asks a question or suggests a photo when the text is too vague.
- Not checked yet: no live AI call has run. The first try needs `GEMINI_API_KEY` in Vercel, or AI Gateway credit on the Vercel team.

## Tab bar, Progress dashboard and story card (built 2026-10-19)

- Tab bar: Home, Program, Workout, Food, Progress, two on each side. Progress replaces Graphs and Me in the offline build. The upstream build keeps six tabs, so `footer2.tsx` has one branch for each.
- Progress opens the Me screens on its own stack, so they get a back arrow. `renderMeScreens` in both navigators registers the Me screen list twice.
- Story card: drawn with html-to-image at 3× from a 360 × 640 view. It shares through the iOS share sheet from a Home Screen app.
- Not checked yet: sharing the PNG to Instagram from an iPhone.

## Phase 2: cloud sync and sharing with friends

- Built (2026-10-20): optional Supabase cloud backup with email-code sign-in, uploads after workouts, manual backup and confirmed restore. Settings → Import / Export holds the controls. The private `backups` bucket stores `latest.json` and seven weekday copies per account. Cloud and Spotify tokens stay out of exports. This saves whole files. Multi-device merge and sharing with friends remain unbuilt.

For multi-device sync and sharing, compare these three options. The Docker option is the first one to try.

- Deploy upstream's AWS backend: `liftosaur-cdk/`, Lambda, DynamoDB and S3. The sync code then works as written. It needs an AWS account, a domain, and the 16 credentials in `lftAppSecrets`. Lambda and DynamoDB free tiers may cover a few users, but CloudFront, Route 53 and Secrets Manager cost a few dollars a month.
- Replace it with Supabase (Postgres, auth and storage). The free tier pauses a project after 1 week without activity. It means rewriting the client side of `/api/sync2`, which is the most complex part of the app. A simpler first step is a JSON backup to a Supabase table with no merge logic.
- Self-host upstream's backend in Docker, following kai119/liftosaur (AGPL-3.0, last push 2026-08-29). It keeps upstream's backend code and sync logic and removes AWS. `docker-compose.yml` runs ScyllaDB's DynamoDB-compatible API (Alternator) in place of DynamoDB and SeaweedFS in place of S3. Secrets come from a file generated on first run, and logs go to local files. SES email and the email password reset are gone; an admin script resets passwords. The app server itself still runs with Node outside Docker.
- What the Docker option needs: a small always-on machine with about 1 GB of RAM for ScyllaDB (`--memory 750M`), a domain with HTTPS, and a backup of the two Docker volumes. A home server or a VPS at about $5 a month fits.
- kai119's config module (`config.js` and `src/config.ts`) comes with it. It replaces every hardcoded liftosaur.com host with one `HOST` variable and touches 67 files. It does not simplify the offline flag, which overrides three values in `webpack.config.js`, so it is not ported now. Port it together with the Docker backend.
- Effort for the Docker option: 1 to 2 days to merge kai119's branch onto current upstream (it is 309 commits behind), plus half a day to deploy. Merge conflicts grow with every upstream release, so rebase it shortly before starting.

## Copy exercise images into the fork

- Today: `vercel.json` sends `/externalimages/*` to upstream's S3 bucket (`liftosaurimages2`). The service worker caches each image after its first view. If upstream moves, renames or locks the bucket, images stop loading for exercises not yet cached.
- Size: 374 small images (about 15 KB each) and 374 large ones (about 180 KB each), so about 70 MB. Converting the large ones to WebP would cut that to roughly 20 MB, but then `src/models/exerciseImage.ts` must change its `.png` paths.
- How: a script downloads every key in `availableSmallImages` and `availableLargeImages` to the same paths under a folder that the build copies into `dist/externalimages/exercises/`. Then remove the rewrite from `vercel.json`. `ExerciseImageUtils_url` keeps its paths, so the app code does not change.
- Where: committing 70 MB into git makes every clone 70 MB bigger. Two alternatives: download the images in the Vercel build step (still needs the bucket at build time, not at run time), or keep them in a separate repo or a Vercel Blob store.
- Licence check first: upstream's `add-exercise` skill says the illustrations are bought from gymvisual.com. They are not in upstream's git repo, so the AGPL may not cover them. Ask Anton Astashov, or read gymvisual's licence, before putting the files in a public repo. The current proxy serves the same files, so it raises the same question at a smaller scale.
- New exercises: the four exercises added from other forks have no images in the bucket. Once the images live in the fork, we can add our own pictures for them.
- Effort: 2 hours for the download script and the build copy, once the licence question is settled.

## Apple-style monochrome theme (built 2026-10-17 as an option)

- Built: Settings → Appearance → Monochrome. It works with Light, Dark and System. It overrides 7 accent variables and adds a root `grayscale(1)` filter in `src/index.html`, so upstream's token files stay as they are.
- Not done: a full generated grey token set. Icons that read colours from JS (`Tailwind_colors()`, `Tailwind_semantic()`) go grey through the filter, so they turn mid-grey, not pure black. A generated token set would fix that, for about 1 day of work.
- Source: yeivier/liftosaur-javier- (AGPL-3.0), commit fd3fe898e.
- What it does: every colour token in `tailwind.semantic.json` and `tailwind.colors.json` becomes a grey of the same lightness. Active controls are pure black (light mode) or white (dark mode). On web the font becomes the system font stack, which is San Francisco on iPhone. A `grayscale(1)` filter on `<html>` turns the illustrations grey.
- Merge cost: it rewrites the two token files (876 lines added, 464 removed). Upstream edits those files often, so every upstream merge would conflict there.
- Better shape for this fork: add it as a fourth choice in Settings → Theme (System, Light, Dark, Mono) with its own token set. Then upstream's files stay as they are.
- Effort: 1 day as a selectable theme, mostly a script that generates the grey tokens from upstream's on each build.

## Fork review backlog (2026-10-16)

Items found while comparing six public forks. Each is left out on purpose for now.

- ishank26/Sabertooth: guards in `src/utils/iap.native.ts` stop App Store and Play Store calls. The PWA never loads that file, so it only matters for a native build.
- ishank26/Sabertooth: `personal/` is a separate 574-line PWA, not Liftosaur. Nothing to reuse.
- shoriminimoe/liftosaur: deletes the subscription screen, the paywall overlay (`locker.tsx`), the coupon modal and the Instagram and TikTok sharing, about 2,900 lines in all. Our single `Subscriptions_hasSubscription` switch already hides every one of these in the PWA, and the PWA shows no Instagram or TikTok buttons. Deleting the files would make each upstream merge conflict.
- shoriminimoe/liftosaur: a configurable over-the-air update URL and an Android APK build in CI. Native only.
- Finish screen "Copy Link" still shows on the PWA. It needs an account, so in the offline build it only says "You should be logged in". Hide it in `src/components/screenFinishDay.tsx` (10 minutes, one more file in the merge list).
- Me → "Contact Us", "Privacy Policy" and "Terms & Conditions" point at liftosaur.com and Liftosaur's own service. Decide whether this fork needs its own text.
- EqyMMxpb/liftosaur, commit 0203a735f: Farmers Walk, smith-machine Standing Calf Raise and EZ-bar Upright Row. Not requested. None have images in the bucket.
- EqyMMxpb/liftosaur, commit d58d490d5: the Chest Press muscle fix is already in upstream.
