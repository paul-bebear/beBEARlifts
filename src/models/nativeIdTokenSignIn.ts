import type { ICloudResult } from "../utils/supabaseClient";
import { OAuthFlow_exchangeErrorText } from "./oauthFlow";

export type INativeIdTokenBody =
  | { provider: "apple"; id_token: string; nonce: string }
  | { provider: "google"; id_token: string };

export type INativeIdTokenStep =
  | { kind: "cancel" }
  | { kind: "exchange"; body: INativeIdTokenBody }
  | { kind: "error"; error: string };

export const NativeIdTokenSignIn_tokenPath = "/auth/v1/token?grant_type=id_token";

const failed = { kind: "error" as const, error: "Sign-in did not finish. Try again." };

function record(raw: unknown): Record<string, unknown> {
  return raw != null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

export function NativeIdTokenSignIn_appleResponse(raw: unknown): INativeIdTokenStep {
  const r = record(raw);
  return nonempty(r.identityToken) && nonempty(r.nonce)
    ? { kind: "exchange", body: { provider: "apple", id_token: r.identityToken, nonce: r.nonce } }
    : failed;
}

export function NativeIdTokenSignIn_googleResponse(raw: unknown): INativeIdTokenStep {
  const r = record(raw);
  if (r.type === "cancelled") {
    return { kind: "cancel" };
  }
  const data = record(r.data);
  return r.type === "success" && nonempty(data.idToken)
    ? { kind: "exchange", body: { provider: "google", id_token: data.idToken } }
    : failed;
}

export function NativeIdTokenSignIn_sdkError(error: unknown, cancelledCode: string): INativeIdTokenStep {
  return record(error).code === cancelledCode ? { kind: "cancel" } : failed;
}

export function NativeIdTokenSignIn_googleConfiguration(raw: unknown): { iosClientId: string } | undefined {
  const r = record(raw);
  if (!nonempty(r.googleIosClientId) || !Array.isArray(r.urlSchemes)) {
    return undefined;
  }
  const match = /^([0-9]+-[a-zA-Z0-9_-]+)\.apps\.googleusercontent\.com$/.exec(r.googleIosClientId);
  return match != null && r.urlSchemes.includes(`com.googleusercontent.apps.${match[1]}`)
    ? { iosClientId: r.googleIosClientId }
    : undefined;
}

export function NativeIdTokenSignIn_result(result: ICloudResult<unknown>): ICloudResult<undefined> {
  return result.ok ? { ok: true, value: undefined } : { ok: false, error: OAuthFlow_exchangeErrorText(result.error) };
}
