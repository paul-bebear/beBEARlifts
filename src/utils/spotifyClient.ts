import {
  ISpotifyRedirect,
  ISpotifyTokens,
  SpotifyAuth_authorizeUrl,
  SpotifyAuth_cleanUrl,
  SpotifyAuth_codeBody,
  SpotifyAuth_needsRefresh,
  SpotifyAuth_parseTokens,
  SpotifyAuth_readRedirect,
  SpotifyAuth_refreshBody,
} from "../models/spotifyAuth";
import {
  ISpotifyHistoryItem,
  ISpotifyNowPlaying,
  SpotifyTracks_parseHistory,
  SpotifyTracks_parseNowPlaying,
} from "../models/spotifyTracks";
import {
  ISpotifyPlaylistRef,
  ISpotifyProfile,
  SpotifyPlaylist_chunks,
  SpotifyPlaylist_parseCreated,
  SpotifyPlaylist_parseProfile,
  SpotifyPlaylist_playError,
  SpotifyPlaylist_shouldFallBack,
} from "../models/spotifyPlaylist";
import { MusicLog_disconnect } from "../models/musicLog";
import { MusicStore_load, MusicStore_update } from "./musicStore";
import {
  SpotifyLoginPlatform_authorize,
  SpotifyLoginPlatform_clearPkce,
  SpotifyLoginPlatform_pkce,
  SpotifyLoginPlatform_readPkce,
  SpotifyLoginPlatform_redirectUri,
  SpotifyLoginPlatform_saveError,
  SpotifyLoginPlatform_takeError,
} from "./spotifyLoginPlatform";

// PKCE has no client secret, so the client ID is public by design.
const clientId = "3eaf01f171e440139aa2774df77e5f6f";
const tokenUrl = "https://accounts.spotify.com/api/token";
const apiBase = "https://api.spotify.com/v1";

export const SpotifyClient_testerLimitMessage =
  "This Spotify app allows 5 testers. Ask Paul to add your Spotify email.";

export type ISpotifyResult<T> = { ok: true; value: T } | { ok: false; message: string };

// The web leaves the page here. The iPhone app returns after the login sheet closes, with the tokens saved.
export async function SpotifyClient_login(): Promise<void> {
  const pkce = await SpotifyLoginPlatform_pkce();
  const redirect = await SpotifyLoginPlatform_authorize(
    SpotifyAuth_authorizeUrl({
      clientId,
      redirectUri: SpotifyLoginPlatform_redirectUri(),
      state: pkce.state,
      codeChallenge: pkce.codeChallenge,
    }),
    pkce
  );
  await finishLogin(redirect, pkce.verifier);
}

export function SpotifyClient_takeError(): string | undefined {
  return SpotifyLoginPlatform_takeError();
}

let cameBackFromLogin = false;

export function SpotifyClient_takeCameBackFromLogin(): boolean {
  const result = cameBackFromLogin;
  cameBackFromLogin = false;
  return result;
}

export async function SpotifyClient_handleRedirect(): Promise<boolean> {
  const pkce = SpotifyLoginPlatform_readPkce();
  const redirect = SpotifyAuth_readRedirect(window.location.href, pkce.state);
  if (redirect.kind === "none") {
    return false;
  }
  cameBackFromLogin = true;
  window.history.replaceState(window.history.state, "", SpotifyAuth_cleanUrl(window.location.href));
  SpotifyLoginPlatform_clearPkce();
  await finishLogin(redirect, pkce.verifier ?? "");
  return true;
}

async function finishLogin(redirect: ISpotifyRedirect, verifier: string): Promise<void> {
  if (redirect.kind === "none") {
    return;
  }
  if (redirect.kind === "error") {
    SpotifyLoginPlatform_saveError(redirect.message);
    return;
  }
  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: SpotifyAuth_codeBody({
        clientId,
        redirectUri: SpotifyLoginPlatform_redirectUri(),
        code: redirect.code,
        verifier,
      }),
    });
    const tokens = SpotifyAuth_parseTokens(await response.json(), Date.now());
    if (!response.ok || tokens == null) {
      SpotifyLoginPlatform_saveError(`Spotify login failed (error ${response.status}).`);
      return;
    }
    await MusicStore_update((log) => ({ ...log, tokens }));
    const profile = await SpotifyClient_profile();
    if (profile != null) {
      await MusicStore_update((log) => ({ ...log, displayName: profile.displayName }));
    }
  } catch {
    SpotifyLoginPlatform_saveError("Could not reach Spotify. Check the connection and try again.");
  }
}

let refreshing: Promise<ISpotifyTokens | undefined> | undefined;

function refresh(tokens: ISpotifyTokens): Promise<ISpotifyTokens | undefined> {
  if (refreshing == null) {
    refreshing = (async () => {
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: SpotifyAuth_refreshBody(clientId, tokens.refreshToken),
      });
      if (response.status === 400) {
        // invalid_grant: the user revoked access or the refresh token expired, so only a new login helps.
        await MusicStore_update(MusicLog_disconnect);
        return undefined;
      }
      const next = response.ok
        ? SpotifyAuth_parseTokens(await response.json(), Date.now(), tokens.refreshToken)
        : undefined;
      if (next != null) {
        await MusicStore_update((log) => ({ ...log, tokens: next }));
      }
      return next;
    })().finally(() => {
      refreshing = undefined;
    });
  }
  return refreshing;
}

