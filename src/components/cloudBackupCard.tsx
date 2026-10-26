import { JSX, useEffect, useReducer, useState } from "react";
import { Platform, View } from "react-native";
import { IDispatch } from "../ducks/types";
import {
  CloudBackupForm_codeHint,
  CloudBackupForm_empty,
  CloudBackupForm_reduce,
  CloudBackupForm_resendLabel,
  CloudBackupForm_resendNote,
  CloudBackupForm_resendRemainingMs,
} from "../models/cloudBackupForm";
import {
  AccountDeletion_confirmWord,
  AccountDeletion_isConfirmed,
  AccountDeletion_subscriptionNote,
} from "../models/accountDeletion";
import { Purchases_manage } from "../utils/purchases";
import { CloudStore, SentCodeStore } from "../utils/supabaseClient";
import { CloudBackupCommand_run } from "../utils/cloudBackupCommand";
import { AiCaps_plusLine } from "../models/aiCaps";
import { AccountPlan_isPlus } from "../models/accountPlan";
import { AccountPlanStore } from "../utils/accountPlanClient";
import { CloudBackup_olderCopies } from "../models/cloudBackup";
import { StoreBuild_showsProCodes } from "../models/storeBuild";
import { StoreReceipt_name } from "../utils/storeReceipt";
import { CloudRestoreChoice } from "./cloudRestoreBanner";
import { IOAuthProvider } from "../models/oauthFlow";
import { SupabaseOAuth_start } from "../utils/supabaseOAuth";
import { Button } from "./button";
import { LinkButton } from "./linkButton";
import { Text } from "./primitives/text";
import { TextInput } from "./primitives/textInput";

