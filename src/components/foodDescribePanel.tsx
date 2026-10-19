import { JSX, useState } from "react";
import { View, ActivityIndicator, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { FoodAddFlow_photoChoices, IFoodPhotoChoice } from "../models/foodAddFlow";
import { FoodApi_describe } from "../utils/foodApi";
import { FoodPrimaryButton, FoodTextInput } from "./foodUi";
import { FoodChoicesReview } from "./foodChoicesReview";

interface IProps {
  onAdd: (choices: IFoodPhotoChoice[]) => void;
  onPhoto: (note: string) => void;
}

export function FoodDescribePanel(props: IProps): JSX.Element {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [note, setNote] = useState<string | undefined>(undefined);
  const [choices, setChoices] = useState<IFoodPhotoChoice[] | undefined>(undefined);

  const estimate = async (): Promise<void> => {
    setIsLoading(true);
    setError(undefined);
    const result = await FoodApi_describe(text);
    setIsLoading(false);
    setChoices(result.ok ? FoodAddFlow_photoChoices(result.value.items) : undefined);
    setNote(result.ok ? result.value.note : undefined);
    setError(result.ok ? undefined : result.error);
  };

  return (
    <View testID="food-describe-panel" data-testid="food-describe-panel">
      <Text className="pb-2 text-sm text-text-secondary">
        Say what you ate and how much, for example "2 eggs, a slice of toast with butter and a black coffee".
      </Text>
      <FoodTextInput
        testID="food-describe-input"
        value={text}
        onChangeText={setText}
        placeholder="What did you eat?"
        multiline={true}
        style={{ minHeight: 88, textAlignVertical: "top" }}
      />
      <View className="flex-row mt-3" style={{ gap: 8 }}>
        <FoodPrimaryButton
          testID="food-describe-submit"
          title={choices == null ? "Estimate" : "Estimate again"}
          kind={choices != null && choices.length > 0 ? "outline" : "primary"}
          disabled={isLoading || text.trim() === ""}
          onPress={estimate}
        />
      </View>
      {isLoading && <ActivityIndicator className="py-4" />}
      {error != null && <Text className="pt-3 text-sm text-text-error">{error}</Text>}
      {note != null && <Text className="pt-3 text-sm text-text-secondary">{note}</Text>}
      {choices != null && choices.length > 0 && (
        <View className="mt-2">
          <FoodChoicesReview choices={choices} onChange={setChoices} onAdd={props.onAdd} />
        </View>
      )}
      {(choices != null || note != null) && (
        <Pressable className="py-3" testID="food-describe-photo" onPress={() => props.onPhoto(text)}>
          <Text className="text-base text-text-link">Add a photo for a better guess</Text>
        </Pressable>
      )}
    </View>
  );
}
