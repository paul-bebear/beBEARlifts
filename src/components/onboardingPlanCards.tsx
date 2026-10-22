import { JSX, useMemo } from "react";
import { View } from "react-native";
import { BearPlan_text } from "../models/bearPlan";
import { IBearPlanCard } from "../models/bearPlanRecommend";
import { OnboardingProgram_dayNames } from "../models/onboardingProgram";
import { Text } from "./primitives/text";
import { OnboardingChoice } from "./onboardingControls";

export function OnboardingPlanCards(props: {
  cards: IBearPlanCard[];
  selected: number;
  busy: boolean;
  onPick: (index: number) => void;
}): JSX.Element {
  const card = props.cards[props.selected];
  const dayNames = useMemo(() => (card == null ? [] : OnboardingProgram_dayNames(BearPlan_text(card.params))), [card]);
  return (
    <>
      <Text accessibilityRole="header" className="text-3xl font-bold">
        Your plan
      </Text>
      <View className="gap-3" accessibilityRole="radiogroup" accessibilityLabel="Plans">
        {props.cards.map((c, i) => (
          <OnboardingChoice
            key={c.days}
            radio
            selected={i === props.selected}
            disabled={props.busy}
            onPress={() => props.onPick(i)}
          >
            {c.recommended && (
              <Text className="self-start px-2 py-1 mb-2 text-xs font-bold text-black rounded-full bg-yellow-400">
                Best for you
              </Text>
            )}
            <Text className="text-xl font-bold">{c.name}</Text>
            <Text className="text-text-secondary">
              {c.days} days a week · about {c.minutes} minutes
            </Text>
            <Text className="mt-1">{c.summary}</Text>
            {i === props.selected && dayNames.length > 0 && (
              <View className="gap-1 pl-5 mt-3">
                {dayNames.map((name, d) => (
                  <Text key={d}>
                    {d + 1}. {name}
                  </Text>
                ))}
              </View>
            )}
          </OnboardingChoice>
        ))}
      </View>
      <Text className="text-text-secondary">Start light. The app adds weight when you hit the reps.</Text>
    </>
  );
}
