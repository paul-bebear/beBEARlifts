import { JSX } from "react";
import { View } from "react-native";
import { INutritionLabelForm } from "../models/nutritionLabel";
import { FoodTextInput } from "./foodUi";
import { Text } from "./primitives/text";

const textFields: { key: keyof INutritionLabelForm; label: string; placeholder: string }[] = [
  { key: "name", label: "Name", placeholder: "e.g. Buldak ramen" },
  { key: "brand", label: "Brand (optional)", placeholder: "e.g. Samyang" },
];
const numberFields: { key: keyof INutritionLabelForm; label: string }[] = [
  { key: "servingGrams", label: "Serving (g)" },
  { key: "calories", label: "Calories" },
  { key: "protein", label: "Protein (g)" },
  { key: "carbs", label: "Carbs (g)" },
  { key: "fat", label: "Fat (g)" },
];

export function FoodLabelForm(props: {
  form: INutritionLabelForm;
  onChange: (form: INutritionLabelForm) => void;
}): JSX.Element {
  const { form } = props;
  return (
    <View>
      {textFields.map((f) => (
        <View key={f.key} className="mb-3">
          <Text className="mb-1.5 text-sm font-semibold">{f.label}</Text>
          <FoodTextInput
            testID={`food-label-${f.key}`}
            value={form[f.key]}
            onChangeText={(text) => props.onChange({ ...form, [f.key]: text })}
            placeholder={f.placeholder}
          />
        </View>
      ))}
      <Text className="mb-1.5 text-xs font-semibold tracking-wide uppercase text-text-secondary">Per serving</Text>
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {numberFields.map((f) => (
          <View key={f.key} style={{ width: "48%" }}>
            <Text className="mb-1.5 text-sm font-semibold">{f.label}</Text>
            <FoodTextInput
              testID={`food-label-${f.key}`}
              value={form[f.key]}
              onChangeText={(text) => props.onChange({ ...form, [f.key]: text })}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder="0"
            />
          </View>
        ))}
      </View>
    </View>
  );
}
