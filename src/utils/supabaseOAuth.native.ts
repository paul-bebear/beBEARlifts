import { Platform } from "react-native";
import appleAuth from "@invertase/react-native-apple-authentication";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import BebearSignInConfig from "../specs/NativeBebearSignInConfig";
import {
  INativeIdTokenStep,
  NativeIdTokenSignIn_appleResponse,
  NativeIdTokenSignIn_googleConfiguration,
  NativeIdTokenSignIn_googleResponse,
  NativeIdTokenSignIn_result,
  NativeIdTokenSignIn_sdkError,
  NativeIdTokenSignIn_tokenPath,
} from "../models/nativeIdTokenSignIn";
import { IOAuthProvider, IOAuthReturn, OAuthFlow_notSetUpText } from "../models/oauthFlow";
import { ForkServices_plan } from "./forkServices";
import { OfflineOnly_isEnabled } from "./offlineOnly";
import {
  CloudStore,
  ICloudResult,
  SupabaseClient_call,
  SupabaseClient_json,
  SupabaseClient_saveSession,
} from "./supabaseClient";

async function appleCredential(): Promise<INativeIdTokenStep> {
  if (!appleAuth.isSupported || !ForkServices_plan(OfflineOnly_isEnabled()).appleSignIn) {
    return { kind: "error", error: OAuthFlow_notSetUpText("apple") };
  }
  try {
    return NativeIdTokenSignIn_appleResponse(
      await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL],
        nonceEnabled: true,
      })
    );
  } catch (error) {
    return NativeIdTokenSignIn_sdkError(error, appleAuth.Error.CANCELED);
  }
}

async function googleCredential(): Promise<INativeIdTokenStep> {
  const config = NativeIdTokenSignIn_googleConfiguration(BebearSignInConfig?.getConstants());
  if (config == null || !ForkServices_plan(OfflineOnly_isEnabled()).googleSignIn) {
    return { kind: "error", error: OAuthFlow_notSetUpText("google") };
  }
  try {
    GoogleSignin.configure(config);
    return NativeIdTokenSignIn_googleResponse(await GoogleSignin.signIn());
  } catch (error) {
    return NativeIdTokenSignIn_sdkError(error, statusCodes.SIGN_IN_CANCELLED);
  }
}

export async function SupabaseOAuth_start(provider: IOAuthProvider): Promise<ICloudResult<undefined>> {
  if (Platform.OS !== "ios") {
    return { ok: false, error: OAuthFlow_notSetUpText(provider) };
  }
  try {
    await CloudStore.update((state) => ({ ...state, pending: undefined, signInError: undefined }));
    const step = await (provider === "apple" ? appleCredential() : googleCredential());
    if (step.kind === "cancel") {
      return { ok: true, value: undefined };
    }
    if (step.kind === "error") {
      return { ok: false, error: step.error };
    }
    const result = await SupabaseClient_call(NativeIdTokenSignIn_tokenPath, SupabaseClient_json(step.body));
    return NativeIdTokenSignIn_result(result.ok ? await SupabaseClient_saveSession(result.value) : result);
  } catch {
    return { ok: false, error: "Sign-in did not finish. Try again." };
  }
}

export function SupabaseOAuth_takeReturn(): IOAuthReturn {
  return { kind: "none" };
}

export async function SupabaseOAuth_finishReturn(_ret: IOAuthReturn): Promise<void> {
  return undefined;
}
