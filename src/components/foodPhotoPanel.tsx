import { JSX, useRef, useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { Text } from "./primitives/text";
import { FoodLog_sum, IFoodMeal } from "../models/foodLog";
import {
  FoodAddFlow_parseGrams,
  FoodAddFlow_photoChoices,
  FoodAddFlow_setPhotoGrams,
  IFoodPhotoChoice,
} from "../models/foodAddFlow";
import { FoodApi_estimatePhoto } from "../utils/foodApi";
import { ImageResize_toJpegDataUrl } from "../utils/imageResize";
import { FoodMealPicker, FoodNutrientsRow, FoodPrimaryButton, FoodTextInput } from "./foodUi";

interface IProps {
  meal: IFoodMeal;
  onSubmit: (choices: IFoodPhotoChoice[], meal: IFoodMeal) => void;
}

type IStatus = { kind: "idle" } | { kind: "analyzing" } | { kind: "error"; message: string };

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
    <View className="flex-row items-center py-2.5 border-b border-border-neutral" testID="food-photo-item">
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

export function FoodPhotoPanel(props: IProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<IStatus>({ kind: "idle" });
  const [preview, setPreview] = useState<string | undefined>(undefined);
  const [choices, setChoices] = useState<IFoodPhotoChoice[] | undefined>(undefined);
  const [note, setNote] = useState<string | undefined>(undefined);
  const [meal, setMeal] = useState(props.meal);

  const onFile = async (file: File | undefined): Promise<void> => {
    if (file == null) {
      return;
    }
    setChoices(undefined);
    setNote(undefined);
    setStatus({ kind: "analyzing" });
    let dataUrl: string;
    try {
      dataUrl = await ImageResize_toJpegDataUrl(file);
    } catch {
      setStatus({ kind: "error", message: "The photo could not be read. Try another one." });
      return;
    }
    setPreview(dataUrl);
    const result = await FoodApi_estimatePhoto(dataUrl);
    if (!result.ok) {
      setStatus({ kind: "error", message: result.error });
      return;
    }
    setStatus({ kind: "idle" });
    setChoices(FoodAddFlow_photoChoices(result.value.items));
    setNote(result.value.note);
  };

  const selected = (choices ?? []).filter((c) => c.isSelected);
  return (
    <View testID="food-photo-panel" data-testid="food-photo-panel">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        data-testid="food-photo-input"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {preview != null && (
        <View className="mb-3 overflow-hidden rounded-2xl" style={{ aspectRatio: 4 / 3 }}>
          <img src={preview} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </View>
      )}
      {status.kind === "analyzing" && (
        <View className="items-center py-6">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-text-secondary">Looking at your plate…</Text>
        </View>
      )}
      {status.kind === "error" && <Text className="py-3 text-sm text-text-error">{status.message}</Text>}
      {choices == null && status.kind !== "analyzing" && (
        <Text className="pb-4 text-sm text-text-secondary">
          Take a photo from above with the whole plate in view. The AI names each food and guesses the grams. Check the
          grams before you log, because portion guesses are often 20 to 30% off.
        </Text>
      )}
      {note != null && <Text className="pb-2 text-sm text-text-secondary">{note}</Text>}
      {choices != null && choices.length > 0 && (
        <>
          {choices.map((choice, i) => (
            <ChoiceRow
              key={`${choice.name}-${i}`}
              choice={choice}
              onToggle={() => setChoices(choices.map((c, j) => (j === i ? { ...c, isSelected: !c.isSelected } : c)))}
              onGrams={(grams) => setChoices(FoodAddFlow_setPhotoGrams(choices, i, grams))}
            />
          ))}
          <View className="mt-4">
            <FoodNutrientsRow nutrients={FoodLog_sum(selected.map((c) => c.nutrients))} />
          </View>
          <Text className="mt-4 mb-1.5 text-sm font-semibold">Meal</Text>
          <FoodMealPicker meal={meal} onChange={setMeal} />
        </>
      )}
      <View className="flex-row mt-5" style={{ gap: 8 }}>
        {status.kind !== "analyzing" && (
          <FoodPrimaryButton
            testID="food-photo-pick"
            title={preview == null ? "Take or choose a photo" : "New photo"}
            kind={choices != null && choices.length > 0 ? "outline" : "primary"}
            onPress={() => inputRef.current?.click()}
          />
        )}
        {choices != null && choices.length > 0 && (
          <FoodPrimaryButton
            testID="food-photo-submit"
            title={`Log ${selected.length} item${selected.length === 1 ? "" : "s"}`}
            disabled={selected.length === 0}
            onPress={() => props.onSubmit(choices, meal)}
          />
        )}
      </View>
    </View>
  );
}
