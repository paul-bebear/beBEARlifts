import { JSX, useState } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { FoodLog_sum } from "../models/foodLog";
import { FoodAddFlow_parseGrams, FoodAddFlow_setPhotoGrams, IFoodPhotoChoice } from "../models/foodAddFlow";
import { FoodNutrientsRow, FoodPrimaryButton, FoodTextInput } from "./foodUi";

function ChoiceRow(props: {
  choice: IFoodPhotoChoice;
  onToggle: () => void;
  onGrams: (grams: number) => void;
}): JSX.Element {
  const { choice } = props;
  const [gramsText, setGramsText] = useState(`${choice.grams}`);
  const commitGrams = (): void => {
    const grams = FoodAddFlow_parseGrams(gramsText);
    if (grams != null && grams !== choice.grams) {
      props.onGrams(grams);
    }
  };
  return (
    <View className="flex-row items-center py-2.5 border-b border-border-neutral" testID="food-ai-item">
      <Pressable onPress={props.onToggle} className="pr-3" hitSlop={8}>
        <View
          className={`items-center justify-center w-6 h-6 rounded-md border ${
            choice.isSelected ? "bg-blue-400 border-blue-400" : "border-border-prominent"
          }`}
        >
          {choice.isSelected && <Text className="text-sm font-bold text-black">✓</Text>}
        </View>
      </Pressable>
      <View className="flex-1 pr-2">
        <Text className="text-base" numberOfLines={2}>
          {choice.name}
        </Text>
        <Text className="text-xs text-text-secondary">
          {choice.nutrients.calories} cal · {Math.round(choice.nutrients.protein)} P ·{" "}
          {Math.round(choice.nutrients.carbs)} C · {Math.round(choice.nutrients.fat)} F
        </Text>
      </View>
      <FoodTextInput
        value={gramsText}
        onChangeText={setGramsText}
        keyboardType="decimal-pad"
        inputMode="decimal"
        selectTextOnFocus={true}
        style={{ width: 64, textAlign: "right" }}
        onBlur={commitGrams}
        onSubmitEditing={commitGrams}
      />
      <Text className="ml-1 text-sm text-text-secondary">g</Text>
    </View>
  );
}

export function FoodChoicesReview(props: {
  choices: IFoodPhotoChoice[];
  onChange: (choices: IFoodPhotoChoice[]) => void;
  onAdd: (choices: IFoodPhotoChoice[]) => void;
}): JSX.Element {
  const { choices } = props;
  const selected = choices.filter((c) => c.isSelected);
  return (
    <View>
      {choices.map((choice, i) => (
        <ChoiceRow
          key={`${choice.name}-${i}`}
          choice={choice}
          onToggle={() => props.onChange(choices.map((c, j) => (j === i ? { ...c, isSelected: !c.isSelected } : c)))}
          onGrams={(grams) => props.onChange(FoodAddFlow_setPhotoGrams(choices, i, grams))}
        />
      ))}
      <View className="mt-4">
        <FoodNutrientsRow nutrients={FoodLog_sum(selected.map((c) => c.nutrients))} />
      </View>
      <View className="flex-row mt-4">
        <FoodPrimaryButton
          testID="food-ai-add"
          title={`Add ${selected.length} item${selected.length === 1 ? "" : "s"}`}
          disabled={selected.length === 0}
          onPress={() => props.onAdd(selected)}
        />
      </View>
    </View>
  );
}
