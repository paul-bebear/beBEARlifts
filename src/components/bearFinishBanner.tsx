import { JSX, useEffect, useState } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { IHistoryRecord } from "../types";
import { BearArt_sprite } from "../models/bearArt";
import { BearLevelUpArt_image } from "../models/bearLevelUpArt";
import { IBearLine } from "../models/bearStoreData";
import { BearCelebration_step, IBearLevelUp } from "../models/bearCelebration";
import { BearText_finishLine, BearText_levelUp } from "../models/bearText";
import { IBearTierSet } from "../models/bearTier";
import { BearHoney_forWorkout } from "../models/bearHoney";
import { BearStore } from "../utils/bearStore";
import { useBear } from "../utils/useBear";
import { useBearHoney } from "../utils/useBearHoney";
import { BearBody } from "./bearBody";
import { ShareCardTheme as T } from "./shareCards/shareCardTheme";
import { LevelUpPicture } from "./shareCards/levelUpCard";

function LevelUpCard(props: { levelUp: IBearLevelUp; tierSet: IBearTierSet; line: IBearLine }): JSX.Element {
  const text = BearText_levelUp(props.levelUp.to, props.tierSet);
  const image = BearLevelUpArt_image(props.line, props.levelUp.to);
  return (
    <View
      testID="bear-level-up"
      data-testid="bear-level-up"
      className="mb-3 overflow-hidden rounded-3xl"
      style={{ aspectRatio: 2 / 3, width: "100%", backgroundColor: T.greenDark }}
    >
      {image != null && (
        <LevelUpPicture image={image}>
          <View className="items-center px-4 py-5">
            <Text className="text-sm font-bold tracking-wide uppercase" style={{ color: T.honey }}>
              Level up!
            </Text>
            <Text className="mt-2 text-2xl font-bold text-center" style={{ color: T.cream }}>
              {text.title}
            </Text>
            <Text className="mt-1 text-base text-center" style={{ color: T.cream }}>
              {text.subtitle}
            </Text>
          </View>
        </LevelUpPicture>
      )}
    </View>
  );
}

export function BearFinishBanner(props: { record: IHistoryRecord }): JSX.Element {
  const { state } = useBear();
  const { sources } = useBearHoney();
  const honey = BearHoney_forWorkout(props.record, sources);
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
  const sprite = BearArt_sprite(state.line, state.level.tier.level, state.mood);
  return (
    <View className="pb-2" testID="bear-finish" data-testid="bear-finish">
      {levelUp != null ? (
        <LevelUpCard levelUp={levelUp} tierSet={state.tierSet} line={state.line} />
      ) : (
        <View className="items-center pb-2">
          <BearBody sprite={sprite} height={150} testID="bear-finish-sprite" />
        </View>
      )}
      <Text className="text-lg font-bold text-center" testID="bear-finish-line" data-testid="bear-finish-line">
        {BearText_finishLine(props.record, state.workouts, state.level, honey)}
      </Text>
    </View>
  );
}
