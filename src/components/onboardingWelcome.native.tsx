import { Dispatch, JSX } from "react";
import { View } from "react-native";
import { IDispatch } from "../ducks/types";
import { IOnboardingEvent, IOnboardingState } from "../models/onboarding";
import { Invite_parseHandle } from "../models/invite";
import { OnboardingChoices_welcomeLabel } from "../models/onboardingChoices";
import { CloudBackupCard } from "./cloudBackupCard";
import { Text } from "./primitives/text";
import { OnboardingField, OnboardingMainButton } from "./onboardingChoiceButtons.native";

export function OnboardingWelcome(props: {
  form: IOnboardingState;
  emit: Dispatch<IOnboardingEvent>;
  dispatch: IDispatch;
  signedIn: boolean;
  showInvite: boolean;
  busy: boolean;
  onContinue: () => void;
}): JSX.Element {
  const { form, emit } = props;
  const badInvite = form.invite !== "" && Invite_parseHandle(form.invite) == null;
  return (
    <>
      <View className="items-center pt-6" style={{ gap: 12 }}>
        <Text className="text-8xl" accessibilityElementsHidden importantForAccessibility="no">
          🐻
        </Text>
        <Text className="text-3xl font-bold text-center" accessibilityRole="header">
          Meet your bear
        </Text>
        <Text className="text-lg text-center">This is your bear. Train it, feed it, watch it grow.</Text>
      </View>
      <CloudBackupCard dispatch={props.dispatch} compact />
      {props.showInvite && (
        <View style={{ gap: 4 }}>
          <Text>Who invited you?</Text>
          <View className="flex-row">
            <OnboardingField
              label="Who invited you?"
              value={form.invite}
              plain
              maxLength={20}
              onChange={(value) => emit({ type: "invite", value })}
            />
          </View>
        </View>
      )}
      {badInvite && <Text accessibilityRole="alert">Use 3–20 lowercase letters, numbers, or underscores.</Text>}
      <View className="flex-1" />
      <OnboardingMainButton
        testID="onboarding-welcome-start"
        label={OnboardingChoices_welcomeLabel(props.signedIn)}
        enabled={!badInvite && !props.busy}
        onPress={props.onContinue}
      />
    </>
  );
}
