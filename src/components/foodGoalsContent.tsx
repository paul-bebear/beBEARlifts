import { JSX, useRef, useState } from "react";
import { View, Platform } from "react-native";
import { Text } from "./primitives/text";
import { FoodLog_hasGoals, FoodLog_parse, FoodLog_setGoals, FoodLog_setProfile, IFoodGoals } from "../models/foodLog";
import { FoodGoals_parseForm, IFoodGoalsForm, FoodGoals_toForm } from "../models/foodGoals";
import { FoodLogStore_replace, FoodLogStore_update, useFoodLog } from "../utils/foodLogStore";
import { Exporter_toFile } from "../utils/exporter";
import { Dialog_alert, Dialog_confirm } from "../utils/dialog";
import { FoodPrimaryButton, FoodTextInput } from "./foodUi";
import { FoodTargetsCalculator } from "./foodTargetsCalculator";
import { IUnit, IWeight } from "../types";

const rows: { key: keyof IFoodGoals; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: "cal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
];

export function FoodGoalsContent(props: { onClose: () => void; latestWeight?: IWeight; units: IUnit }): JSX.Element {
  const log = useFoodLog();
  const [form, setForm] = useState<IFoodGoalsForm>(FoodGoals_toForm(log.goals));
  const [view, setView] = useState<"form" | "calculator" | "filled">("form");
  const fileRef = useRef<HTMLInputElement>(null);
  const parsed = FoodGoals_parseForm(form);

  if (view === "calculator") {
    return (
      <FoodTargetsCalculator
        profile={log.profile}
        latestWeight={props.latestWeight}
        units={props.units}
        onCancel={() => setView("form")}
        onFill={(goals, profile) => {
          setForm(FoodGoals_toForm(goals));
          setView("filled");
          FoodLogStore_update((l) => FoodLog_setProfile(l, profile));
        }}
      />
    );
  }

  const onImport = async (file: File | undefined): Promise<void> => {
    if (file == null) {
      return;
    }
    let imported;
    try {
      imported = FoodLog_parse(JSON.parse(await file.text()));
    } catch {
      Dialog_alert("That file is not a food log export.");
      return;
    }
    const message = `Replace your food log with ${imported.entries.length} foods from this file?`;
    if (await Dialog_confirm(message)) {
      await FoodLogStore_replace(imported);
      setForm(FoodGoals_toForm(imported.goals));
    }
  };

  return (
    <View testID="food-goals-content" data-testid="food-goals-content">
      <Text className="mb-1 text-xl font-bold">Daily targets</Text>
      {!FoodLog_hasGoals(log.goals) && (
        <Text className="mb-3 text-sm text-text-secondary">
          No targets yet. Calculate my targets uses your saved profile, or you can enter your own numbers.
        </Text>
      )}
      <Text className="mb-4 text-sm text-text-secondary">
        Set a low and a high number for each. The calculator caps the weight used for protein and fat at your height in
        cm minus 100.
      </Text>
      <View className="flex-row mb-4">
        <FoodPrimaryButton
          testID="food-goals-calculate"
          title="Calculate my targets"
          kind="outline"
          onPress={() => setView("calculator")}
        />
      </View>
      {view === "filled" && (
        <Text className="mb-3 text-sm text-text-success">
          Filled in from your answers. Change any number, then tap Save targets.
        </Text>
      )}
      {rows.map((row) => (
        <View key={row.key} className="flex-row items-center mb-3">
          <Text className="flex-1 text-base">
            {row.label} <Text className="text-sm text-text-secondary">({row.unit})</Text>
          </Text>
          <FoodTextInput
            testID={`food-goal-${row.key}-min`}
            value={form[row.key].min}
            onChangeText={(min) => setForm({ ...form, [row.key]: { ...form[row.key], min } })}
            keyboardType="number-pad"
            inputMode="numeric"
            style={{ width: 80, textAlign: "center" }}
          />
          <Text className="mx-2 text-text-secondary">to</Text>
          <FoodTextInput
            testID={`food-goal-${row.key}-max`}
            value={form[row.key].max}
            onChangeText={(max) => setForm({ ...form, [row.key]: { ...form[row.key], max } })}
            keyboardType="number-pad"
            inputMode="numeric"
            style={{ width: 80, textAlign: "center" }}
          />
        </View>
      ))}
      {parsed == null && (
        <Text className="text-sm text-text-error">Each low number must be at or below its high number.</Text>
      )}
      <View className="flex-row mt-3">
        <FoodPrimaryButton
          testID="food-goals-save"
          title="Save targets"
          disabled={parsed == null}
          onPress={async () => {
            if (parsed != null) {
              await FoodLogStore_update((l) => FoodLog_setGoals(l, parsed));
              props.onClose();
            }
          }}
        />
      </View>
      <Text className="mt-8 mb-1 text-base font-semibold">Backup</Text>
      <Text className="mb-3 text-sm text-text-secondary">
        Settings → Export everything includes food. This exports the food log alone.
      </Text>
      <View className="flex-row" style={{ gap: 8 }}>
        <FoodPrimaryButton
          title="Export food log"
          kind="outline"
          onPress={() =>
            Exporter_toFile(`bebear_foodlog_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(log))
          }
        />
        {Platform.OS === "web" && (
          <FoodPrimaryButton title="Import" kind="outline" onPress={() => fileRef.current?.click()} />
        )}
      </View>
      {Platform.OS === "web" && (
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={(e) => {
            onImport(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      )}
    </View>
  );
}
