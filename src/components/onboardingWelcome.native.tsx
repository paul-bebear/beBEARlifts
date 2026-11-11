import { Dispatch, JSX, useEffect } from "react";
import { View } from "react-native";
import { IDispatch } from "../ducks/types";
import { IOnboardingEvent, IOnboardingState } from "../models/onboarding";
import { Invite_parseHandle } from "../models/invite";
import { OnboardingChoices_welcomeLine } from "../models/onboardingChoices";
import { CubClient_refresh } from "../utils/cubClient";
import { useCubCard } from "../utils/useCubCard";
import { CloudBackupCard } from "./cloudBackupCard";
import { CubShare } from "./cubShare";
import { Text } from "./primitives/text";
import { OnboardingField, OnboardingMainButton } from "./onboardingChoiceButtons.native";

// Sign-in is the only way past this page (owner decision 2026-10-27). The cub number is the reason it gives.
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
  const card = useCubCard();
  useEffect(() => {
    if (props.signedIn) {
      CubClient_refresh().catch(() => undefined);
    }
  }, [props.signedIn]);
  return (
    <>
      <View className="items-center pt-6" style={{ gap: 12 }}>
        <Text className="text-8xl" accessibilityElementsHidden importantForAccessibility="no">
          🐻
        </Text>
        <Text className="text-3xl font-bold text-center" accessibilityRole="header">
          Meet your bear
        </Text>
        <Text className="text-lg text-center" testID="onboarding-welcome-line">
          {OnboardingChoices_welcomeLine(props.signedIn, card?.number)}
        </Text>
      </View>
      {props.signedIn && card != null && <CubShare data={card} />}
      <CloudBackupCard dispatch={props.dispatch} compact />
      {props.signedIn && props.showInvite && (
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
      {props.signedIn && badInvite && (
        <Text accessibilityRole="alert">Use 3–20 lowercase letters, numbers, or underscores.</Text>
      )}
      {props.signedIn && (
        <>
          <View className="flex-1" />
          <OnboardingMainButton
            testID="onboarding-welcome-start"
            label="Continue"
            enabled={!badInvite && !props.busy}
            onPress={props.onContinue}
          />
        </>
      )}
    </>
  );
}
