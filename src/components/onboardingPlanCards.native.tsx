import { JSX, useMemo } from "react";
import { Pressable, View } from "react-native";
import { BearPlan_text } from "../models/bearPlan";
import { IBearPlanCard } from "../models/bearPlanRecommend";
import { OnboardingProgram_dayNames } from "../models/onboardingProgram";
import { Text } from "./primitives/text";

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
      <Text className="text-3xl font-bold" accessibilityRole="header">
        Your plan
      </Text>
      <View style={{ gap: 12 }} accessibilityRole="radiogroup" accessibilityLabel="Plans">
        {props.cards.map((c, i) => {
          const active = i === props.selected;
          return (
            <Pressable
              key={c.days}
              testID={`onboarding-plan-${c.days}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: active, disabled: props.busy }}
              disabled={props.busy}
              className={`w-full p-4 border-2 rounded-2xl ${
                active ? "border-yellow-500 bg-background-cardyellow" : "border-border-prominent"
              }`}
              onPress={() => props.onPick(i)}
            >
              {c.recommended && (
                <View className="self-start px-2 py-1 mb-2 bg-yellow-400 rounded-full">
                  <Text className="text-xs font-bold text-black">Best for you</Text>
                </View>
              )}
              <Text className="text-xl font-bold">{c.name}</Text>
              <Text className="text-text-secondary">
                {c.days} days a week · about {c.minutes} minutes
              </Text>
              <Text className="mt-1">{c.summary}</Text>
              {active && dayNames.length > 0 && (
                <View className="mt-3" style={{ gap: 4 }}>
                  {dayNames.map((name, d) => (
                    <Text key={d}>
                      {d + 1}. {name}
                    </Text>
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <Text className="text-text-secondary">Start light. The app adds weight when you hit the reps.</Text>
    </>
  );
}
