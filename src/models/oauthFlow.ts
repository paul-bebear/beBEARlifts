export type IOAuthProvider = "apple" | "google";

export interface IOAuthPending {
  provider: IOAuthProvider;
  verifier: string;
  startedAt: number;
}

export type IOAuthReturn = { kind: "none" } | { kind: "code"; code: string } | { kind: "error"; message: string };

export type IOAuthStep = { kind: "exchange"; code: string; verifier: string } | { kind: "error"; message: string };

// The Spotify login also returns to /app/?code=. Only a return carrying this marker belongs to Supabase.
export const OAuthFlow_marker = "supabase";
export const OAuthFlow_cleanPath = "/app/";

const pendingLifetimeMs = 10 * 60 * 1000;
const providerNames: Record<IOAuthProvider, string> = { apple: "Apple", google: "Google" };

export function OAuthFlow_providerName(provider: IOAuthProvider): string {
  return providerNames[provider];
}

export function OAuthFlow_redirectTo(appOrigin: string): string {
  return `${appOrigin}${OAuthFlow_cleanPath}?auth=${OAuthFlow_marker}`;
}

export function OAuthFlow_authorizeUrl(args: {
  supabaseOrigin: string;
  provider: IOAuthProvider;
  redirectTo: string;
  codeChallenge: string;
}): string {
  const params = new URLSearchParams({
    provider: args.provider,
    redirect_to: args.redirectTo,
    code_challenge: args.codeChallenge,
    code_challenge_method: "s256",
  });
  return `${args.supabaseOrigin}/auth/v1/authorize?${params.toString()}`;
}

// /authorize answers a disabled provider with a raw JSON page, so the app reads /auth/v1/settings before leaving.
export function OAuthFlow_providerEnabled(settings: unknown, provider: IOAuthProvider): boolean {
  const external = ((settings ?? {}) as Record<string, unknown>).external;
  return external != null && typeof external === "object" && (external as Record<string, unknown>)[provider] === true;
}

export function OAuthFlow_notSetUpText(provider: IOAuthProvider): string {
  return `${OAuthFlow_providerName(provider)} sign-in is not set up yet.`;
}

export function OAuthFlow_parsePending(raw: unknown): IOAuthPending | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (
    (r.provider === "apple" || r.provider === "google") &&
    typeof r.verifier === "string" &&
    r.verifier !== "" &&
    typeof r.startedAt === "number"
  ) {
    return { provider: r.provider, verifier: r.verifier, startedAt: r.startedAt };
  }
  return undefined;
}

// Supabase puts a PKCE error in the query and an implicit-flow error in the hash.
export function OAuthFlow_readReturn(href: string): IOAuthReturn {
  const url = new URL(href);
  if (url.searchParams.get("auth") !== OAuthFlow_marker) {
    return { kind: "none" };
  }
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const error = url.searchParams.get("error") ?? hash.get("error");
  const description = url.searchParams.get("error_description") ?? hash.get("error_description");
  const code = url.searchParams.get("code");
  if (error != null) {
    return {
      kind: "error",
      message: error === "access_denied" ? "Sign-in was cancelled." : `Sign-in failed: ${description ?? error}`,
    };
  }
  if (code == null || code === "") {
    return { kind: "error", message: "Sign-in came back without a code. Try again." };
  }
  return { kind: "code", code };
}

// No pending state means the sign-in opened in a browser with its own storage, such as Safari outside the Home Screen app.
export function OAuthFlow_nextStep(
  ret: { kind: "code"; code: string } | { kind: "error"; message: string },
  pending: IOAuthPending | undefined,
  now: number
): IOAuthStep {
  if (ret.kind === "error") {
    return ret;
  }
  if (pending == null) {
    return { kind: "error", message: "This sign-in started in another window. Try again here." };
  }
  if (now - pending.startedAt > pendingLifetimeMs) {
    return { kind: "error", message: "Sign-in took longer than 10 minutes. Try again." };
  }
  return { kind: "exchange", code: ret.code, verifier: pending.verifier };
}

export function OAuthFlow_tokenBody(code: string, verifier: string): { auth_code: string; code_verifier: string } {
  return { auth_code: code, code_verifier: verifier };
}

export function OAuthFlow_exchangeErrorText(error: string): string {
  return error === "No connection" ? error : "Sign-in did not finish. Try again.";
}
