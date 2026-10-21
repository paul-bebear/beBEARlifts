import { JSX, useRef, useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { Text } from "./primitives/text";
import { IFoodProduct } from "../models/openFoodFacts";
import { INutritionLabelForm, NutritionLabel_toForm, NutritionLabel_toProduct } from "../models/nutritionLabel";
import { FoodApi_readLabel } from "../utils/foodApi";
import { ImageResize_toJpegDataUrl } from "../utils/imageResize";
import { FoodPrimaryButton } from "./foodUi";
import { FoodLabelForm } from "./foodLabelForm";
import { AiConsent_showFeatures } from "../models/aiConsent";
import { AiConsent_ensure, AiConsentStore } from "../utils/aiConsentClient";

interface IProps {
  barcode?: string;
  onSave: (product: IFoodProduct) => void;
  onBack: () => void;
}

const labelMaxSidePx = 1600;

export function FoodLabelPanel(props: IProps): JSX.Element {
  const showAi = AiConsent_showFeatures(AiConsentStore.use());
  const inputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<INutritionLabelForm | undefined>(undefined);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const onFile = async (file: File): Promise<void> => {
    setIsReading(true);
    setError(undefined);
    const result = await ImageResize_toJpegDataUrl(file, labelMaxSidePx).then(FoodApi_readLabel, () => ({
      ok: false as const,
      error: "The photo could not be read. Try another one.",
    }));
    setIsReading(false);
    if (result.ok) {
      setForm(NutritionLabel_toForm(result.value));
    } else {
      setError(result.error);
    }
  };

  const save = (): void => {
    if (form == null) {
      return;
    }
    const result = NutritionLabel_toProduct(form, props.barcode);
    if (result.ok) {
      props.onSave(result.product);
    } else {
      setError(result.error);
    }
  };

  return (
    <View testID="food-label-panel" data-testid="food-label-panel">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        data-testid="food-label-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file != null) {
            onFile(file);
          }
        }}
      />
      <Text className="pb-3 text-sm text-text-secondary">
        {form == null
          ? "Take a photo of the nutrition facts label, close and flat, or type the numbers in."
          : "Check the numbers against the label before you save."}
        {props.barcode != null && " The food is saved on this phone, so the next scan of this barcode finds it."}
      </Text>
      {isReading && (
        <View className="items-center py-6">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-text-secondary">Reading the label…</Text>
        </View>
      )}
      {form != null && !isReading && (
        <FoodLabelForm
          form={form}
          onChange={(changed) => {
            setForm(changed);
            setError(undefined);
          }}
        />
      )}
      {error != null && <Text className="pt-3 text-sm text-text-error">{error}</Text>}
      {form == null && !isReading && (
        <Pressable className="py-3" onPress={() => setForm(NutritionLabel_toForm(undefined))}>
          <Text className="text-base text-text-link">Type it in instead</Text>
        </Pressable>
      )}
      <View className="flex-row mt-5" style={{ gap: 8 }}>
        <FoodPrimaryButton title="Back" kind="outline" onPress={props.onBack} />
        {!isReading && showAi && (
          <FoodPrimaryButton
            testID="food-label-photo"
            title={form == null ? "Photo the label" : "New photo"}
            kind={form == null ? "primary" : "outline"}
            onPress={async () => {
              if (await AiConsent_ensure()) {
                inputRef.current?.click();
              }
            }}
          />
        )}
        {form != null && !isReading && <FoodPrimaryButton testID="food-label-save" title="Save" onPress={save} />}
      </View>
    </View>
  );
}
