# Handoff: music tracker and playlist maker

Phase 1 of 4 done. The pure modules and their tests are on this branch. The Spotify client, the tracker, the Music screen and the docs are not started.

## Start here

```bash
git fetch origin claude/kind-brahmagupta-7kt1im
git checkout claude/kind-brahmagupta-7kt1im
npm install
npx mocha -r ts-node/register test/musicSession.test.ts   # 13 passing
npx tsc --noEmit
```

Then paste this into Claude Code: "Read HANDOFF-music.md and continue from the next step. Merge the PR when done, I approved that."

## What the feature does

During a workout, the app polls Spotify for the song that plays. A song heard for at least half its length, or to within 20 seconds of its end, is kept. Any other song is a skip. After the workout, the user reviews the list, unticks songs, and saves the kept songs as a Spotify playlist. The user can also replay the list at the next workout.

## Fixed facts

- Spotify Client ID: `3eaf01f171e440139aa2774df77e5f6f`. PKCE has no client secret, so the ID goes in code.
- Redirect URI: `https://lifts.paulbebear.com/app/`. It is registered in the Spotify dashboard. For local dev, add `http://127.0.0.1:8080/app/` there too. Spotify rejects `localhost`.
- The app is in Spotify Development Mode. That allows 5 users, each added by email in the dashboard. The owner has Premium.
- The app is the offline-only PWA build (`LFT_OFFLINE_ONLY=1`). Data lives in IndexedDB.

## Done in phase 1

- `src/models/spotifyAuth.ts`: the authorize URL, the redirect check against the saved `state`, the token request bodies, token parsing, and the refresh rule (60 seconds before expiry).
- `src/models/spotifyTracks.ts`: parses tracks, `currently-playing` and `recently-played`. It drops podcast episodes.
- `src/models/musicSession.ts`: the skip state machine. `MusicSession_observe` takes one poll result. A pause or a 204 leaves the song open, so a rest between sets is not a skip. A jump back of more than 15 seconds on one song is a restart and a new play. `MusicSession_mergeHistory` adds songs that played while the phone was locked. They come in as kept, for the user to review.
- `src/models/musicLog.ts`: the stored shape (`IMusicLog`), with tokens, the display name and at most 60 sessions. `MusicLog_parse` checks every stored field.
- `test/musicSession.test.ts`: 13 tests over all four modules.

## Next steps, in order

### Phase 2: Spotify client and store

1. `src/utils/musicStore.ts`. Copy the pattern of `src/utils/foodLogStore.ts`. Use the IndexedDB key `bebear_music` and parse with `MusicLog_parse`.
2. `src/utils/spotifyClient.ts`.
   - `login()` makes a random 64-character verifier and its S256 challenge with `crypto.subtle.digest`. It saves `{verifier, state}` in `localStorage` under `bebear_spotify_pkce`, then sets `location.href` to `SpotifyAuth_authorizeUrl(...)`.
   - `handleRedirect()` reads the URL with `SpotifyAuth_readRedirect`. On a code, it POSTs `SpotifyAuth_codeBody` to `https://accounts.spotify.com/api/token`, saves the tokens, and calls `history.replaceState` with `SpotifyAuth_cleanUrl`.
   - `api(path, init)` refreshes tokens when `SpotifyAuth_needsRefresh` says so. After a 401 it refreshes once and retries once.
3. Call `handleRedirect()` in `src/index.tsx`, after the fetch guard is installed.
4. Open the network for two hosts: `https://api.spotify.com` and `https://accounts.spotify.com`.
   - Add both to `connect-src` in `vercel.json`.
   - Add both to the allowlist in `src/utils/offlineOnly.ts`, with a test in the existing offline-only test file.
   - In `src/webpushr-sw.ts`, return early for `spotify.com` hosts, the same way it does for `/api/food/*`.

### Phase 3: tracker

5. A `MusicTracker` component that renders `null`. Mount it in `src/components/app.tsx` after the `NavigationContainer`, only when `OfflineOnly_isEnabled()`.
   - While `storage.progress[0]` exists and the page is visible, poll `GET /v1/me/player/currently-playing` every 8 seconds. Feed it to `MusicSession_observe`. The session id is the progress id.
   - When the page becomes visible again, call `GET /v1/me/player/recently-played?limit=50` and feed it to `MusicSession_mergeHistory`. iOS stops the web app while the screen is locked, so this fills the gap.
   - When the progress goes away, call `MusicSession_finish` and save.
   - Keep the timer and the fetches in the component. Keep every decision in the pure modules. `scripts/lint-views.ts` checks this.

### Phase 4: Music screen

6. A Music screen, reached from the Progress dashboard and from the workout finish screen.
   - A Connect button, or the display name from `GET /v1/me` and a Disconnect button.
   - The list of sessions. Each session shows its plays with a tick circle, built on `MusicSession_setKept`.
   - "Save to Spotify". Try `POST /v1/me/playlists` first. On 404, use `POST /v1/users/{id}/playlists`. Add tracks with `POST /v1/playlists/{id}/items`, and fall back to `/tracks`. Send at most 100 URIs per call.
   - "Play next workout". Send `PUT /v1/me/player/play` with `{ uris }`. A 404 means no active device, so tell the user to open Spotify first.
   - A debug view that lists raw `recently-played` items with `played_at` and `duration_ms`. Nobody has confirmed if `played_at` marks the start or the end of a song. Check it on the phone. If it marks the end, subtract `durationMs` in `SpotifyTracks_parseHistory` and update the test.
7. A browser test that routes Spotify responses with `page.route`. Run `npm run build:pwa` and the lint.
8. Update `README.md` and `FORK_ROADMAP.md`. Open a PR from this branch to `master` and merge it. The user approved merging without asking.
9. Delete this file in the same PR.

## Open risks

- The two playlist endpoint pairs come from Spotify's 2024 to 2026 API changes. Nobody tested them live. The fallbacks cover both shapes.
- The cloud session that wrote phase 1 had no network to Spotify. Nothing here ran against the real API.

## Other things the user still has to test

- On the phone: barcode scan, Describe, AI Scan, the story card share to Instagram, the USDA lookup.
- In Vercel: add `GEMINI_API_KEY`, then redeploy. Without it, the photo and Describe calls use AI Gateway.