async function validTokens(): Promise<ISpotifyTokens | undefined> {
  const tokens = (await MusicStore_load()).tokens;
  if (tokens == null) {
    return undefined;
  }
  return SpotifyAuth_needsRefresh(tokens, Date.now()) ? refresh(tokens) : tokens;
}

async function SpotifyClient_api(path: string, init: RequestInit = {}): Promise<Response | undefined> {
  const send = (tokens: ISpotifyTokens): Promise<Response> =>
    fetch(`${apiBase}${path}`, {
      ...init,
      headers: {
        ...(init.body != null ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });
  const tokens = await validTokens();
  if (tokens == null) {
    return undefined;
  }
  const response = await send(tokens);
  if (response.status !== 401) {
    return response;
  }
  const refreshed = await refresh(tokens);
  return refreshed != null ? send(refreshed) : undefined;
}

async function json(response: Response | undefined): Promise<unknown> {
  if (response == null || !response.ok || response.status === 204) {
    return undefined;
  }
  return response.json().catch(() => undefined);
}

async function SpotifyClient_profile(): Promise<ISpotifyProfile | undefined> {
  const response = await SpotifyClient_api("/me");
  if (response?.status === 403) {
    SpotifyLoginPlatform_saveError(SpotifyClient_testerLimitMessage);
    await MusicStore_update(MusicLog_disconnect);
    return undefined;
  }
  return SpotifyPlaylist_parseProfile(await json(response));
}

export async function SpotifyClient_nowPlaying(): Promise<ISpotifyNowPlaying | undefined> {
  return SpotifyTracks_parseNowPlaying(await json(await SpotifyClient_api("/me/player/currently-playing")));
}

async function SpotifyClient_rawHistory(): Promise<unknown> {
  return json(await SpotifyClient_api("/me/player/recently-played?limit=50"));
}

export async function SpotifyClient_history(): Promise<ISpotifyHistoryItem[]> {
  return SpotifyTracks_parseHistory(await SpotifyClient_rawHistory());
}

function post(path: string, body: unknown): Promise<Response | undefined> {
  return SpotifyClient_api(path, { method: "POST", body: JSON.stringify(body) });
}

async function createPlaylist(name: string): Promise<ISpotifyResult<ISpotifyPlaylistRef>> {
  const body = { name, public: false, description: "Songs from a workout, saved by beBEAR lifts." };
  let response = await post("/me/playlists", body);
  if (response != null && SpotifyPlaylist_shouldFallBack(response.status)) {
    const profile = await SpotifyClient_profile();
    if (profile == null) {
      return { ok: false, message: "Could not read your Spotify profile." };
    }
    response = await post(`/users/${encodeURIComponent(profile.id)}/playlists`, body);
  }
  if (response == null) {
    return { ok: false, message: "Connect Spotify first." };
  }
  const playlist = SpotifyPlaylist_parseCreated(await json(response));
  return playlist != null
    ? { ok: true, value: playlist }
    : { ok: false, message: `Spotify did not create the playlist (error ${response.status}).` };
}

async function addTracks(playlistId: string, uris: string[]): Promise<ISpotifyResult<void>> {
  for (const chunk of SpotifyPlaylist_chunks(uris)) {
    let response = await post(`/playlists/${playlistId}/items`, { uris: chunk });
    if (response != null && SpotifyPlaylist_shouldFallBack(response.status)) {
      response = await post(`/playlists/${playlistId}/tracks`, { uris: chunk });
    }
    if (response == null || !response.ok) {
      return { ok: false, message: `Spotify did not add the songs (error ${response?.status ?? "no login"}).` };
    }
  }
  return { ok: true, value: undefined };
}

export async function SpotifyClient_savePlaylist(
  name: string,
  uris: string[]
): Promise<ISpotifyResult<ISpotifyPlaylistRef>> {
  try {
    const created = await createPlaylist(name);
    if (!created.ok) {
      return created;
    }
    const added = await addTracks(created.value.id, uris);
    return added.ok ? created : added;
  } catch {
    return { ok: false, message: "Could not reach Spotify. Check the connection and try again." };
  }
}

export async function SpotifyClient_play(uris: string[]): Promise<ISpotifyResult<void>> {
  try {
    const response = await SpotifyClient_api("/me/player/play", { method: "PUT", body: JSON.stringify({ uris }) });
    if (response == null) {
      return { ok: false, message: "Connect Spotify first." };
    }
    const error = SpotifyPlaylist_playError(response.status);
    return error == null ? { ok: true, value: undefined } : { ok: false, message: error };
  } catch {
    return { ok: false, message: "Could not reach Spotify. Check the connection and try again." };
  }
}
