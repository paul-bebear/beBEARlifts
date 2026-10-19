import { JSX, useState } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { FoodPrimaryButton, FoodTextInput } from "./foodUi";

interface IProps {
  kind: "meal" | "recipe";
  count: number;
  onSave: (name: string, servings: number) => void;
  onBack: () => void;
}

export function FoodSaveGroupPanel(props: IProps): JSX.Element {
  const [name, setName] = useState("");
  const [servingsText, setServingsText] = useState("4");
  const servings = Math.round(Number(servingsText.replace(",", ".")));
  const isValid = name.trim() !== "" && (props.kind === "meal" || (servings >= 1 && servings <= 100));
  return (
    <View testID="food-save-group" data-testid="food-save-group">
      <Text className="pb-3 text-sm text-text-secondary">
        {props.kind === "meal"
          ? `Save these ${props.count} foods as a meal you can log in one tap.`
          : `These ${props.count} foods are the ingredients for the whole batch. You log one serving at a time.`}
      </Text>
      <Text className="mb-1.5 text-sm font-semibold">Name</Text>
      <FoodTextInput
        testID="food-save-group-name"
        value={name}
        onChangeText={setName}
        placeholder={props.kind === "meal" ? "e.g. Usual breakfast" : "e.g. Chili con carne"}
      />
      {props.kind === "recipe" && (
        <>
          <Text className="mt-3 mb-1.5 text-sm font-semibold">Servings in the batch</Text>
          <FoodTextInput
            testID="food-save-group-servings"
            value={servingsText}
            onChangeText={setServingsText}
            keyboardType="number-pad"
            inputMode="numeric"
          />
        </>
      )}
      <View className="flex-row mt-5" style={{ gap: 8 }}>
        <FoodPrimaryButton title="Back" kind="outline" onPress={props.onBack} />
        <FoodPrimaryButton
          testID="food-save-group-submit"
          title="Save"
          disabled={!isValid}
          onPress={() => props.onSave(name, servings)}
        />
      </View>
    </View>
  );
}
