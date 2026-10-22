import { Dispatch, JSX } from "react";
import { View } from "react-native";
import { IOnboardingAnswers, OnboardingAnswers_togglePlace } from "../models/onboardingAnswers";
import { IOnboardingEvent } from "../models/onboarding";
import { IBearPlacePick } from "../models/bearPlace";
import { Text } from "./primitives/text";
import { OnboardingChoice, OnboardingNumber } from "./onboardingControls";
import { OnboardingFoodQuestions } from "./onboardingQuestions";
import { IconEquipmentBarbell } from "./icons/iconEquipmentBarbell";
import { IconEquipmentDumbbell } from "./icons/iconEquipmentDumbbell";
import { IconHome } from "./icons/iconHome";
import { Svg, Path } from "./primitives/svg";

interface IProps {
  a: IOnboardingAnswers;
  emit: Dispatch<IOnboardingEvent>;
}

function IconBars(): JSX.Element {
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <Path d="M3 5h18M6 5v16M18 5v16M3 21h6M15 21h6" />
    </Svg>
  );
}

const places: { pick: IBearPlacePick; label: string; icon: () => JSX.Element }[] = [
  { pick: "gym", label: "Full gym", icon: () => <IconEquipmentBarbell /> },
  { pick: "dumbbells", label: "Only dumbbells", icon: () => <IconEquipmentDumbbell /> },
  { pick: "street", label: "Street workout", icon: () => <IconBars /> },
  { pick: "none", label: "No equipment", icon: () => <IconHome /> },
];

const experiences: { key: IOnboardingAnswers["experience"]; label: string }[] = [
  { key: "new", label: "New" },
  { key: "months", label: "A few months" },
  { key: "years", label: "Years" },
];

export function OnboardingPlaceQuestions(props: IProps): JSX.Element {
  return (
    <>
      <Text accessibilityRole="header" className="text-3xl font-bold">
        Where do you train?
      </Text>
      <Text className="text-text-secondary">Pick all that fit.</Text>
      <View className="gap-3">
        {places.map((p) => (
          <OnboardingChoice
            key={p.pick}
            selected={props.a.places.includes(p.pick)}
            label={p.label}
            onPress={() =>
              props.emit({ type: "answers", patch: { places: OnboardingAnswers_togglePlace(props.a.places, p.pick) } })
            }
          >
            <View className="flex-row items-center gap-3">
              {p.icon()}
              <Text className="text-lg">{p.label}</Text>
            </View>
          </OnboardingChoice>
        ))}
      </View>
    </>
  );
}

export function OnboardingAboutQuestions(props: IProps): JSX.Element {
  const { a } = props;
  const patch = (value: Partial<IOnboardingAnswers>): void => props.emit({ type: "answers", patch: value });
  return (
    <>
      <Text accessibilityRole="header" className="text-3xl font-bold">
        About you
      </Text>
      <View className="gap-2">
        <Text className="font-semibold">How long have you lifted?</Text>
        <View className="flex-row flex-wrap gap-2">
          {experiences.map((e) => (
            <OnboardingChoice
              key={e.key}
              pill
              selected={a.experience === e.key}
              onPress={() => patch({ experience: e.key })}
            >
              <Text>{e.label}</Text>
            </OnboardingChoice>
          ))}
        </View>
      </View>
      <OnboardingNumber label="Age" value={a.age} onChange={(age) => patch({ age })} />
      <View className="gap-2">
        <Text>Height</Text>
        <View className="flex-row gap-2">
          {(["ftin", "cm"] as const).map((unit) => (
            <OnboardingChoice
              key={unit}
              pill
              selected={unit === a.heightUnit}
              onPress={() => patch({ heightUnit: unit })}
            >
              <Text>{unit === "cm" ? "cm" : "ft in"}</Text>
            </OnboardingChoice>
          ))}
        </View>
        {a.heightUnit === "cm" ? (
          <OnboardingNumber label="Height in cm" decimal value={a.height} onChange={(height) => patch({ height })} />
        ) : (
          <View className="flex-row gap-2">
            <OnboardingNumber label="Height, feet" value={a.heightFt} onChange={(heightFt) => patch({ heightFt })} />
            <OnboardingNumber label="Height, inches" value={a.heightIn} onChange={(heightIn) => patch({ heightIn })} />
          </View>
        )}
      </View>
      <View className="gap-2">
        <Text>Weight</Text>
        <View className="flex-row gap-2">
          {(["lb", "kg"] as const).map((unit) => (
            <OnboardingChoice key={unit} pill selected={unit === a.unit} onPress={() => patch({ unit })}>
              <Text>{unit}</Text>
            </OnboardingChoice>
          ))}
        </View>
        <OnboardingNumber
          label={`Weight in ${a.unit}`}
          decimal
          value={a.weight}
          onChange={(weight) => patch({ weight })}
        />
      </View>
      <View className="gap-2">
        <Text>Sex, for food targets (optional)</Text>
        <View className="flex-row gap-2">
          {(["male", "female"] as const).map((sex) => (
            <OnboardingChoice
              key={sex}
              pill
              selected={a.sex === sex}
              onPress={() => patch({ sex: a.sex === sex ? undefined : sex })}
            >
              <Text>{sex === "male" ? "Male" : "Female"}</Text>
            </OnboardingChoice>
          ))}
        </View>
      </View>
      <OnboardingFoodQuestions a={a} emit={props.emit} />
    </>
  );
}
