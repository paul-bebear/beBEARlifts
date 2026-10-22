import { JSX, ReactNode, useEffect, useReducer, useRef, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IDispatch } from "../ducks/types";
import { OnboardingAnswers_empty } from "../models/onboardingAnswers";
import {
  IOnboardingState,
  Onboarding_canGoBack,
  Onboarding_canSkip,
  Onboarding_current,
  Onboarding_empty,
  Onboarding_mainAction,
  Onboarding_progress,
  Onboarding_reduce,
} from "../models/onboarding";
import { IOnboardingPlatform, IOnboardingStepDef } from "../models/onboardingSteps";
import { OnboardingCommand_run } from "../utils/onboardingCommand";
import { CloudStore } from "../utils/supabaseClient";
import { InviteClient_save, InviteStore } from "../utils/inviteClient";
import { OnboardingImportedPlan, OnboardingQuestions } from "./onboardingQuestions";
import { Text } from "./primitives/text";
import { AiConsent_showFeatures } from "../models/aiConsent";
import { AiConsent_ensure, AiConsentStore } from "../utils/aiConsentClient";
import { useTabBarContentPadding } from "../navigation/useTabBarContentPadding";
import { SystemKeyboardSpacer } from "./systemKeyboardSpacer";
import { OnboardingButton, OnboardingColors as C, OnboardingStepFrame } from "./onboardingStepFrame";
import { OnboardingChoiceView, OnboardingHold, OnboardingLoading, OnboardingPermission } from "./onboardingStepKinds";
import { OnboardingLift, OnboardingMeasure, OnboardingTextStep } from "./onboardingStepInputs";
import { OnboardingResult, OnboardingSay } from "./onboardingStepSay";
import { OnboardingPlans, OnboardingSignInStep } from "./onboardingStepPlans";

function platformOf(): IOnboardingPlatform {
  return Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "web";
}

function LightCard(props: { children: ReactNode }): JSX.Element {
  return <View className="gap-4 p-4 rounded-2xl bg-background-default">{props.children}</View>;
}

export function OnboardingFlow(props: {
  dispatch: IDispatch;
  language: string;
  invite?: string;
  steps?: readonly IOnboardingStepDef[];
}): JSX.Element {
  const cloud = CloudStore.use();
  const showAi = AiConsent_showFeatures(AiConsentStore.use());
  const pending = InviteStore.use();
  const insets = useSafeAreaInsets();
  const tabBarPadding = useTabBarContentPadding();
  const [form, emit] = useReducer(Onboarding_reduce, undefined, () =>
    Onboarding_empty({
      invite: props.invite,
      answers: OnboardingAnswers_empty(props.language),
      platform: platformOf(),
      steps: props.steps,
    })
  );
  const [saving, setSaving] = useState(false);
  const screen = useRef<ScrollView>(null);
  const content = useRef<View>(null);
  useEffect(() => {
    screen.current?.scrollTo({ y: 0, animated: false });
    if (Platform.OS === "web") {
      content.current?.focus();
    }
  }, [form.visit, form.at.phase]);
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
  const canImport = cloud.session != null && showAi;
  useEffect(() => {
    emit({ type: "capability", canImport });
  }, [canImport]);
  const busy = form.command != null || form.resizing || saving;
  const step = Onboarding_current(form);
  const main = Onboarding_mainAction(form);

  const onStart = (): void => {
    setSaving(true);
    InviteClient_save(form.invite)
      .then(() => emit({ type: "auth", signedIn: canImport }))
      .catch(() => emit({ type: "failed", error: "Could not save the invite. Try again." }))
      .finally(() => setSaving(false));
  };
  const onMain = (): void => {
    if (main == null) {
      return;
    }
    if (step?.kind === "choice" && step.field === "source" && form.source === "import" && form.useAi) {
      AiConsent_ensure().then((ok) =>
        emit(ok ? { type: "next", visit: form.visit } : { type: "failed", error: "Import needs AI turned on." })
      );
    } else {
      emit(main.event);
    }
  };

  return (
    <ScrollView
      ref={screen}
      className="flex-1"
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: Math.max(32, insets.bottom, tabBarPadding) }}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      testID={`onboarding-${form.at.phase === "flow" ? form.at.id : form.at.phase}`}
    >
      <View ref={content} tabIndex={-1} className="flex-1">
        <OnboardingStepFrame
          progress={step?.kind === "signIn" && step.variant === "start" ? undefined : Onboarding_progress(form)}
          onBack={Onboarding_canGoBack(form) ? () => emit({ type: "back", visit: form.visit }) : undefined}
          footer={
            <>
              {form.notice != null && <Text style={{ color: C.muted }}>{form.notice}</Text>}
              {form.error != null && (
                <Text accessibilityRole="alert" style={{ color: "#FF8A80" }}>
                  {form.error}
                </Text>
              )}
              {form.at.phase === "import" && form.error != null && (
                <OnboardingButton label="Show beBEAR plans" look="link" onPress={() => emit({ type: "fallback" })} />
              )}
              {Onboarding_canSkip(form) && (
                <OnboardingButton label="Skip" look="link" onPress={() => emit({ type: "skip", visit: form.visit })} />
              )}
              {main != null && (
                <OnboardingButton label={main.label} disabled={!main.enabled || busy} onPress={onMain} />
              )}
            </>
          }
        >
          <StepBody form={form} step={step} emit={emit} dispatch={props.dispatch} busy={busy} onStart={onStart} />
        </OnboardingStepFrame>
      </View>
      {Platform.OS === "android" && <SystemKeyboardSpacer scrollRef={screen} />}
    </ScrollView>
  );
}

