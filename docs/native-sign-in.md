# Native Apple and Google sign-in

The iPhone app exchanges native Apple and Google identity tokens for the existing `bebear_cloud` session.

## Owner setup

- Enable Sign in with Apple for `com.paulbebear.bebear` on Victor's team, `GKY9GR7VHG`.
- Regenerate the development profile with `npm run ios-signing -- profiles dev`.
- Create a Google Cloud OAuth client of type iOS for `com.paulbebear.bebear`.
- Set `GOOGLE_IOS_CLIENT_ID` in `ios/AppBranding.xcconfig` to that client's full ID.
- Set `GOOGLE_REVERSED_CLIENT_ID` in that file to Google's matching iOS URL scheme.
- Add the iOS client ID to Supabase → Authentication → Providers → Google → Authorized Client IDs.
- Add `com.paulbebear.bebear` to Supabase → Authentication → Providers → Apple → Client IDs beside the web Services ID.
- Run `npm run pod-install` after pulling the bridge changes. React Native codegen generates the bridge bindings during pod installation.
- Rebuild the iPhone app after changing either Google setting or the Apple capability.

Both Google settings start empty. Missing settings produce “Google sign-in is not set up yet.”

## Exchange

`src/utils/supabaseOAuth.native.ts` has the web module's three exports. Metro selects this native file for the existing buttons.

```text
SupabaseOAuth_start(provider)
  Clear stale web pending state and sign-in errors
  Apple SDK or Google SDK
    Cancellation → return success without creating a session
    Missing credentials → return one plain error
    Credentials → POST /auth/v1/token?grant_type=id_token
      SupabaseClient_saveSession → bebear_cloud
```

`src/models/nativeIdTokenSignIn.ts` parses SDK responses and constructs the provider body. `SupabaseClient_saveSession` parses Supabase's response.

Apple authentication 2.5.1 generates a 32-character nonce with `SecRandomCopyBytes`. Its native implementation hashes that nonce before sending it to Apple.

The exchange sends the returned raw nonce with `identityToken`. Hashing the nonce before calling this SDK would hash it twice.

Google sends `data.idToken` without a nonce. Both providers use the existing publishable key and session persistence.

SDK errors return fixed text. Connection failures return “No connection”. Provider tokens and nonces stay in the current async call.

The native return handlers do nothing because native SDKs complete the sign-in operation inside the app.

## iOS configuration

`Info.plist` expands the two Google build settings into `BebearGoogleClientID` and `CFBundleURLTypes`.

`RCTBebearSignInConfig` reads those public values from the built app. Its TurboModule exposes the client ID and registered schemes.

`NativeIdTokenSignIn_googleConfiguration` requires a valid client ID and its matching reversed scheme before calling Google.

Google's installed SDK throws native exceptions for missing configuration. Its React Native wrapper catches those exceptions only in Debug.

The custom `BebearGoogleClientID` key avoids Google initializing from an empty `GIDClientID` before validation.

`SceneDelegate.handleOpen` gives Google the callback URL before other URL handlers. Both cold-start and foreground callbacks use this method.

`Liftosaur.entitlements` requests `com.apple.developer.applesignin` with `Default`. The provisioning profile must allow that capability.

`package.json` registers the TurboModule provider. `project.pbxproj` compiles its Objective-C++ implementation into the iPhone target.

`ForkServices_plan` enables `appleSignIn` and `googleSignIn` in the offline fork while keeping upstream login disabled.

## Verification

- `npx tsc --noEmit`
- ESLint on the changed TypeScript files.
- `npm run onetest -- test/nativeIdTokenSignIn.test.ts`
- `npm run onetest -- test/supabaseOAuthNative.test.ts`
- `npm run onetest -- test/forkServices.test.ts`
- `npm run onetest -- test/supabaseClient.test.ts`
- `npm run onetest -- test/cloudBackupForm.test.ts`
- React Native iOS code generation and plist validation.
- Objective-C++ syntax check for the bridge against generated headers and the iPhone SDK.

The adapter tests replace the native SDKs and run the real Supabase request and session code against a fake network.

## Debugging map

- Setup error before Google's sheet opens → check both Google settings and the installed app's registered scheme.
- Google does not return to the app → check `CFBundleURLTypes` and `SceneDelegate.handleOpen`.
- Google exchange fails → check Supabase's authorized iOS client ID.
- Apple authorization fails → check the App ID capability, team and regenerated profile.
- Apple exchange fails → check Supabase's native Client ID and raw nonce handling.
- Missing native module → rerun pod installation and rebuild the app.
- Session parsing or saving fails → inspect `SupabaseClient_saveSession` and `CloudBackup_sessionFromAuth` without logging credentials.
