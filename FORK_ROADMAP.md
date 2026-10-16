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

Not started. When we start, compare these two options:

- Deploy upstream's AWS backend: `liftosaur-cdk/`, Lambda, DynamoDB and S3. The sync code then works as written. It needs an AWS account, a domain, and the 16 credentials in `lftAppSecrets`. Lambda and DynamoDB free tiers may cover a few users, but CloudFront, Route 53 and Secrets Manager cost a few dollars a month.
- Replace it with Supabase (Postgres, auth and storage). The free tier pauses a project after 1 week without activity. It means rewriting the client side of `/api/sync2`, which is the most complex part of the app. A simpler first step is a JSON backup to a Supabase table with no merge logic.
