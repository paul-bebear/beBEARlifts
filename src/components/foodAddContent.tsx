import { JSX, useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { Text } from "./primitives/text";
import { FoodLog_add, FoodLog_remove, FoodLog_setGrams, FoodLog_setMeal, IFoodMeal } from "../models/foodLog";
import {
  FoodAddFlow_entriesFromPhoto,
  FoodAddFlow_entryFromPick,
  FoodAddFlow_initialGrams,
  FoodAddFlow_manualPick,
  FoodAddFlow_pickFromProduct,
  IFoodPick,
} from "../models/foodAddFlow";
import { FoodApi_lookupBarcode } from "../utils/foodApi";
import { FoodLogStore_newId, FoodLogStore_update, useFoodLog } from "../utils/foodLogStore";
import type { IFoodAddModalParams } from "../navigation/types";
import { FoodSearchPanel } from "./foodSearchPanel";
import { FoodAmountPanel } from "./foodAmountPanel";
import { FoodBarcodeScanner } from "./foodBarcodeScanner";
import { FoodPhotoPanel } from "./foodPhotoPanel";
import { FoodQuickAddPanel } from "./foodQuickAddPanel";
import { FoodPrimaryButton } from "./foodUi";
import { Dialog_confirm } from "../utils/dialog";

type IAddMode = "search" | "barcode" | "photo";

type IStep =
  | { kind: IAddMode }
  | { kind: "lookup"; code: string }
  | { kind: "notFound"; code: string; error?: string }
  | { kind: "amount"; pick: IFoodPick; from: IAddMode }
  | { kind: "quickAdd" };

const tabs: { mode: IAddMode; label: string }[] = [
  { mode: "search", label: "Search" },
  { mode: "barcode", label: "Scan barcode" },
  { mode: "photo", label: "Plate photo" },
];

function Tabs(props: { mode: IAddMode | undefined; onChange: (mode: IAddMode) => void }): JSX.Element {
  return (
    <View className="flex-row p-0.5 mb-4 mr-8 rounded-full bg-background-subtle">
      {tabs.map((t) => {
        const isActive = t.mode === props.mode;
        return (
          <Pressable
            key={t.mode}
            testID={`food-tab-${t.mode}`}
            data-testid={`food-tab-${t.mode}`}
            onPress={() => props.onChange(t.mode)}
            className={`flex-1 items-center py-1.5 rounded-full ${isActive ? "bg-background-neutral" : ""}`}
          >
            <Text className={`text-sm ${isActive ? "font-semibold text-text-link" : "text-text-secondary"}`}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function EditEntry(props: { entryId: string; onClose: () => void }): JSX.Element {
  const log = useFoodLog();
  const entry = log.entries.find((e) => e.id === props.entryId);
  if (entry == null) {
    return <Text className="py-6 text-base text-center">This food is no longer in the log.</Text>;
  }
  const pick: IFoodPick = {
    name: entry.name,
    brand: entry.brand,
    source: entry.source,
    per100g: entry.per100g,
    fixed: entry.per100g == null ? { grams: entry.grams, nutrients: entry.nutrients } : undefined,
  };
  return (
    <FoodAmountPanel
      pick={pick}
      initialGrams={entry.grams ?? 100}
      meal={entry.meal}
      submitTitle="Save"
      onDelete={async () => {
        if (await Dialog_confirm(`Delete ${entry.name}?`)) {
          await FoodLogStore_update((l) => FoodLog_remove(l, entry.id));
          props.onClose();
        }
      }}
      onSubmit={async (grams, meal) => {
        await FoodLogStore_update((l) => FoodLog_setMeal(FoodLog_setGrams(l, entry.id, grams), entry.id, meal));
        props.onClose();
      }}
    />
  );
}

export function FoodAddContent(props: { params: IFoodAddModalParams; onClose: () => void }): JSX.Element {
  const { params } = props;
  const log = useFoodLog();
  const [step, setStep] = useState<IStep>({ kind: params.mode === "edit" ? "search" : params.mode });
  if (params.mode === "edit") {
    return <EditEntry entryId={params.entryId} onClose={props.onClose} />;
  }
  const where = { day: params.day, meal: params.meal };

  const addPick = async (pick: IFoodPick, grams: number, meal: IFoodMeal): Promise<void> => {
    const entry = FoodAddFlow_entryFromPick(pick, grams, { ...where, meal }, FoodLogStore_newId(), Date.now());
    await FoodLogStore_update((l) => FoodLog_add(l, entry));
    props.onClose();
  };

  const onBarcode = async (code: string): Promise<void> => {
    setStep({ kind: "lookup", code });
    const result = await FoodApi_lookupBarcode(code);
    if (result.ok && result.value != null) {
      setStep({ kind: "amount", pick: FoodAddFlow_pickFromProduct(result.value, "barcode"), from: "barcode" });
    } else {
      setStep({ kind: "notFound", code, error: result.ok ? undefined : result.error });
    }
  };

  const activeTab = step.kind === "search" || step.kind === "barcode" || step.kind === "photo" ? step.kind : undefined;
  return (
    <View testID="food-add-content" data-testid="food-add-content">
      {step.kind !== "amount" && step.kind !== "quickAdd" && (
        <Tabs mode={activeTab} onChange={(mode) => setStep({ kind: mode })} />
      )}
      {step.kind === "search" && (
        <FoodSearchPanel
          recents={log.recents}
          onPick={(pick) => setStep({ kind: "amount", pick, from: "search" })}
          onQuickAdd={() => setStep({ kind: "quickAdd" })}
        />
      )}
      {step.kind === "barcode" && <FoodBarcodeScanner onDetected={onBarcode} />}
      {step.kind === "lookup" && (
        <View className="items-center py-8">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-text-secondary">Looking up {step.code}…</Text>
        </View>
      )}
      {step.kind === "notFound" && (
        <View className="py-4">
          <Text className="text-base">
            {step.error ?? `Barcode ${step.code} is not in Open Food Facts, or it has no nutrition data.`}
          </Text>
          <View className="flex-row mt-4" style={{ gap: 8 }}>
            <FoodPrimaryButton title="Scan again" kind="outline" onPress={() => setStep({ kind: "barcode" })} />
            <FoodPrimaryButton title="Quick add" onPress={() => setStep({ kind: "quickAdd" })} />
          </View>
        </View>
      )}
      {step.kind === "photo" && (
        <FoodPhotoPanel
          meal={where.meal}
          onSubmit={async (choices, meal) => {
            const entries = FoodAddFlow_entriesFromPhoto(choices, { ...where, meal }, FoodLogStore_newId, Date.now());
            await FoodLogStore_update((l) => entries.reduce(FoodLog_add, l));
            props.onClose();
          }}
        />
      )}
      {step.kind === "amount" && (
        <FoodAmountPanel
          pick={step.pick}
          initialGrams={FoodAddFlow_initialGrams(step.pick)}
          meal={where.meal}
          submitTitle="Add"
          onBack={() => setStep({ kind: step.from })}
          onSubmit={(grams, meal) => addPick(step.pick, grams, meal)}
        />
      )}
      {step.kind === "quickAdd" && (
        <FoodQuickAddPanel
          meal={where.meal}
          onBack={() => setStep({ kind: "search" })}
          onSubmit={(name, nutrients, meal) => addPick(FoodAddFlow_manualPick(name, nutrients), 0, meal)}
        />
      )}
    </View>
  );
}
