import { ISpotifyRedirect, SpotifyAuth_base64Url, SpotifyAuth_randomString } from "../models/spotifyAuth";

export interface ISpotifyPkce {
  verifier: string;
  state: string;
  codeChallenge: string;
}

const pkceKey = "bebear_spotify_pkce";
const errorKey = "bebear_spotify_error";

export async function SpotifyLoginPlatform_pkce(): Promise<ISpotifyPkce> {
  const verifier = SpotifyAuth_randomString(crypto.getRandomValues(new Uint8Array(64)));
  const state = SpotifyAuth_randomString(crypto.getRandomValues(new Uint8Array(24)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, state, codeChallenge: SpotifyAuth_base64Url(new Uint8Array(digest)) };
}

export function SpotifyLoginPlatform_redirectUri(): string {
  return `${window.location.origin}/app/`;
}

// The page leaves for Spotify, so SpotifyClient_handleRedirect finishes the login after the reload.
export async function SpotifyLoginPlatform_authorize(url: string, pkce: ISpotifyPkce): Promise<ISpotifyRedirect> {
  localStorage.setItem(pkceKey, JSON.stringify({ verifier: pkce.verifier, state: pkce.state }));
  window.location.href = url;
  return { kind: "none" };
}

export function SpotifyLoginPlatform_readPkce(): { verifier?: string; state?: string } {
  try {
    const raw = JSON.parse(localStorage.getItem(pkceKey) ?? "{}");
    return raw != null && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

export function SpotifyLoginPlatform_clearPkce(): void {
  localStorage.removeItem(pkceKey);
}

export function SpotifyLoginPlatform_saveError(message: string): void {
  localStorage.setItem(errorKey, message);
}

export function SpotifyLoginPlatform_takeError(): string | undefined {
  const storage = globalThis.localStorage;
  if (storage == null) {
    return undefined;
  }
  const message = storage.getItem(errorKey) ?? undefined;
  storage.removeItem(errorKey);
  return message;
}
