import { JSX, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { FoodTextInput } from "./foodUi";
import { Button } from "./button";
import { BodyScanPhoto } from "./bodyScanPhoto";
import { BodyScanRead_merge } from "../models/bodyScanRead";
import { useNavOptions } from "../navigation/useNavOptions";
import { useTrackedDispatch, useTrackedState } from "../navigation/TrackedStateContext";
import { Dialog_alert, Dialog_confirm } from "../utils/dialog";
import { BodyScanStore_update, useBodyScans } from "../utils/bodyScanStore";
import { EditStats_addPercentageStats, EditStats_addWeightStats } from "../models/editStats";
import {
  BodyScans_change,
  BodyScans_fields,
  BodyScans_formatDelta,
  BodyScans_put,
  BodyScans_remove,
  BodyScans_toStats,
  IBodyScan,
  IBodyScanForm,
  IBodyScanShareKey,
  IBodyScanUnit,
} from "../models/bodyScans";
import {
  BodyScanMassShare_afterRead,
  BodyScanMassShare_bodyWeight,
  BodyScanMassShare_formatValue,
  BodyScanMassShare_fromForm,
  BodyScanMassShare_isShareKey,
  BodyScanMassShare_modes,
  BodyScanMassShare_nearestWeight,
  BodyScanMassShare_switch,
  IBodyScanShareMode,
  IBodyScanShareModes,
} from "../models/bodyScanMassShare";

const trendClass = { better: "text-text-success", worse: "text-text-error", neutral: "text-text-secondary" };

function ShareModePicker(props: {
  fieldKey: IBodyScanShareKey;
  unit: IBodyScanUnit;
  mode: IBodyScanShareMode;
  onChange: (mode: IBodyScanShareMode) => void;
}): JSX.Element {
  const options: { mode: IBodyScanShareMode; label: string }[] = [
    { mode: "mass", label: props.unit },
    { mode: "percent", label: "%" },
  ];
  return (
    <View className="flex-row" style={{ gap: 4 }}>
      {options.map((option) => {
        const isActive = option.mode === props.mode;
        const testID = `body-scan-${props.fieldKey}-mode-${option.mode}`;
        return (
          <Pressable
            key={option.mode}
            testID={testID}
            data-testid={testID}
            onPress={() => props.onChange(option.mode)}
            className={`px-2 py-0.5 rounded-full border ${
              isActive ? "border-button-primarybackground bg-background-subtle" : "border-border-neutral"
            }`}
          >
            <Text className={`text-xs ${isActive ? "font-semibold" : "text-text-secondary"}`}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

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
        const value = BodyScanMassShare_formatValue(field, scan);
        if (value == null) {
          return null;
        }
        const change = BodyScans_change(field, scan, previous);
        return (
          <View key={field.key} className="flex-row justify-between py-0.5">
            <Text className="text-sm text-text-secondary">{field.label}</Text>
            <Text className="text-sm">
              {value}
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
  const [pickedModes, setPickedModes] = useState<IBodyScanShareModes>({});
  const [scanning, setScanning] = useState(false);
  const modes = { ...BodyScanMassShare_modes(log), ...pickedModes };
  const nearestWeight = (): number | undefined =>
    BodyScanMassShare_nearestWeight(state.storage.stats.weight.weight, Date.now(), unit);

  useNavOptions({ navTitle: "Body composition" });

  const switchMode = (key: IBodyScanShareKey, mode: IBodyScanShareMode): void => {
    if (mode === modes[key]) {
      return;
    }
    setForm(BodyScanMassShare_switch(form, key, mode, BodyScanMassShare_bodyWeight(form, nearestWeight())));
    setPickedModes({ ...pickedModes, [key]: mode });
  };

  const save = async (): Promise<void> => {
    const result = BodyScanMassShare_fromForm(form, modes, unit, Date.now(), nearestWeight());
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
    if (Object.keys(stats.percentage).length > 0) {
      EditStats_addPercentageStats(dispatch, stats.percentage, scan.timestamp);
    }
    setForm({});
    setPickedModes({});
  };

  const remove = async (id: number): Promise<void> => {
    if (await Dialog_confirm("Delete this scan? Weight, body fat, water, bone and muscle stay in Body measurements.")) {
      await BodyScanStore_update((l) => BodyScans_remove(l, id));
    }
  };

  return (
    <View className="px-4 pt-2 pb-8" testID="body-scans-screen" data-testid="body-scans-screen">
      <Text className="mb-3 text-sm text-text-secondary">
        Scan your gym printout or type the numbers. Check each value before saving. Leave out any you don't have.
      </Text>
      <BodyScanPhoto
        busy={scanning}
        onBusyChange={setScanning}
        onRead={(scan) => {
          setForm((current) => BodyScanRead_merge(current, scan, unit));
          setPickedModes((current) => BodyScanMassShare_afterRead({ ...modes, ...current }, scan));
        }}
      />
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {BodyScans_fields.map((field) => {
          const key = field.key;
          return (
            <View key={key} style={{ width: "48%" }}>
              {BodyScanMassShare_isShareKey(key) ? (
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-sm font-semibold">{field.label}</Text>
                  <ShareModePicker
                    fieldKey={key}
                    unit={unit}
                    mode={modes[key]}
                    onChange={(mode) => switchMode(key, mode)}
                  />
                </View>
              ) : (
                <Text className="mb-1.5 text-sm font-semibold">
                  {field.label}
                  {field.kind === "mass" ? ` (${unit})` : field.kind === "percent" ? " (%)" : ""}
                </Text>
              )}
              <FoodTextInput
                testID={`body-scan-${field.key}`}
                value={form[field.key] ?? ""}
                onChangeText={(text) => setForm({ ...form, [field.key]: text })}
                keyboardType="decimal-pad"
                inputMode="decimal"
                editable={!scanning}
              />
            </View>
          );
        })}
      </View>
      <View className="flex-row mt-4">
        <Button name="body-scan-save" kind="pill" className="flex-1" onPress={save} disabled={scanning}>
          Save scan
        </Button>
      </View>
      <Text className="mt-8 mb-3 text-base font-semibold">Scans</Text>
      {log.scans.length === 0 && <Text className="text-sm text-text-secondary">No scans yet.</Text>}
      {log.scans.map((scan, i) => (
        <ScanCard key={scan.id} scan={scan} previous={log.scans[i + 1]} onDelete={() => remove(scan.id)} />
      ))}
    </View>
  );
}