function StepBody(props: {
  form: IOnboardingState;
  step: IOnboardingStepDef | undefined;
  emit: (event: Parameters<typeof Onboarding_reduce>[1]) => void;
  dispatch: IDispatch;
  busy: boolean;
  onStart: () => void;
}): JSX.Element | null {
  const { form, step, emit } = props;
  if (form.at.phase === "import") {
    return (
      <LightCard>
        <OnboardingQuestions form={form} emit={emit} />
      </LightCard>
    );
  }
  if (form.at.phase === "working") {
    return (
      <View className="items-center justify-center flex-1 gap-4" accessibilityLiveRegion="polite">
        <ActivityIndicator color={C.accent} />
        <Text style={{ color: C.text }}>Building your plan… This can take up to a minute.</Text>
        <OnboardingButton label="Stop and show beBEAR plans" look="link" onPress={() => emit({ type: "fallback" })} />
      </View>
    );
  }
  if (form.at.phase === "done") {
    return (
      <LightCard>
        <OnboardingImportedPlan form={form} emit={emit} busy={props.busy} />
      </LightCard>
    );
  }
  if (step == null) {
    return null;
  }
  const key = `${step.id}-${form.visit}`;
  switch (step.kind) {
    case "say":
      return <OnboardingSay key={key} state={form} step={step} emit={emit} />;
    case "choice":
      return <OnboardingChoiceView key={key} state={form} step={step} emit={emit} />;
    case "measure":
      return <OnboardingMeasure key={key} state={form} step={step} emit={emit} />;
    case "text":
      return <OnboardingTextStep key={key} state={form} step={step} emit={emit} />;
    case "hold":
      return <OnboardingHold key={key} state={form} step={step} emit={emit} />;
    case "loading":
      return <OnboardingLoading key={key} state={form} step={step} emit={emit} />;
    case "plans":
      return <OnboardingPlans key={key} state={form} step={step} emit={emit} />;
    case "lift":
      return <OnboardingLift key={key} state={form} step={step} emit={emit} />;
    case "result":
      return <OnboardingResult key={key} state={form} step={step} emit={emit} />;
    case "permission":
      return <OnboardingPermission key={key} state={form} step={step} emit={emit} />;
    case "signIn":
      return (
        <OnboardingSignInStep
          key={key}
          state={form}
          step={step}
          dispatch={props.dispatch}
          busy={props.busy}
          onStart={props.onStart}
        />
      );
  }
}
