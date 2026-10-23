import { Dispatch, JSX } from "react";
import { View } from "react-native";
import { IDispatch } from "../ducks/types";
import { IOnboardingEvent, IOnboardingState } from "../models/onboarding";
import { Invite_parseHandle } from "../models/invite";
import { BearArt_sprite } from "../models/bearArt";
import { BearBody } from "./bearBody";
import { Text } from "./primitives/text";
import { TextInput } from "./primitives/textInput";
import { OnboardingSignIn } from "./onboardingSignIn";
import { OnboardingAction, OnboardingControls_field } from "./onboardingControls";

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
      <View className="items-center gap-3 pt-6">
        <BearBody sprite={BearArt_sprite("male", 1, "normal")} height={180} testID="onboarding-bear" />
        <Text accessibilityRole="header" className="text-3xl font-bold text-center">
          Meet your bear
        </Text>
        <Text className="text-lg text-center">This is your bear. Train it, feed it, watch it grow.</Text>
      </View>
      <OnboardingSignIn dispatch={props.dispatch} />
      {props.showInvite && (
        <View className="gap-2">
          <Text>Who invited you?</Text>
          <TextInput
            accessibilityLabel="Who invited you?"
            className={OnboardingControls_field}
            value={form.invite}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            onChangeText={(value) => emit({ type: "invite", value })}
          />
        </View>
      )}
      {badInvite && <Text accessibilityRole="alert">Use 3–20 lowercase letters, numbers, or underscores.</Text>}
      <View className="flex-1" />
      <OnboardingAction primary disabled={badInvite || props.busy} onPress={props.onContinue}>
        {props.signedIn ? "Continue" : "Not now"}
      </OnboardingAction>
    </>
  );
}
