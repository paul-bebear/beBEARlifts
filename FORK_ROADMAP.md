# beBEARlifts roadmap

Ideas for this fork, with what each one costs and needs. Nothing here is built yet. Add new ideas at the bottom.

Two rules shape every item. First, the app is a static site with no server, so it cannot hold a secret. Any paid API key needs a small proxy that keeps the key, and a free Cloudflare Worker (100,000 requests a day) is enough. Second, `vercel.json` sets `connect-src 'self'` and `src/utils/offlineOnly.ts` blocks other origins. Each item that calls an outside API must add that host to both.

Facts checked on 2026-10-16.

## Quick notes (per set, per exercise, per session)

- Cost: free. No API, no account.
- Already there: upstream stores notes per exercise (`IHistoryEntry.notes`) and per session (`IHistoryRecord.notes`), and the workout screen can edit them.
- New work: per-set notes. `ISet` in `src/types.ts` has no `notes` field. Add it to the type and its `v.object` schema, then add a text field to the expanded set row.
- Effort: half a day for per-set notes, plus a test for the storage schema.
- Merge risk: a new field in `ISet` touches `src/types.ts`, which upstream changes often. Check whether upstream adds per-set notes first.

## Music: log every song played during a workout

- Spotify, free to build. Use the Authorization Code with PKCE flow, which needs no server and no secret. `GET /me/player/recently-played` returns the last 50 tracks with a `played_at` time for each. That works with shuffle, and the app can fetch it after the workout ends.
- Spotify limits since February 2026: an app in Development Mode needs its owner to have Spotify Premium. It allows at most 5 users, each added by hand in the developer dashboard. Extended quota is for companies with 250,000+ monthly users, so 5 people is the ceiling for this fork. Spotify also removed several endpoints from Development Mode.
- "Liked this one": Spotify's save-to-library endpoint saves a track for the user. Free. Check its current path in the Web API reference, because the February 2026 migration moved some endpoints.
- Day-specific playlists: the playlist endpoints still work for the user's own playlists in Development Mode. Free.
- Recommendations: Spotify closed its recommendations, audio-features and related-artists endpoints to new apps in November 2024. Build simple ones yourself, for example "songs you liked on leg days".
- Apple Music: MusicKit needs the Apple Developer Program, at $99 a year, to sign the developer token. Each user needs an Apple Music subscription. The recently-played endpoint returns no play time and roughly the last 30 items, so you cannot tell which song played when.
- iOS limit: a Home Screen web app cannot read the "Now Playing" song from the Music or Spotify app, and it stops running when the screen locks. Only Spotify's `played_at` history gets around that.
- Effort: 2 to 3 days for Spotify login, the history fetch and storing tracks on the workout. Add 1 day for likes and playlists.

## Match the song playing to each set

- Cost: free with Spotify. Not possible with Apple Music, because its history has no play times.
- How: each completed set already stores a completion time. After the workout, fetch `recently-played` and give each set the track whose `played_at` window contains the set's time.
- Accuracy: about one song length. Spotify records a play when the track starts, so a set near a track change can get the previous song.
- Effort: 1 day on top of the Spotify work, mostly a pure matching function with tests.

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

## Food tracking: barcode scanner

- Cost: free. The Open Food Facts API needs no key. It asks callers to send a descriptive `User-Agent` and to stay within its rate limits.
- iOS limit: Safari does not support the `BarcodeDetector` API. Use a JavaScript decoder such as `zxing-wasm` on the camera stream. Camera access works in Home Screen web apps.
- Data: Open Food Facts coverage depends on the country, and some products have no nutrition data. Plan a manual entry screen.
- Effort: 3 to 4 days. This is a new area of the app (food log, daily totals, storage), not a change to an existing screen.

## Food tracking: photo scanner

- Needs a paid vision API. Claude Haiku 5.5 takes image input. A phone photo is about 1,500 input tokens, so a few photos a day cost under $0.05 a month.
- Needs: the same Anthropic account and Cloudflare Worker as the warmup.
- Accuracy: calorie estimates from a photo have wide error, often 20 to 30% for mixed dishes. Show the result as an editable estimate.
- Effort: 1 to 2 days on top of the barcode food log.

## Phase 2: cloud sync and sharing with friends

Not started. When we start, compare these three options. The Docker option is the first one to try.

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

## Apple-style monochrome theme (candidate)

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
