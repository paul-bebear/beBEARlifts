export interface ISpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export type ISpotifyRedirect = { kind: "none" } | { kind: "code"; code: string } | { kind: "error"; message: string };

export const SpotifyAuth_scopes = [
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-read-recently-played",
  "user-modify-playback-state",
  "playlist-modify-private",
  "playlist-modify-public",
];

const refreshMarginMs = 60 * 1000;

export function SpotifyAuth_authorizeUrl(args: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const params = new URLSearchParams({
    client_id: args.clientId,
    response_type: "code",
    redirect_uri: args.redirectUri,
    state: args.state,
    code_challenge_method: "S256",
    code_challenge: args.codeChallenge,
    scope: SpotifyAuth_scopes.join(" "),
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export function SpotifyAuth_readRedirect(href: string, expectedState: string | undefined): ISpotifyRedirect {
  const url = new URL(href);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");
  if (code == null && error == null) {
    return { kind: "none" };
  }
  if (expectedState == null || state !== expectedState) {
    return { kind: "error", message: "The Spotify login did not match this app. Try again." };
  }
  if (error != null) {
    return {
      kind: "error",
      message: error === "access_denied" ? "Spotify login was cancelled." : `Spotify said: ${error}`,
    };
  }
  return { kind: "code", code: code! };
}

export function SpotifyAuth_cleanUrl(href: string): string {
  const url = new URL(href);
  for (const key of ["code", "state", "error"]) {
    url.searchParams.delete(key);
  }
  return url.toString();
}

export function SpotifyAuth_codeBody(args: {
  clientId: string;
  redirectUri: string;
  code: string;
  verifier: string;
}): string {
  return new URLSearchParams({
    client_id: args.clientId,
    grant_type: "authorization_code",
    code: args.code,
    redirect_uri: args.redirectUri,
    code_verifier: args.verifier,
  }).toString();
}

export function SpotifyAuth_refreshBody(clientId: string, refreshToken: string): string {
  return new URLSearchParams({
    client_id: clientId,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  }).toString();
}

// A refresh may omit refresh_token, which means the old one stays valid.
export function SpotifyAuth_parseTokens(
  raw: unknown,
  now: number,
  previousRefresh?: string
): ISpotifyTokens | undefined {
  if (raw == null || typeof raw !== "object") {
    return undefined;
  }
  const r = raw as Record<string, unknown>;
  const refreshToken = typeof r.refresh_token === "string" ? r.refresh_token : previousRefresh;
  if (typeof r.access_token !== "string" || refreshToken == null || typeof r.expires_in !== "number") {
    return undefined;
  }
  return { accessToken: r.access_token, refreshToken, expiresAt: now + r.expires_in * 1000 };
}

export function SpotifyAuth_needsRefresh(tokens: ISpotifyTokens, now: number): boolean {
  return tokens.expiresAt - refreshMarginMs <= now;
}

export function SpotifyAuth_parseTokensRecord(raw: unknown): ISpotifyTokens | undefined {
  if (raw == null || typeof raw !== "object") {
    return undefined;
  }
  const r = raw as Record<string, unknown>;
  return typeof r.accessToken === "string" && typeof r.refreshToken === "string" && typeof r.expiresAt === "number"
    ? { accessToken: r.accessToken, refreshToken: r.refreshToken, expiresAt: r.expiresAt }
    : undefined;
}
