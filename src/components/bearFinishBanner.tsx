import { JSX, useEffect, useState } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { IHistoryRecord } from "../types";
import { BearArt_sprite } from "../models/bearArt";
import { BearCelebration_step, IBearLevelUp } from "../models/bearCelebration";
import { BearText_finishLine, BearText_levelUp } from "../models/bearText";
import { IBearTierSet } from "../models/bearTier";
import { BearStore } from "../utils/bearStore";
import { useBear } from "../utils/useBear";
import { BearBody } from "./bearBody";
import { ShareCardTheme as T } from "./shareCards/shareCardTheme";

function LevelUpCard(props: { levelUp: IBearLevelUp; tierSet: IBearTierSet; sprite: string }): JSX.Element {
  const text = BearText_levelUp(props.levelUp.to, props.tierSet);
  return (
    <View
      testID="bear-level-up"
      data-testid="bear-level-up"
      className="items-center px-4 py-5 mb-3 rounded-3xl"
      style={{ backgroundColor: T.honey }}
    >
      <Text className="text-sm font-bold tracking-wide uppercase" style={{ color: T.greenDark }}>
        Level up!
      </Text>
      <View className="my-3">
        <BearBody sprite={props.sprite} height={180} />
      </View>
      <Text className="text-2xl font-bold" style={{ color: T.greenDark }}>
        {text.title}
      </Text>
      <Text className="mt-1 text-base text-center" style={{ color: T.greenDark }}>
        {text.subtitle}
      </Text>
      {text.milestone != null ? (
        <Text className="mt-1 text-base text-center" style={{ color: T.greenDark }}>
          {text.milestone}
        </Text>
      ) : null}
    </View>
  );
}

export function BearFinishBanner(props: { record: IHistoryRecord }): JSX.Element {
  const { state } = useBear();
  const [levelUp, setLevelUp] = useState<IBearLevelUp | undefined>(undefined);
  useEffect(() => {
    let shown: IBearLevelUp | undefined;
    BearStore.update((saved) => {
      const step = BearCelebration_step(saved, state.countedKg, state.tierSet);
      shown = step.levelUp;
      return step.store;
    })
      .then(() => setLevelUp(shown))
      .catch(() => undefined);
  }, []);
  const sprite = BearArt_sprite(state.line, state.fur, state.level.tier.level, state.mood);
  return (
    <View className="pb-2" testID="bear-finish" data-testid="bear-finish">
      {levelUp != null ? (
        <LevelUpCard
          levelUp={levelUp}
          tierSet={state.tierSet}
          sprite={BearArt_sprite(state.line, state.fur, levelUp.to, "normal")}
        />
      ) : (
        <View className="items-center pb-2">
          <BearBody sprite={sprite} height={150} testID="bear-finish-sprite" />
        </View>
      )}
      <Text className="text-lg font-bold text-center" testID="bear-finish-line" data-testid="bear-finish-line">
        {BearText_finishLine(props.record, state.workouts, state.level)}
      </Text>
    </View>
  );
}
