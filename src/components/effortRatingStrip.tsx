import { JSX } from "react";
import { Pressable, View } from "react-native";
import { LensBuilder } from "lens-shmens";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord, ISet } from "../types";
import { updateProgress } from "../models/state";
import { EffortRating_options, EffortRating_rate } from "../models/effortRating";

interface IEffortRatingStripProps {
  set: ISet;
  setIndex: number;
  lbSet: LensBuilder<IHistoryRecord, ISet, {}>;
  dispatch: IDispatch;
}

export function EffortRatingStrip(props: IEffortRatingStripProps): JSX.Element {
  return (
    <View className="px-4 pt-2" testID="effort-strip">
      <Text className="mb-1 text-xs text-text-secondary">How did set {props.setIndex + 1} feel? Optional.</Text>
      <View className="flex-row" style={{ gap: 8 }}>
        {EffortRating_options.map((option) => {
          const isChosen = props.set.completedEffort === option.effort;
          return (
            <Pressable
              key={option.effort}
              testID={`effort-${option.effort}`}
              data-testid={`effort-${option.effort}`}
              className={`flex-1 items-center py-1 rounded-md border ${
                isChosen ? "border-button-primarybackground" : "border-border-neutral"
              } ${isChosen ? (option.effort === "right" ? "bg-color-green100" : "bg-color-yellow100") : ""}`}
              onPress={() => {
                updateProgress(
                  props.dispatch,
                  props.lbSet.recordModify((s) => EffortRating_rate(s, option.effort)),
                  "rate-effort"
                );
              }}
            >
              <Text className="text-xs font-semibold">{option.label}</Text>
              <Text className="text-xs text-text-secondary">{option.detail}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