export function CloudBackupCard(props: { dispatch: IDispatch; compact?: boolean }): JSX.Element {
  const cloud = CloudStore.use();
  const accountPlan = AccountPlanStore.use();
  const [form, emit] = useReducer(CloudBackupForm_reduce, undefined, CloudBackupForm_empty);
  const plus = AccountPlan_isPlus(accountPlan, cloud.session?.userId);
  const subscriptionNote = AccountDeletion_subscriptionNote(accountPlan, cloud.session?.userId);
  const busy = form.command != null;
  const [oauth, setOAuth] = useState<{ busy: boolean; error?: string }>({ busy: false });
  const [showEmail, setShowEmail] = useState(false);
  const [now, setNow] = useState(Date.now());
  const waiting = form.step === "code" && CloudBackupForm_resendRemainingMs(form.sentAt, now) > 0;

  useEffect(() => {
    if (!waiting) {
      return undefined;
    }
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waiting]);

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

  return (
    <View className="p-4 my-3 rounded-2xl bg-background-subtle" testID="cloud-backup-card">
      {!props.compact && <Text className="mb-2 text-base font-semibold">Cloud backup</Text>}
      {cloud.session != null && props.compact ? (
        <View style={{ gap: 12 }}>
          <Text className="text-sm">Signed in as {cloud.session.email}</Text>
          {cloud.restoreOffer != null && (
            <CloudRestoreChoice
              offer={cloud.restoreOffer}
              busy={busy}
              onRestore={() => emit({ type: "request", operation: "restore" })}
              onKeep={() => emit({ type: "request", operation: "keepPhone" })}
            />
          )}
        </View>
      ) : cloud.session != null ? (
        <View style={{ gap: 12 }}>
          <Text className="text-sm">{cloud.session.email}</Text>
          <Text className="text-sm text-text-secondary">
            Last backup: {cloud.lastBackupAt == null ? "Never" : new Date(cloud.lastBackupAt).toLocaleString()}
          </Text>
          {cloud.restoreOffer != null && (
            <CloudRestoreChoice
              offer={cloud.restoreOffer}
              busy={busy}
              onRestore={() => emit({ type: "request", operation: "restore" })}
              onKeep={() => emit({ type: "request", operation: "keepPhone" })}
            />
          )}
          <Button
            name="cloud-backup-now"
            kind="purple"
            disabled={busy}
            onClick={() => emit({ type: "request", operation: "backup" })}
          >
            Back up now
          </Button>
          <Button
            name="cloud-restore"
            kind="lightpurple"
            disabled={busy}
            onClick={() => emit({ type: "request", operation: "restore" })}
          >
            Restore from cloud
          </Button>
          <Button
            name="cloud-older-copies"
            kind="lightpurple"
            disabled={busy}
            onClick={() => emit({ type: "toggleOlderCopies" })}
          >
            {form.showOlderCopies ? "Hide older copies" : "Restore an older copy"}
          </Button>
          {form.showOlderCopies && (
            <View className="p-3 border rounded-lg border-border-prominent" style={{ gap: 8 }}>
              <Text className="text-sm text-text-secondary">
                Each upload also saves a copy for its weekday, so these go back up to 7 days. Tap one to see what it
                holds before restoring.
              </Text>
              {CloudBackup_olderCopies(Date.now()).map((choice) => (
                <Button
                  key={choice.copy}
                  name={`cloud-copy-${choice.copy}`}
                  kind="lightgrayv3"
                  disabled={busy}
                  onClick={() => emit({ type: "request", operation: "restore", copy: choice.copy })}
                >
                  {choice.label}
                </Button>
              ))}
            </View>
          )}
          {plus ? (
            <Text className="text-sm font-semibold" testID="cloud-plan-plus">
              {AiCaps_plusLine()}
            </Text>
          ) : (
            StoreBuild_showsProCodes(Platform.OS, StoreReceipt_name(), __DEV__) && (
              <View style={{ gap: 8 }}>
                <Text className="text-sm">Enter a code</Text>
                <TextInput
                  accessibilityLabel="beBEAR+ code"
                  testID="cloud-pro-code"
                  className="px-4 py-3 text-base border rounded-lg bg-background-default border-border-prominent text-text-primary"
                  value={form.proCode}
                  onChangeText={(value) => emit({ type: "proCode", value })}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!busy}
                />
                <Button
                  name="cloud-redeem-code"
                  kind="lightpurple"
                  disabled={busy}
                  onClick={() => emit({ type: "request", operation: "redeem" })}
                >
                  Redeem
                </Button>
              </View>
            )
          )}
          <Button
            name="cloud-sign-out"
            kind="lightgrayv3"
            disabled={busy}
            onClick={() => emit({ type: "request", operation: "signOut" })}
          >
            Sign out
          </Button>
          {form.deleteText == null ? (
            <Button
              name="cloud-delete-account"
              kind="lightgrayv3"
              disabled={busy}
              onClick={() => emit({ type: "deleteOpen" })}
            >
              Delete account
            </Button>
          ) : (
            <View className="p-3 border rounded-lg border-border-prominent" style={{ gap: 12 }}>
              <Text className="text-sm font-semibold">Delete your beBEAR account?</Text>
              <Text className="text-sm">
                This deletes your account, your cloud backups, your profile, friends, feed posts, reports and AI usage
                from our servers. It cannot be undone.
              </Text>
              <Text className="text-sm">
                Your workouts, settings and other data on this phone stay. Export them first if you want a copy.
              </Text>
              {subscriptionNote != null && (
                <View style={{ gap: 8 }}>
                  <Text className="text-sm font-semibold" testID="cloud-delete-subscription-note">
                    {subscriptionNote}
                  </Text>
                  <Button
                    name="cloud-delete-manage-subscription"
                    kind="lightpurple"
                    disabled={busy}
                    onClick={() => {
                      Purchases_manage().catch(() => undefined);
                    }}
                  >
                    Manage subscription
                  </Button>
                </View>
              )}
              <Text className="text-sm">Type {AccountDeletion_confirmWord} to confirm.</Text>
              <TextInput
                accessibilityLabel={`Type ${AccountDeletion_confirmWord} to confirm`}
                testID="cloud-delete-confirm"
                className="px-4 py-3 text-base border rounded-lg bg-background-default border-border-prominent text-text-primary"
                value={form.deleteText}
                onChangeText={(value) => emit({ type: "deleteText", value })}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!busy}
              />
              <Button
                name="cloud-delete-account-confirm"
                kind="red"
                disabled={busy || !AccountDeletion_isConfirmed(form.deleteText)}
                onClick={() => emit({ type: "request", operation: "deleteAccount" })}
              >
                Delete account
              </Button>
              <Button
                name="cloud-delete-account-cancel"
                kind="lightgrayv3"
                disabled={busy}
                onClick={() => emit({ type: "deleteCancel" })}
              >
                Cancel
              </Button>
            </View>
          )}
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {!props.compact && (
            <Text className="text-sm text-text-secondary">Sign in to save a backup after each workout.</Text>
          )}
          <Button
            name="cloud-sign-in-apple"
            kind="purple"
            disabled={busy || oauth.busy}
            onClick={() => startOAuth("apple")}
          >
            Continue with Apple
          </Button>
          <Button
            name="cloud-sign-in-google"
            kind="purple"
            disabled={busy || oauth.busy}
            onClick={() => startOAuth("google")}
          >
            Continue with Google
          </Button>
          {(oauth.error ?? cloud.signInError) != null && (
            <Text className="text-sm text-text-error" accessibilityRole="alert">
              {oauth.error ?? cloud.signInError}
            </Text>
          )}
          {!showEmail && form.step !== "code" ? (
            <View className="items-center">
              <LinkButton name="cloud-use-email-code" className="font-normal" onClick={() => setShowEmail(true)}>
                Use an email code
              </LinkButton>
            </View>
          ) : form.step === "code" ? (
            <>
              <Text className="text-sm">Code sent to {form.email}</Text>
              <Text className="text-sm">Email code</Text>
              <TextInput
                accessibilityLabel="Email code"
                testID="cloud-code"
                className="px-4 py-3 text-base border rounded-lg bg-background-default border-border-prominent text-text-primary"
                value={form.code}
                onChangeText={(value) => emit({ type: "code", value })}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                autoCorrect={false}
                editable={!busy}
              />
              <Text className="text-sm text-text-secondary">{CloudBackupForm_codeHint}</Text>
              <Button
                name="cloud-sign-in"
                kind="purple"
                disabled={busy}
                onClick={() => emit({ type: "request", operation: "verify" })}
              >
                Sign in
              </Button>
              <Button
                name="cloud-resend-code"
                kind="lightpurple"
                disabled={busy || waiting}
                onClick={() => emit({ type: "request", operation: "sendCode", now: Date.now() })}
              >
                {CloudBackupForm_resendLabel(form.sentAt, now)}
              </Button>
              <Text className="text-sm text-text-secondary">{CloudBackupForm_resendNote}</Text>
              <Button
                name="cloud-change-email"
                kind="lightgrayv3"
                disabled={busy}
                onClick={() => emit({ type: "changeEmail" })}
              >
                Change email
              </Button>
            </>
          ) : (
            <>
              <Text className="text-sm">Email address</Text>
              <TextInput
                accessibilityLabel="Email address"
                testID="cloud-email"
                className="px-4 py-3 text-base border rounded-lg bg-background-default border-border-prominent text-text-primary"
                value={form.email}
                onChangeText={(value) => emit({ type: "email", value })}
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
              />
              <Button
                name="cloud-send-code"
                kind="purple"
                disabled={busy}
                onClick={() => emit({ type: "request", operation: "sendCode" })}
              >
                Send code
              </Button>
            </>
          )}
        </View>
      )}
      {busy && (
        <Text className="mt-3 text-sm" accessibilityLiveRegion="polite">
          Working…
        </Text>
      )}
      {form.error != null && (
        <Text className="mt-3 text-sm text-text-error" accessibilityRole="alert">
          {form.error}
        </Text>
      )}
      {form.message != null && (
        <Text className="mt-3 text-sm" accessibilityLiveRegion="polite">
          {form.message}
        </Text>
      )}
    </View>
  );
}
