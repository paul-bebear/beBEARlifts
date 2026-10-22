import { JSX, useEffect, useReducer, useRef, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IDispatch } from "../ducks/types";
import { OnboardingAnswers_empty } from "../models/onboardingAnswers";
import { Onboarding_canGoBack, Onboarding_empty, Onboarding_mainAction, Onboarding_reduce } from "../models/onboarding";
import { OnboardingCommand_run } from "../utils/onboardingCommand";
import { CloudStore } from "../utils/supabaseClient";
import { InviteClient_save, InviteStore } from "../utils/inviteClient";
import { OnboardingImportedPlan, OnboardingQuestions, OnboardingWantQuestions } from "./onboardingQuestions";
import { OnboardingWelcome } from "./onboardingWelcome";
import { OnboardingPlanCards } from "./onboardingPlanCards";
import { OnboardingAboutQuestions, OnboardingPlaceQuestions } from "./onboardingProfileQuestions";
import { OnboardingAction } from "./onboardingControls";
import { Text } from "./primitives/text";
import { AiConsent_showFeatures } from "../models/aiConsent";
import { AiConsent_ensure, AiConsentStore } from "../utils/aiConsentClient";
import { useTabBarContentPadding } from "../navigation/useTabBarContentPadding";
import { SystemKeyboardSpacer } from "./systemKeyboardSpacer";

export function OnboardingFlow(props: { dispatch: IDispatch; language: string; invite?: string }): JSX.Element {
  const cloud = CloudStore.use();
  const showAi = AiConsent_showFeatures(AiConsentStore.use());
  const pending = InviteStore.use();
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarContentPadding();
  const [form, emit] = useReducer(Onboarding_reduce, undefined, () =>
    Onboarding_empty(props.invite, OnboardingAnswers_empty(props.language))
  );
  const [hadInvite] = useState(() => form.invite !== "");
  const screen = useRef<ScrollView>(null);
  const content = useRef<View>(null);
  useEffect(() => {
    screen.current?.scrollTo({ y: 0, animated: false });
    if (Platform.OS === "web") {
      content.current?.focus();
    }
  }, [form.step]);
  useEffect(() => {
    if (form.command != null) {
      props.dispatch(OnboardingCommand_run(form, emit));
    }
  }, [form.run]);
  useEffect(() => {
    if (pending.handle != null) {
      emit({ type: "invite", value: pending.handle });
    }
  }, [pending.handle]);
  const busy = form.command != null || form.resizing;
  const main = Onboarding_mainAction(form);
  return (
    <ScrollView
      ref={screen}
      className="flex-1 bg-background-default"
      contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: Math.max(32, insets.bottom, tabBarPadding) }}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      testID={`onboarding-${form.step}`}
    >
      <View ref={content} tabIndex={-1} className="flex-1 w-full max-w-lg gap-5 mx-auto">
        {Onboarding_canGoBack(form) && (
          <OnboardingAction onPress={() => emit({ type: "back" })}>‹ Back</OnboardingAction>
        )}
        {form.step === "welcome" ? (
          <OnboardingWelcome
            form={form}
            emit={emit}
            dispatch={props.dispatch}
            signedIn={cloud.session != null}
            showInvite={hadInvite || pending.handle != null}
            busy={busy}
            onContinue={() =>
              InviteClient_save(form.invite)
                .then(() => emit({ type: "auth", signedIn: cloud.session != null && showAi }))
                .catch(() => emit({ type: "failed", error: "Could not save the invite. Try again." }))
            }
          />
        ) : form.step === "place" ? (
          <OnboardingPlaceQuestions a={form.answers} emit={emit} />
        ) : form.step === "about" ? (
          <OnboardingAboutQuestions a={form.answers} emit={emit} />
        ) : form.step === "want" ? (
          <OnboardingWantQuestions a={form.answers} emit={emit} />
        ) : form.step === "import" ? (
          <OnboardingQuestions form={form} emit={emit} />
        ) : form.step === "working" ? (
          <View className="gap-4" accessibilityLiveRegion="polite">
            <ActivityIndicator />
            <Text>Building your plan… This can take up to a minute.</Text>
            <OnboardingAction onPress={() => emit({ type: "fallback" })}>Stop and show beBEAR plans</OnboardingAction>
          </View>
        ) : form.step === "plan" ? (
          <OnboardingPlanCards
            cards={form.cards}
            selected={form.selected}
            busy={busy}
            onPick={(index) => emit({ type: "pick", index })}
          />
        ) : (
          <OnboardingImportedPlan form={form} emit={emit} busy={busy} />
        )}
        {form.notice != null && <Text className="text-text-secondary">{form.notice}</Text>}
        {form.error != null && (
          <View className="gap-3">
            <Text accessibilityRole="alert">{form.error}</Text>
            {form.step === "import" && (
              <OnboardingAction onPress={() => emit({ type: "fallback" })}>Show beBEAR plans</OnboardingAction>
            )}
          </View>
        )}
        {main != null && (
          <>
            <View className="flex-1" />
            <OnboardingAction primary disabled={!main.enabled} onPress={() => emit(main.event)}>
              {main.label}
            </OnboardingAction>
          </>
        )}
        {form.step === "want" &&
          (form.useAi ? (
            <OnboardingAction
              disabled={busy}
              onPress={() =>
                AiConsent_ensure().then((ok) =>
                  emit(ok ? { type: "import" } : { type: "failed", error: "Import needs AI turned on." })
                )
              }
            >
              Import my own
            </OnboardingAction>
          ) : (
            <Text className="self-center text-text-secondary">Import needs sign-in</Text>
          ))}
      </View>
      {Platform.OS === "android" && <SystemKeyboardSpacer scrollRef={screen} />}
    </ScrollView>
  );
}
