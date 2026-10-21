import { JSX, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { IconCheckCircle } from "./icons/iconCheckCircle";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { IHistoryRecord, ISettings } from "../types";
import { useWarmupLog, WarmupStore_update } from "../utils/warmupStore";
import { WarmupApi_generate } from "../utils/warmupApi";
import { MusicLog_formatDuration } from "../models/musicLog";
import { AiConsent_showFeatures } from "../models/aiConsent";
import { AiConsent_ensure, AiConsentStore } from "../utils/aiConsentClient";
import {
  IWarmupPlan,
  WarmupPlan_build,
  WarmupPlan_doneCount,
  WarmupPlan_exercises,
  WarmupPlan_find,
  WarmupPlan_put,
  WarmupPlan_rules,
  WarmupPlan_toggle,
} from "../models/warmupPlan";

function save(plan: IWarmupPlan): Promise<void> {
  return WarmupStore_update((log) => WarmupPlan_put(log, plan));
}

export function WorkoutWarmupCard(props: {
  progress: Pick<IHistoryRecord, "id" | "entries">;
  settings: ISettings;
}): JSX.Element | null {
  const log = useWarmupLog();
  const showAi = AiConsent_showFeatures(AiConsentStore.use());
  const plan = WarmupPlan_find(log, props.progress.id);
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const semantic = Tailwind_semantic();

  if (props.progress.entries.length === 0) {
    return null;
  }

  const generate = async (): Promise<void> => {
    if (!(await AiConsent_ensure())) {
      return;
    }
    setIsBusy(true);
    const exercises = WarmupPlan_exercises(props.progress, props.settings);
    const result = await WarmupApi_generate(exercises);
    const items = result.ok ? result.items : WarmupPlan_rules(exercises);
    await save(WarmupPlan_build(props.progress.id, result.ok ? "ai" : "rules", items, Date.now()));
    setError(result.ok ? undefined : result.error);
    setIsBusy(false);
    setIsOpen(true);
  };

  if (plan == null) {
    return (
      <View className="flex-row items-center px-4 py-2 mx-4 mt-2 rounded-xl bg-background-subtle" testID="warmup-card">
        <Text className="flex-1 text-sm">Warm up for today's lifts</Text>
        {showAi && (
          <Pressable onPress={generate} disabled={isBusy} testID="warmup-generate" data-testid="warmup-generate">
            <Text className="text-sm font-semibold text-text-link">{isBusy ? "Making it…" : "Make my warmup"}</Text>
          </Pressable>
        )}
      </View>
    );
  }

  const done = WarmupPlan_doneCount(plan);
  return (
    <View className="px-4 py-2 mx-4 mt-2 rounded-xl bg-background-subtle" testID="warmup-card">
      <Pressable className="flex-row items-center" onPress={() => setIsOpen(!isOpen)} testID="warmup-toggle">
        <Text className="flex-1 text-sm font-semibold">
          Warmup · {done === plan.items.length ? "done" : `${done}/${plan.items.length}`}
        </Text>
        <Text className="text-sm text-text-link">{isOpen ? "Hide" : "Show"}</Text>
      </Pressable>
      {isOpen && (
        <View className="mt-2">
          {plan.source === "rules" && (
            <Text className="mb-2 text-xs text-text-secondary">Standard warmup.{error != null ? ` ${error}` : ""}</Text>
          )}
          {plan.items.map((item, i) => (
            <Pressable
              key={i}
              className="flex-row items-start py-1.5"
              onPress={() => save(WarmupPlan_toggle(plan, i))}
              testID={`warmup-item-${i}`}
            >
              <IconCheckCircle isChecked={plan.done[i]} color={semantic.icon.green} size={20} />
              <View className="flex-1 ml-2">
                <Text className="text-sm font-semibold">
                  {item.name}
                  {item.seconds != null ? ` · ${MusicLog_formatDuration(item.seconds * 1000)}` : ""}
                </Text>
                <Text className="text-xs text-text-secondary">{item.detail}</Text>
              </View>
            </Pressable>
          ))}
          {showAi && (
            <Pressable onPress={generate} disabled={isBusy} className="mt-1" testID="warmup-regenerate">
              <Text className="text-xs text-text-link">{isBusy ? "Making a new one…" : "Make a new warmup"}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
