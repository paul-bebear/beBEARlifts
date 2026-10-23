import { JSX, useEffect, useReducer, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { AppleButton } from "@invertase/react-native-apple-authentication";
import { IDispatch } from "../ducks/types";
import {
  CloudBackupForm_codeHint,
  CloudBackupForm_empty,
  CloudBackupForm_reduce,
  CloudBackupForm_resendLabel,
  CloudBackupForm_resendNote,
  CloudBackupForm_resendRemainingMs,
} from "../models/cloudBackupForm";
import { IOAuthProvider } from "../models/oauthFlow";
import { CloudStore, SentCodeStore } from "../utils/supabaseClient";
import { CloudBackupCommand_run } from "../utils/cloudBackupCommand";
import { SupabaseOAuth_start } from "../utils/supabaseOAuth";
import { CloudRestoreChoice } from "./cloudRestoreBanner";
import { Text } from "./primitives/text";
import { TextInput } from "./primitives/textInput";
import { OnboardingAction, OnboardingControls_field } from "./onboardingControls";

export function OnboardingSignIn(props: { dispatch: IDispatch }): JSX.Element {
  const cloud = CloudStore.use();
  const [form, emit] = useReducer(CloudBackupForm_reduce, undefined, CloudBackupForm_empty);
  const [oauth, setOAuth] = useState<{ busy: boolean; error?: string }>({ busy: false });
  const [showEmail, setShowEmail] = useState(false);
  const [now, setNow] = useState(Date.now());
  const busy = form.command != null;
  const waiting = form.step === "code" && CloudBackupForm_resendRemainingMs(form.sentAt, now) > 0;
  const startOAuth = (provider: IOAuthProvider): void => {
    setOAuth({ busy: true });
    SupabaseOAuth_start(provider)
      .then((result) => setOAuth({ busy: false, error: result.ok ? undefined : result.error }))
      .catch(() => setOAuth({ busy: false, error: "Sign-in did not start. Try again." }));
  };
  useEffect(() => {
    SentCodeStore.load()
      .then((sent) => emit({ type: "resume", sent, now: Date.now() }))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    emit({ type: "session", email: cloud.session?.email });
  }, [cloud.session?.email]);
  useEffect(() => {
    if (form.command != null) {
      props.dispatch(CloudBackupCommand_run(form.command, emit));
    }
  }, [form.command]);
  useEffect(() => {
    if (!waiting) {
      return undefined;
    }
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waiting]);
  const socialDisabled = busy || oauth.busy;
  return (
    <View className="gap-3" testID="onboarding-sign-in">
      {cloud.session != null ? (
        <>
          <Text>Signed in as {cloud.session.email}</Text>
          {cloud.restoreOffer != null && (
            <CloudRestoreChoice
              offer={cloud.restoreOffer}
              busy={busy}
              onRestore={() => emit({ type: "request", operation: "restore" })}
              onKeep={() => emit({ type: "request", operation: "keepPhone" })}
            />
          )}
        </>
      ) : (
        <>
          {Platform.OS === "ios" && (
            <View
              className="gap-3"
              testID="onboarding-social-sign-in"
              pointerEvents={socialDisabled ? "none" : "auto"}
              style={{ opacity: socialDisabled ? 0.4 : 1 }}
            >
              <AppleButton
                testID="onboarding-sign-in-apple"
                buttonStyle={AppleButton.Style.BLACK}
                buttonType={AppleButton.Type.SIGN_IN}
                cornerRadius={16}
                style={{ width: "100%", height: 52 }}
                onPress={() => startOAuth("apple")}
              />
              <Pressable
                testID="onboarding-sign-in-google"
                accessibilityRole="button"
                accessibilityState={{ disabled: socialDisabled }}
                disabled={socialDisabled}
                onPress={() => startOAuth("google")}
                className="w-full p-3 border rounded-2xl bg-background-default border-border-prominent"
                style={{ height: 52, justifyContent: "center" }}
              >
                <Text className="text-lg font-semibold text-center text-text-primary">Sign in with Google</Text>
              </Pressable>
            </View>
          )}
          {(oauth.error ?? cloud.signInError) != null && (
            <Text accessibilityRole="alert" className="text-text-error">
              {oauth.error ?? cloud.signInError}
            </Text>
          )}
          {form.step === "code" ? (
            <>
              <Text>Code sent to {form.email}</Text>
              <Text>Email code</Text>
              <TextInput
                accessibilityLabel="Email code"
                testID="cloud-code"
                className={OnboardingControls_field}
                value={form.code}
                onChangeText={(value) => emit({ type: "code", value })}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                autoCorrect={false}
                editable={!busy}
              />
              <Text className="text-sm text-text-secondary">{CloudBackupForm_codeHint}</Text>
              <OnboardingAction disabled={busy} onPress={() => emit({ type: "request", operation: "verify" })}>
                Sign in
              </OnboardingAction>
              <OnboardingAction
                disabled={busy || waiting}
                onPress={() => emit({ type: "request", operation: "sendCode", now: Date.now() })}
              >
                {CloudBackupForm_resendLabel(form.sentAt, now)}
              </OnboardingAction>
              <Text className="text-sm text-text-secondary">{CloudBackupForm_resendNote}</Text>
              <OnboardingAction disabled={busy} onPress={() => emit({ type: "changeEmail" })}>
                Change email
              </OnboardingAction>
            </>
          ) : showEmail ? (
            <>
              <TextInput
                accessibilityLabel="Email address"
                testID="cloud-email"
                className={OnboardingControls_field}
                value={form.email}
                onChangeText={(value) => emit({ type: "email", value })}
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
              />
              <OnboardingAction disabled={busy} onPress={() => emit({ type: "request", operation: "sendCode" })}>
                Send code
              </OnboardingAction>
            </>
          ) : (
            <View className="items-center">
              <OnboardingAction onPress={() => setShowEmail(true)}>Use an email code</OnboardingAction>
            </View>
          )}
        </>
      )}
      {busy && <Text accessibilityLiveRegion="polite">Working…</Text>}
      {form.error != null && (
        <Text accessibilityRole="alert" className="text-text-error">
          {form.error}
        </Text>
      )}
      {form.message != null && <Text accessibilityLiveRegion="polite">{form.message}</Text>}
    </View>
  );
}
