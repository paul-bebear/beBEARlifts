import { JSX, useMemo } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { FoodPrimaryButton } from "./foodUi";
import { IconFlame } from "./progressIcons";
import { useNavOptions } from "../navigation/useNavOptions";
import { useTrackedState, untrack } from "../navigation/TrackedStateContext";
import { DailyChecklist_commit, DailyChecklist_doneDays, DailyChecklist_streak } from "../models/dailyChecklist";
import { FoodLog_dayKey } from "../models/foodLog";
import { useFoodLog } from "../utils/foodLogStore";
import { ChecklistStore } from "../utils/checklistStore";
import { Tailwind_semantic } from "../utils/tailwindConfig";

export function ScreenStreak(): JSX.Element {
  const state = useTrackedState();
  const stats = untrack(state.storage.stats);
  const foodLog = useFoodLog();
  const log = ChecklistStore.use();
  const today = FoodLog_dayKey(new Date());
  const streak = useMemo(
    () => DailyChecklist_streak(DailyChecklist_doneDays({ stats, foodLog, log }), today),
    [stats, foodLog, log, today]
  );

  useNavOptions({ navTitle: "Streak" });

  return (
    <View className="items-center px-6 pt-10 pb-8" testID="streak-screen" data-testid="streak-screen">
      <IconFlame size={96} color={streak > 0 ? "#F97316" : Tailwind_semantic().icon.neutral} />
      <Text testID="streak-count" className="mt-4 font-bold" style={{ fontSize: 72, lineHeight: 80 }}>
        {streak}
      </Text>
      <Text className="mb-6 text-lg text-text-secondary">day streak</Text>
      <Text className="mb-8 text-base text-center">
        Complete at least one checklist item a day to keep your streak and stay on track.
      </Text>
      <View className="flex-row w-full">
        <FoodPrimaryButton
          testID="streak-commit"
          title={log.committedAt != null ? "✓ Committed" : "✓ I'm Committed"}
          disabled={log.committedAt != null}
          onPress={() => ChecklistStore.update((l) => DailyChecklist_commit(l, Date.now()))}
        />
      </View>
    </View>
  );
}
