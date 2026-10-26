import { JSX, useReducer } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { IFoodProduct } from "../models/openFoodFacts";
import { FoodLabel_empty, FoodLabel_reduce } from "../models/foodCapture";
import { NutritionLabel_toProduct } from "../models/nutritionLabel";
import { AiConsent_showFeatures } from "../models/aiConsent";
import { AiConsentStore } from "../utils/aiConsentClient";
import { NativeFoodCapture_label } from "../utils/nativeFoodCapture.native";
import { FoodLabelForm } from "./foodLabelForm";
import { CloudStore } from "../utils/supabaseClient";
import { Button } from "./button";
import { FoodAiSignIn } from "./foodAiSignIn";

interface IProps {
  barcode?: string;
  onSave: (product: IFoodProduct) => void;
  onBack: () => void;
}

export function FoodLabelPanel(props: IProps): JSX.Element {
  const [state, emit] = useReducer(FoodLabel_reduce, undefined, FoodLabel_empty);
  const showAi = AiConsent_showFeatures(AiConsentStore.use());
  const hasSession = CloudStore.use().session != null;
  return (
    <View testID="food-label-panel">
      <Text className="pb-3 text-sm text-text-secondary">
        Take a close, flat photo of the nutrition label, or type its numbers below. Check the numbers before saving.
      </Text>
      {state.busy && (
        <View className="items-center py-6">
          <ActivityIndicator />
          <Text className="mt-2 text-sm">Reading the label…</Text>
        </View>
      )}
      {!state.busy && state.form != null && (
        <FoodLabelForm form={state.form} onChange={(form) => emit({ type: "edit", form })} />
      )}
      {state.error != null && (
        <Text className="pt-3 text-sm text-text-error" accessibilityRole="alert">
          {state.error}
        </Text>
      )}
      {!state.busy && state.form == null && (
        <Pressable className="py-3" testID="food-label-manual" onPress={() => emit({ type: "manual" })}>
          <Text className="text-base text-text-link">Type it in instead</Text>
        </Pressable>
      )}
      {!state.busy && showAi && !hasSession && <FoodAiSignIn />}
      {!state.busy && showAi && hasSession && (
        <View className="flex-row mt-3" style={{ gap: 8 }}>
          <Button
            name="food-label-camera"
            kind="pill"
            className="flex-1"
            onPress={async () => {
              emit({ type: "start" });
              emit(await NativeFoodCapture_label("camera"));
            }}
          >
            Photo the label
          </Button>
          <Button
            name="food-label-library"
            kind="pill-outline"
            className="flex-1"
            onPress={async () => {
              emit({ type: "start" });
              emit(await NativeFoodCapture_label("photo-library"));
            }}
          >
            Choose photo
          </Button>
        </View>
      )}
      <View className="flex-row mt-5" style={{ gap: 8 }}>
        <Button name="food-label-panel-back" kind="pill-outline" className="flex-1" onPress={props.onBack}>
          Back
        </Button>
        {!state.busy && state.form != null && (
          <Button
            name="food-label-save"
            kind="pill"
            className="flex-1"
            onPress={() => {
              const result = NutritionLabel_toProduct(state.form!, props.barcode);
              if (result.ok) {
                props.onSave(result.product);
              } else {
                emit({ type: "failed", error: result.error });
              }
            }}
          >
            Save
          </Button>
        )}
      </View>
    </View>
  );
}
