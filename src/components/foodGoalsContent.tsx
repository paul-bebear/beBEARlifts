import { JSX, useRef, useState } from "react";
import { View, Platform } from "react-native";
import { Text } from "./primitives/text";
import { FoodLog_parse, FoodLog_setGoals, IFoodGoals } from "../models/foodLog";
import { FoodGoals_parseForm, IFoodGoalsForm, FoodGoals_toForm } from "../models/foodGoals";
import { FoodLogStore_replace, FoodLogStore_update, useFoodLog } from "../utils/foodLogStore";
import { Exporter_toFile } from "../utils/exporter";
import { Dialog_alert, Dialog_confirm } from "../utils/dialog";
import { FoodPrimaryButton, FoodTextInput } from "./foodUi";

const rows: { key: keyof IFoodGoals; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: "cal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
];

export function FoodGoalsContent(props: { onClose: () => void }): JSX.Element {
  const log = useFoodLog();
  const [form, setForm] = useState<IFoodGoalsForm>(FoodGoals_toForm(log.goals));
  const fileRef = useRef<HTMLInputElement>(null);
  const parsed = FoodGoals_parseForm(form);

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
      <Text className="mb-4 text-sm text-text-secondary">
        Set a low and a high number for each. For a lean bulk, protein of 1.6 to 2.2 g per kg of body weight is a common
        target.
      </Text>
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
        The main JSON export in Me does not include food. Export the food log here too.
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
