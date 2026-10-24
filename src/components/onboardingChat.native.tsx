import { Dispatch, JSX, ReactNode, useEffect, useReducer } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IDispatch } from "../ducks/types";
import {
  IOnboardingAnswers,
  OnboardingAnswers_empty,
  OnboardingAnswers_togglePlace,
} from "../models/onboardingAnswers";
import {
  IOnboardingEvent,
  Onboarding_canGoBack,
  Onboarding_empty,
  Onboarding_mainAction,
  Onboarding_reduce,
} from "../models/onboarding";
import { IBearPlacePick } from "../models/bearPlace";
import { OnboardingChoices_experiences, OnboardingChoices_places } from "../models/onboardingChoices";
import { OnboardingCommand_run } from "../utils/onboardingCommand";
import { CloudStore } from "../utils/supabaseClient";
import { InviteClient_save, InviteStore } from "../utils/inviteClient";
import { useTabBarContentPadding } from "../navigation/useTabBarContentPadding";
import { OnboardingFoodQuestions, OnboardingWantQuestions } from "./onboardingQuestions";
import { OnboardingWelcome } from "./onboardingWelcome";
import { OnboardingPlanCards } from "./onboardingPlanCards";
import {
  OnboardingChip,
  OnboardingField,
  OnboardingLink,
  OnboardingMainButton,
  OnboardingPill,
} from "./onboardingChoiceButtons.native";
import { Text } from "./primitives/text";
import { Path } from "./primitives/svg";
import { IconSvg } from "./icons/iconSvg";
import { IconEquipmentBarbell } from "./icons/iconEquipmentBarbell";
import { IconEquipmentDumbbell } from "./icons/iconEquipmentDumbbell";
import { IconHome } from "./icons/iconHome";
import { Tailwind_semantic } from "../utils/tailwindConfig";

type IEmit = Dispatch<IOnboardingEvent>;

function IconBars(): JSX.Element {
  return (
    <IconSvg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={Tailwind_semantic().icon.neutral}>
      <Path d="M3 5h18M6 5v16M18 5v16M3 21h6M15 21h6" strokeWidth="2" />
    </IconSvg>
  );
}

const placeIcons: Record<IBearPlacePick, () => JSX.Element> = {
  gym: () => <IconEquipmentBarbell />,
  dumbbells: () => <IconEquipmentDumbbell />,
  street: () => <IconBars />,
  none: () => <IconHome />,
};

// Hermes has no navigator.language. Intl reports the device region, which picks lb or kg.
function deviceLocale(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
}

function Title(props: { children: string }): JSX.Element {
  return (
    <Text className="text-3xl font-bold" accessibilityRole="header">
      {props.children}
    </Text>
  );
}

function PlaceScreen(props: { a: IOnboardingAnswers; emit: IEmit }): JSX.Element {
  return (
    <>
      <Title>Where do you train?</Title>
      <Text className="text-text-secondary">Pick all that fit.</Text>
      <View style={{ gap: 12 }}>
        {OnboardingChoices_places.map((p) => (
          <OnboardingChip
            key={p.pick}
            on={props.a.places.includes(p.pick)}
            onPress={() =>
              props.emit({
                type: "answers",
                patch: { places: OnboardingAnswers_togglePlace(props.a.places, p.pick) },
              })
            }
          >
            {placeIcons[p.pick]()}
            <Text className="text-lg">{p.label}</Text>
          </OnboardingChip>
        ))}
      </View>
    </>
  );
}

function Group(props: { label: string; children: ReactNode }): JSX.Element {
  return (
    <View style={{ gap: 8 }}>
      <Text className="font-semibold">{props.label}</Text>
      {props.children}
    </View>
  );
}

function Row(props: { children: ReactNode }): JSX.Element {
  return (
    <View className="flex-row flex-wrap items-center" style={{ gap: 8 }}>
      {props.children}
    </View>
  );
}

