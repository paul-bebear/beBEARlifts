import {
  IOAuthProvider,
  IOAuthReturn,
  OAuthFlow_authorizeUrl,
  OAuthFlow_cleanPath,
  OAuthFlow_exchangeErrorText,
  OAuthFlow_nextStep,
  OAuthFlow_notSetUpText,
  OAuthFlow_providerEnabled,
  OAuthFlow_readReturn,
  OAuthFlow_redirectTo,
} from "../models/oauthFlow";
import { SpotifyAuth_base64Url, SpotifyAuth_randomString } from "../models/spotifyAuth";
import {
  CloudStore,
  ICloudResult,
  SupabaseClient_call,
  SupabaseClient_exchangeCode,
  SupabaseClient_readJson,
  Supabase_origin,
} from "./supabaseClient";

// A popup or target="_blank" opens Safari with its own storage, so the Home Screen app would never see the verifier.
export async function SupabaseOAuth_start(provider: IOAuthProvider): Promise<ICloudResult<undefined>> {
  const settings = await SupabaseClient_call("/auth/v1/settings", { method: "GET" });
  if (!settings.ok) {
    return settings;
  }
  if (!OAuthFlow_providerEnabled(await SupabaseClient_readJson(settings.value), provider)) {
    return { ok: false, error: OAuthFlow_notSetUpText(provider) };
  }
  const verifier = SpotifyAuth_randomString(crypto.getRandomValues(new Uint8Array(64)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  await CloudStore.update((state) => ({
    ...state,
    pending: { provider, verifier, startedAt: Date.now() },
    signInError: undefined,
  }));
  window.location.assign(
    OAuthFlow_authorizeUrl({
      supabaseOrigin: Supabase_origin,
      provider,
      redirectTo: OAuthFlow_redirectTo(window.location.origin),
      codeChallenge: SpotifyAuth_base64Url(new Uint8Array(digest)),
    })
  );
  return { ok: true, value: undefined };
}

// Runs before the Spotify redirect handler, which would read the same ?code= as its own.
export function SupabaseOAuth_takeReturn(): IOAuthReturn {
  const ret = OAuthFlow_readReturn(window.location.href);
  if (ret.kind !== "none") {
    window.history.replaceState(window.history.state, "", OAuthFlow_cleanPath);
  }
  return ret;
}

export async function SupabaseOAuth_finishReturn(ret: IOAuthReturn): Promise<void> {
  if (ret.kind === "none") {
    return;
  }
  try {
    const step = OAuthFlow_nextStep(ret, (await CloudStore.load()).pending, Date.now());
    await CloudStore.update((state) => ({ ...state, pending: undefined, signInError: undefined }));
    const error =
      step.kind === "error"
        ? step.message
        : await SupabaseClient_exchangeCode(step.code, step.verifier).then((result) =>
            result.ok ? undefined : OAuthFlow_exchangeErrorText(result.error)
          );
    if (error != null) {
      await CloudStore.update((state) => ({ ...state, signInError: error }));
    }
  } catch (e) {
    console.error(e);
  }
}
