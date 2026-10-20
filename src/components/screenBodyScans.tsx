import { JSX, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { FoodPrimaryButton, FoodTextInput } from "./foodUi";
import { useNavOptions } from "../navigation/useNavOptions";
import { useTrackedDispatch, useTrackedState } from "../navigation/TrackedStateContext";
import { Dialog_alert, Dialog_confirm } from "../utils/dialog";
import { BodyScanStore_update, useBodyScans } from "../utils/bodyScanStore";
import { EditStats_addPercentageStats, EditStats_addWeightStats } from "../models/editStats";
import {
  BodyScans_change,
  BodyScans_fields,
  BodyScans_formatDelta,
  BodyScans_formatValue,
  BodyScans_fromForm,
  BodyScans_put,
  BodyScans_remove,
  BodyScans_toStats,
  IBodyScan,
  IBodyScanForm,
  IBodyScanUnit,
} from "../models/bodyScans";

const trendClass = { better: "text-text-success", worse: "text-text-error", neutral: "text-text-secondary" };

function ScanCard(props: { scan: IBodyScan; previous?: IBodyScan; onDelete: () => void }): JSX.Element {
  const { scan, previous } = props;
  const date = new Date(scan.timestamp).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (
    <View className="p-3 mb-3 border rounded-lg border-border-neutral" testID="body-scan-card">
      <View className="flex-row justify-between mb-2">
        <Text className="text-base font-semibold">{date}</Text>
        <Pressable onPress={props.onDelete} testID="body-scan-delete">
          <Text className="text-sm text-text-error">Delete</Text>
        </Pressable>
      </View>
      {BodyScans_fields.map((field) => {
        const value = scan[field.key];
        if (value == null) {
          return null;
        }
        const change = BodyScans_change(field, scan, previous);
        return (
          <View key={field.key} className="flex-row justify-between py-0.5">
            <Text className="text-sm text-text-secondary">{field.label}</Text>
            <Text className="text-sm">
              {BodyScans_formatValue(field, value, scan.unit)}
              {change != null && change.delta !== 0 && (
                <Text className={`text-xs ${trendClass[change.trend]}`}>
                  {"  "}
                  {BodyScans_formatDelta(field, change, scan.unit)}
                </Text>
              )}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function ScreenBodyScans(): JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const unit: IBodyScanUnit = state.storage.settings.units === "lb" ? "lb" : "kg";
  const log = useBodyScans();
  const [form, setForm] = useState<IBodyScanForm>({});

  useNavOptions({ navTitle: "Body composition" });

  const save = async (): Promise<void> => {
    const result = BodyScans_fromForm(form, unit, Date.now());
    if (result.kind === "error") {
      Dialog_alert(result.message);
      return;
    }
    const { scan } = result;
    await BodyScanStore_update((l) => BodyScans_put(l, scan));
    const stats = BodyScans_toStats(scan);
    if (stats.weight != null) {
      EditStats_addWeightStats(dispatch, { weight: stats.weight }, scan.timestamp);
    }
    if (stats.bodyfat != null) {
      EditStats_addPercentageStats(dispatch, { bodyfat: stats.bodyfat }, scan.timestamp);
    }
    setForm({});
  };

  const remove = async (id: number): Promise<void> => {
    if (await Dialog_confirm("Delete this scan? Weight and body fat stay in Body measurements.")) {
      await BodyScanStore_update((l) => BodyScans_remove(l, id));
    }
  };

  return (
    <View className="px-4 pt-2 pb-8" testID="body-scans-screen" data-testid="body-scans-screen">
      <Text className="mb-3 text-sm text-text-secondary">
        Copy the numbers from your gym scan. Leave out any you don't have.
      </Text>
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {BodyScans_fields.map((field) => (
          <View key={field.key} style={{ width: "48%" }}>
            <Text className="mb-1.5 text-sm font-semibold">
              {field.label}
              {field.kind === "mass" ? ` (${unit})` : field.kind === "percent" ? " (%)" : ""}
            </Text>
            <FoodTextInput
              testID={`body-scan-${field.key}`}
              value={form[field.key] ?? ""}
              onChangeText={(text) => setForm({ ...form, [field.key]: text })}
              keyboardType="decimal-pad"
              inputMode="decimal"
            />
          </View>
        ))}
      </View>
      <View className="flex-row mt-4">
        <FoodPrimaryButton title="Save scan" testID="body-scan-save" onPress={save} />
      </View>
      <Text className="mt-8 mb-3 text-base font-semibold">Scans</Text>
      {log.scans.length === 0 && <Text className="text-sm text-text-secondary">No scans yet.</Text>}
      {log.scans.map((scan, i) => (
        <ScanCard key={scan.id} scan={scan} previous={log.scans[i + 1]} onDelete={() => remove(scan.id)} />
      ))}
    </View>
  );
}