function AboutScreen(props: { a: IOnboardingAnswers; emit: IEmit }): JSX.Element {
  const { a } = props;
  const patch = (value: Partial<IOnboardingAnswers>): void => props.emit({ type: "answers", patch: value });
  return (
    <>
      <Title>About you</Title>
      <Group label="How long have you lifted?">
        <Row>
          {OnboardingChoices_experiences.map((e) => (
            <OnboardingPill
              key={e.key}
              on={a.experience === e.key}
              label={e.label}
              onPress={() => patch({ experience: e.key })}
            />
          ))}
        </Row>
      </Group>
      <Group label="Age">
        <View className="flex-row">
          <OnboardingField label="Age" keyboard="number-pad" value={a.age} onChange={(age) => patch({ age })} />
        </View>
      </Group>
      <Group label="Height">
        <Row>
          {(["ftin", "cm"] as const).map((unit) => (
            <OnboardingPill
              key={unit}
              on={unit === a.heightUnit}
              label={unit === "cm" ? "cm" : "ft in"}
              onPress={() => patch({ heightUnit: unit })}
            />
          ))}
        </Row>
        {a.heightUnit === "cm" ? (
          <View className="flex-row">
            <OnboardingField
              label="Height in cm"
              keyboard="decimal-pad"
              value={a.height}
              onChange={(height) => patch({ height })}
            />
          </View>
        ) : (
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <OnboardingField
              label="Height, feet"
              keyboard="number-pad"
              value={a.heightFt}
              onChange={(heightFt) => patch({ heightFt })}
            />
            <Text>ft</Text>
            <OnboardingField
              label="Height, inches"
              keyboard="number-pad"
              value={a.heightIn}
              onChange={(heightIn) => patch({ heightIn })}
            />
            <Text>in</Text>
          </View>
        )}
      </Group>
      <Group label="Weight">
        <Row>
          {(["lb", "kg"] as const).map((unit) => (
            <OnboardingPill key={unit} on={unit === a.unit} label={unit} onPress={() => patch({ unit })} />
          ))}
        </Row>
        <View className="flex-row">
          <OnboardingField
            label={`Weight in ${a.unit}`}
            keyboard="decimal-pad"
            value={a.weight}
            onChange={(weight) => patch({ weight })}
          />
        </View>
      </Group>
      <Group label="Sex, for food targets (optional)">
        <Row>
          {(["male", "female"] as const).map((sex) => (
            <OnboardingPill
              key={sex}
              on={a.sex === sex}
              label={sex === "male" ? "Male" : "Female"}
              onPress={() => patch({ sex: a.sex === sex ? undefined : sex })}
            />
          ))}
        </Row>
      </Group>
      <OnboardingFoodQuestions a={a} emit={props.emit} />
    </>
  );
}

// Import my own needs screenshots as JPEG data URLs, and the native picker returns file URIs, so
// the phone offers only the recommended plans for now.
export function OnboardingChat(props: { dispatch: IDispatch; children: ReactNode }): JSX.Element {
  const cloud = CloudStore.use();
  const pending = InviteStore.use();
  const tabBarPadding = useTabBarContentPadding();
  const insets = useSafeAreaInsets();
  const [form, emit] = useReducer(Onboarding_reduce, undefined, () =>
    Onboarding_empty("", OnboardingAnswers_empty(deviceLocale()))
  );
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
  const a = form.answers;
  return (
    <ScrollView
      className="flex-1 bg-background-default"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={{
        flexGrow: 1,
        padding: 20,
        paddingBottom: tabBarPadding > 0 ? tabBarPadding : Math.max(32, insets.bottom),
        gap: 20,
      }}
    >
      {Onboarding_canGoBack(form) && <OnboardingLink label="‹ Back" onPress={() => emit({ type: "back" })} />}
      {form.step === "welcome" ? (
        <OnboardingWelcome
          form={form}
          emit={emit}
          dispatch={props.dispatch}
          signedIn={cloud.session != null}
          showInvite={pending.handle != null}
          busy={busy}
          onContinue={() =>
            InviteClient_save(form.invite)
              .then(() => emit({ type: "auth", signedIn: false }))
              .catch(() => emit({ type: "failed", error: "Could not save the invite. Try again." }))
          }
        />
      ) : form.step === "place" ? (
        <PlaceScreen a={a} emit={emit} />
      ) : form.step === "about" ? (
        <AboutScreen a={a} emit={emit} />
      ) : form.step === "want" ? (
        <OnboardingWantQuestions a={a} emit={emit} />
      ) : form.step === "plan" ? (
        <OnboardingPlanCards
          cards={form.cards}
          selected={form.selected}
          busy={busy}
          onPick={(index) => emit({ type: "pick", index })}
        />
      ) : null}
      {form.notice != null && <Text className="text-text-secondary">{form.notice}</Text>}
      {form.error != null && <Text accessibilityRole="alert">{form.error}</Text>}
      {main != null && (
        <>
          <View className="flex-1" />
          <OnboardingMainButton
            testID={`onboarding-main-${form.step}`}
            label={main.label}
            enabled={main.enabled}
            onPress={() => emit(main.event)}
          />
        </>
      )}
    </ScrollView>
  );
}
