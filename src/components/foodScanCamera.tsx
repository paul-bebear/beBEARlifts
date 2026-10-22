import { JSX } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import {
  FoodLog_copyDay,
  FoodLog_dayKey,
  FoodLog_dayLabel,
  FoodLog_entriesFor,
  FoodLog_shiftDay,
  INutrients,
} from "../models/foodLog";
import { IFoodPhotoChoice } from "../models/foodAddFlow";
import { FoodScanSteps_modes, IScanMode } from "../models/foodScanSteps";
import { FoodLogStore_newId, FoodLogStore_update, useFoodLog } from "../utils/foodLogStore";
import { AiConsent_ensure } from "../utils/aiConsentClient";
import { Dialog_alert, Dialog_confirm } from "../utils/dialog";
import { AiConsentGate } from "./aiConsentGate";
import { FoodBarcodeScanner } from "./foodBarcodeScanner";
import { FoodPhotoPanel } from "./foodPhotoPanel";
import { FoodQuickAddPanel } from "./foodQuickAddPanel";

interface IProps {
  day: string;
  mode: IScanMode;
  hasAi: boolean;
  onMode: (mode: IScanMode) => void;
  onBarcode: (code: string) => void;
  onPhotoReviewed: (choices: IFoodPhotoChoice[]) => void;
  onQuick: (name: string, nutrients: INutrients) => void;
  onSearch: () => void;
  onCopied: () => void;
}

const modeLabels: Record<IScanMode, string> = { barcode: "Barcode", ai: "AI scan", describe: "Describe" };

function ModeToggle(props: { modes: IScanMode[]; mode: IScanMode; onPick: (mode: IScanMode) => void }): JSX.Element {
  return (
    <View className="flex-row self-center p-0.5 rounded-full bg-background-neutral" testID="food-scan-toggle">
      {props.modes.map((mode) => {
        const isActive = mode === props.mode;
        return (
          <Pressable
            key={mode}
            testID={`food-scan-mode-${mode}`}
            data-testid={`food-scan-mode-${mode}`}
            onPress={() => props.onPick(mode)}
            className={`px-5 py-2 rounded-full ${isActive ? "bg-background-default" : ""}`}
          >
            <Text className={`text-base ${isActive ? "text-text-link font-semibold" : "text-text-secondary"}`}>
              {modeLabels[mode]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function FoodScanCamera(props: IProps): JSX.Element {
  const log = useFoodLog();

  const pickMode = async (mode: IScanMode): Promise<void> => {
    if (mode !== "ai" || (await AiConsent_ensure())) {
      props.onMode(mode);
    }
  };

  const copyPreviousDay = async (): Promise<void> => {
    const today = FoodLog_dayKey(new Date());
    const previous = FoodLog_shiftDay(props.day, -1);
    const count = FoodLog_entriesFor(log, previous).length;
    const label = FoodLog_dayLabel(previous, today);
    if (count === 0) {
      Dialog_alert(`Nothing is logged on ${label}.`);
    } else if (await Dialog_confirm(`Copy ${count} food${count === 1 ? "" : "s"} from ${label}?`)) {
      await FoodLogStore_update((l) => FoodLog_copyDay(l, previous, props.day, FoodLogStore_newId, Date.now()));
      props.onCopied();
    }
  };

  return (
    <View testID="food-scan-camera" data-testid="food-scan-camera">
      {props.mode === "barcode" && <FoodBarcodeScanner onDetected={props.onBarcode} />}
      {props.mode === "ai" && (
        <AiConsentGate>
          <FoodPhotoPanel onAdd={props.onPhotoReviewed} />
        </AiConsentGate>
      )}
      {props.mode === "describe" && (
        <FoodQuickAddPanel onBack={() => props.onMode("barcode")} onSubmit={props.onQuick} />
      )}
      <View className="mt-4">
        <ModeToggle modes={FoodScanSteps_modes(props.hasAi)} mode={props.mode} onPick={pickMode} />
      </View>
      <View className="flex-row justify-center mt-4" style={{ gap: 24 }}>
        <Pressable className="py-2" testID="food-scan-search" data-testid="food-scan-search" onPress={props.onSearch}>
          <Text className="text-base text-text-link">Search</Text>
        </Pressable>
        <Pressable className="py-2" testID="food-copy-day" data-testid="food-copy-day" onPress={copyPreviousDay}>
          <Text className="text-base text-text-link">Same as yesterday</Text>
        </Pressable>
      </View>
    </View>
  );
}
