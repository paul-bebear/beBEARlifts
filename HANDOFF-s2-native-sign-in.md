# Codex handoff: S2, Sign in with Apple and Google in the iPhone app

Status: implemented on `codex/s2-native-sign-in`. Provider setup and iPhone validation remain with the owner.

Validation passes: TypeScript, changed-file ESLint, 42 relevant tests, React Native iOS codegen, plist validation and the bridge's Objective-C++ syntax check.

Setup and debugging details are in `docs/features/native-sign-in.md`.

S2 is a V1 batch. The owner uses only the iPhone app, and Apple and Google sign-in work only on the web today (S1, `src/utils/supabaseOAuth.ts`). The spec is the Sign-in section of `REDESIGN_PLAN.md`, "Flow in the native build". Read it first.

## What to build

Add `src/utils/supabaseOAuth.native.ts`, the native twin of `src/utils/supabaseOAuth.ts`, with the same exports so the screens that call the web version work unchanged on iPhone.

- Apple: `@invertase/react-native-apple-authentication` is installed. Generate a nonce, pass its SHA-256 to Apple, and send the raw nonce with the identity token: `POST https://qvqwvuuwfueccrmzwyct.supabase.co/auth/v1/token?grant_type=id_token` with `{ provider: "apple", id_token, nonce }`.
- Google: `@react-native-google-signin/google-signin` is installed. Configure it with the iOS client ID, take `idToken`, and send the same endpoint with `{ provider: "google", id_token }`.
- The answer has the same shape as the email-code verify, so `SupabaseClient_saveSession` in `src/utils/supabaseClient.ts` stores it unchanged.
- The App Store requires Sign in with Apple in any app that offers Google sign-in. Both ship together.
- A cancelled sign-in shows nothing. A failed one shows one plain line and leaves the email-code fallback in place.
- Request building and response parsing go in a pure module with a mocha test, for example `src/models/nativeIdTokenSignIn.ts` and `test/nativeIdTokenSignIn.test.ts`. The `.native.ts` file only calls the SDKs and `fetch`.

iOS project changes.

- `ios/Liftosaur/Liftosaur.entitlements`: add `com.apple.developer.applesignin` with `Default`.
- `ios/Liftosaur/Info.plist`: add the Google reversed client ID to `CFBundleURLTypes`. `NATIVE_PLAN.md` removed it earlier. Read the client ID from a build setting in `ios/AppBranding.xcconfig`, not a literal in the plist.
- `src/utils/forkServices.ts` and `test/forkServices.test.ts`: allow the two SDKs in the offline build.

## What the owner sets up

The code cannot finish without these. List them at the top of the PR body as a checklist.

- Apple: turn on "Sign in with Apple" for App ID `com.paulbebear.bebear` on Victor's team, `GKY9GR7VHG`. Then regenerate the dev profile: `npm run ios-signing -- profiles dev`.
- Google Cloud: an OAuth client of type iOS with bundle ID `com.paulbebear.bebear`. Its client ID goes in `ios/AppBranding.xcconfig` and in Supabase → Authentication → Providers → Google → Authorized Client IDs.
- Supabase → Providers → Apple: add `com.paulbebear.bebear` to the Client IDs next to the web Services ID.

## Rules

- Read `CLAUDE.md` and `AGENTS.md` first. Their prose and comment rules apply to code, tests and the PR body.
- Logic lives in pure modules with mocha tests. Views and `.native.ts` wrappers stay thin.
- Never log or store a token or nonce outside the existing `bebear_cloud` session store.
- No iOS Simulator and no browser testing. The owner tests on their iPhone.
- No AI attribution lines in commits.
- Verify with `npx tsc --noEmit`, eslint on changed files, and each changed test file with `npm run onetest -- test/<file>.test.ts`.
- Work on branch `codex/s2-native-sign-in` from `handoff-s2-native-sign-in`. Open the PR against `master` with `[skip deploy]` in the title.
- End the PR body with a "Check on your iPhone" list: Sign in with Apple works, Google works, cancel shows nothing, and the email code still works.
