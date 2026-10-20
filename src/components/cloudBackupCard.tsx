import { JSX, useEffect, useReducer } from "react";
import { View } from "react-native";
import { IDispatch } from "../ducks/types";
import { CloudBackupForm_empty, CloudBackupForm_reduce } from "../models/cloudBackupForm";
import { CloudStore } from "../utils/supabaseClient";
import { CloudBackupCommand_run } from "../utils/cloudBackupCommand";
import { Button } from "./button";
import { Text } from "./primitives/text";
import { TextInput } from "./primitives/textInput";

export function CloudBackupCard(props: { dispatch: IDispatch }): JSX.Element {
  const cloud = CloudStore.use();
  const [form, emit] = useReducer(CloudBackupForm_reduce, undefined, CloudBackupForm_empty);
  const busy = form.command != null;

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
      <Text className="mb-2 text-base font-semibold">Cloud backup</Text>
      {cloud.session != null ? (
        <View style={{ gap: 12 }}>
          <Text className="text-sm">{cloud.session.email}</Text>
          <Text className="text-sm text-text-secondary">
            Last backup: {cloud.lastBackupAt == null ? "Never" : new Date(cloud.lastBackupAt).toLocaleString()}
          </Text>
          {form.offerRestore && (
            <Text className="text-sm">A cloud backup is available. Restore it to bring your data to this phone.</Text>
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
            name="cloud-sign-out"
            kind="lightgrayv3"
            disabled={busy}
            onClick={() => emit({ type: "request", operation: "signOut" })}
          >
            Sign out
          </Button>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <Text className="text-sm text-text-secondary">
            Sign in with an email code to save a backup after each workout.
          </Text>
          {form.step === "code" ? (
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
                disabled={busy}
                onClick={() => emit({ type: "request", operation: "sendCode" })}
              >
                Send code again
              </Button>
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
