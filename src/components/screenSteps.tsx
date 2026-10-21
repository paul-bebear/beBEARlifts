import { JSX, useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { Switch } from "./primitives/switch";
import { FoodPrimaryButton, FoodTextInput } from "./foodUi";
import { StepsChart } from "./stepsChart";
import { useNavOptions } from "../navigation/useNavOptions";
import { FoodLog_dayKey, FoodLog_dayLabel, FoodLog_shiftDay } from "../models/foodLog";
import {
  Steps_canGoForward,
  Steps_chart,
  Steps_chartDays,
  Steps_count,
  Steps_format,
  Steps_goalStep,
  Steps_parseCount,
  Steps_setGoal,
  Steps_setManual,
  Steps_setSync,
} from "../models/steps";
import { useIsFocused } from "@react-navigation/native";
import { StepsStore, StepsStore_canSyncHealth } from "../utils/stepsStore";
import { useStepsHealthSync } from "../utils/useStepsHealthSync";
import { Dialog_alert } from "../utils/dialog";

function Tile(props: { testID: string; label: string; value: string }): JSX.Element {
  return (
    <View testID={props.testID} data-testid={props.testID} className="flex-1 p-3 rounded-2xl bg-background-subtle">
      <Text className="text-xs font-semibold tracking-wide uppercase text-text-secondary">{props.label}</Text>
      <Text className="mt-1 text-xl font-bold">{props.value}</Text>
    </View>
  );
}

function RoundButton(props: { testID: string; title: string; disabled?: boolean; onPress: () => void }): JSX.Element {
  return (
    <Pressable
      testID={props.testID}
      data-testid={props.testID}
      disabled={props.disabled}
      onPress={props.onPress}
      className="items-center justify-center w-10 h-10 border rounded-full border-border-neutral"
      style={{ opacity: props.disabled ? 0.3 : 1 }}
    >
      <Text className="text-xl">{props.title}</Text>
    </Pressable>
  );
}

export function ScreenSteps(): JSX.Element {
  const log = StepsStore.use();
  const today = FoodLog_dayKey(new Date());
  const [day, setDay] = useState(today);
  const [typed, setTyped] = useState("");
  const [canSync, setCanSync] = useState(false);
  const chart = useMemo(() => Steps_chart(log, today), [log, today]);
  const count = Steps_count(log, day);

  useNavOptions({ navTitle: "Steps" });

  useEffect(() => {
    StepsStore_canSyncHealth().then(setCanSync);
  }, []);

  useStepsHealthSync(log.syncHealth, useIsFocused());

  const saveTyped = (): void => {
    const value = Steps_parseCount(typed);
    if (value == null) {
      Dialog_alert("Enter the number of steps, for example 8500.");
      return;
    }
    StepsStore.update((l) => Steps_setManual(l, day, value));
    setTyped("");
  };

  return (
    <View className="px-4 pt-2 pb-8" testID="steps-screen" data-testid="steps-screen">
      <View className="flex-row items-center justify-between">
        <RoundButton testID="steps-prev-day" title="‹" onPress={() => setDay(FoodLog_shiftDay(day, -1))} />
        <Text className="text-base font-semibold">{FoodLog_dayLabel(day, today)}</Text>
        <RoundButton
          testID="steps-next-day"
          title="›"
          disabled={!Steps_canGoForward(day, today)}
          onPress={() => setDay(FoodLog_shiftDay(day, 1))}
        />
      </View>
      <View className="items-center my-6">
        <Text testID="steps-count" className="font-bold" style={{ fontSize: 56, lineHeight: 64 }}>
          {count != null ? Steps_format(count) : "–"}
        </Text>
        <Text className="text-sm text-text-secondary">of {Steps_format(log.goal)} steps</Text>
      </View>
      <View className="flex-row items-center mb-6" style={{ gap: 8 }}>
        <FoodTextInput
          testID="steps-manual-input"
          value={typed}
          onChangeText={setTyped}
          placeholder={count != null ? "Correct this day" : "Enter steps for this day"}
          keyboardType="number-pad"
          inputMode="numeric"
          style={{ flex: 1 }}
        />
        <View style={{ width: 90 }} className="flex-row">
          <FoodPrimaryButton testID="steps-manual-save" title="Save" onPress={saveTyped} />
        </View>
      </View>
      <View className="flex-row items-center p-4 mb-4 rounded-2xl bg-background-subtle">
        <Text className="flex-1 text-base font-semibold">Daily goal</Text>
        <RoundButton
          testID="steps-goal-minus"
          title="−"
          onPress={() => StepsStore.update((l) => Steps_setGoal(l, l.goal - Steps_goalStep))}
        />
        <Text
          testID="steps-goal"
          className="mx-3 text-base font-semibold"
          style={{ minWidth: 64, textAlign: "center" }}
        >
          {Steps_format(log.goal)}
        </Text>
        <RoundButton
          testID="steps-goal-plus"
          title="+"
          onPress={() => StepsStore.update((l) => Steps_setGoal(l, l.goal + Steps_goalStep))}
        />
      </View>
      <Text className="mb-2 text-xs font-semibold tracking-wide uppercase text-text-secondary">
        Last {Steps_chartDays} days
      </Text>
      <StepsChart chart={chart} goal={log.goal} />
      <View className="flex-row mt-4" style={{ gap: 8 }}>
        <Tile
          testID="steps-average"
          label="Average"
          value={chart.average != null ? Steps_format(chart.average) : "–"}
        />
        <Tile testID="steps-days-hit" label="Goal hit" value={`${chart.daysHit} of ${Steps_chartDays} days`} />
      </View>
      {canSync && (
        <View className="flex-row items-center p-4 mt-4 rounded-2xl bg-background-subtle">
          <View className="flex-1 mr-3">
            <Text className="text-base font-semibold">Sync with Apple Health</Text>
            <Text className="text-sm text-text-secondary">Reads your steps each time you open this screen.</Text>
          </View>
          <Switch
            testID="steps-sync"
            value={log.syncHealth}
            onValueChange={(on) => StepsStore.update((l) => Steps_setSync(l, on))}
          />
        </View>
      )}
    </View>
  );
}
