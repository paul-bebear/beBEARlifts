import InAppBrowser from "react-native-inappbrowser-reborn";
import {
  ISpotifyRedirect,
  SpotifyAuth_codeChallenge,
  SpotifyAuth_nativeRedirectUri,
  SpotifyAuth_randomString,
  SpotifyAuth_readAuthSession,
} from "../models/spotifyAuth";
import { RandomBytes_get } from "./randomBytes";

export interface ISpotifyPkce {
  verifier: string;
  state: string;
  codeChallenge: string;
}

let lastError: string | undefined;

export async function SpotifyLoginPlatform_pkce(): Promise<ISpotifyPkce> {
  const verifier = SpotifyAuth_randomString(RandomBytes_get(64));
  const state = SpotifyAuth_randomString(RandomBytes_get(24));
  return { verifier, state, codeChallenge: SpotifyAuth_codeChallenge(verifier) };
}

export function SpotifyLoginPlatform_redirectUri(): string {
  return SpotifyAuth_nativeRedirectUri;
}

// The JS context stays alive while the login sheet is open, so the verifier stays in memory and never touches storage.
export async function SpotifyLoginPlatform_authorize(url: string, pkce: ISpotifyPkce): Promise<ISpotifyRedirect> {
  try {
    const result = await InAppBrowser.openAuth(url, SpotifyAuth_nativeRedirectUri, { ephemeralWebSession: false });
    return SpotifyAuth_readAuthSession(result, pkce.state);
  } catch {
    return { kind: "error", message: "Could not open the Spotify login. Try again." };
  }
}

export function SpotifyLoginPlatform_readPkce(): { verifier?: string; state?: string } {
  return {};
}

export function SpotifyLoginPlatform_clearPkce(): void {
  return undefined;
}

export function SpotifyLoginPlatform_saveError(message: string): void {
  lastError = message;
}

export function SpotifyLoginPlatform_takeError(): string | undefined {
  const message = lastError;
  lastError = undefined;
  return message;
}
