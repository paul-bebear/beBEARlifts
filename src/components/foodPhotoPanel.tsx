import { JSX, useRef, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Text } from "./primitives/text";
import { FoodAddFlow_photoChoices, IFoodPhotoChoice } from "../models/foodAddFlow";
import { FoodApi_estimatePhoto } from "../utils/foodApi";
import { ImageResize_toJpegDataUrl } from "../utils/imageResize";
import { FoodPrimaryButton, FoodTextInput } from "./foodUi";
import { FoodChoicesReview } from "./foodChoicesReview";
import { AiConsent_ensure } from "../utils/aiConsentClient";

interface IProps {
  initialNote?: string;
  onAdd: (choices: IFoodPhotoChoice[]) => void;
}

type IStatus = { kind: "idle" } | { kind: "analyzing" } | { kind: "error"; message: string };

export function FoodPhotoPanel(props: IProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<IStatus>({ kind: "idle" });
  const [preview, setPreview] = useState<string | undefined>(undefined);
  const [choices, setChoices] = useState<IFoodPhotoChoice[] | undefined>(undefined);
  const [aiNote, setAiNote] = useState<string | undefined>(undefined);
  const [userNote, setUserNote] = useState(props.initialNote ?? "");

  const onFile = async (file: File): Promise<void> => {
    setChoices(undefined);
    setAiNote(undefined);
    setStatus({ kind: "analyzing" });
    const dataUrl = await ImageResize_toJpegDataUrl(file).catch(() => undefined);
    if (dataUrl == null) {
      setStatus({ kind: "error", message: "The photo could not be read. Try another one." });
      return;
    }
    setPreview(dataUrl);
    const result = await FoodApi_estimatePhoto(dataUrl, userNote);
    setStatus(result.ok ? { kind: "idle" } : { kind: "error", message: result.error });
    if (result.ok) {
      setChoices(FoodAddFlow_photoChoices(result.value.items));
      setAiNote(result.value.note);
    }
  };

  return (
    <View testID="food-photo-panel" data-testid="food-photo-panel">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        data-testid="food-photo-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file != null) {
            onFile(file);
          }
        }}
      />
      {preview != null && (
        <View className="mb-3 overflow-hidden rounded-2xl" style={{ aspectRatio: 4 / 3 }}>
          <img src={preview} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </View>
      )}
      {choices == null && status.kind !== "analyzing" && (
        <Text className="pb-3 text-sm text-text-secondary">
          Take a photo from above with the whole plate in view. Portion guesses are often 20 to 30% off, so check the
          grams before you add.
        </Text>
      )}
      <FoodTextInput
        testID="food-photo-note"
        value={userNote}
        onChangeText={setUserNote}
        placeholder="Optional note, e.g. half the rice was left"
      />
      {status.kind === "analyzing" && (
        <View className="items-center py-6">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-text-secondary">Looking at your plate…</Text>
        </View>
      )}
      {status.kind === "error" && <Text className="py-3 text-sm text-text-error">{status.message}</Text>}
      {aiNote != null && <Text className="pt-3 text-sm text-text-secondary">{aiNote}</Text>}
      {choices != null && choices.length > 0 && (
        <View className="mt-2">
          <FoodChoicesReview choices={choices} onChange={setChoices} onAdd={props.onAdd} />
        </View>
      )}
      {status.kind !== "analyzing" && (
        <View className="flex-row mt-3">
          <FoodPrimaryButton
            testID="food-photo-pick"
            title={preview == null ? "Take or choose a photo" : "New photo"}
            kind={choices != null && choices.length > 0 ? "outline" : "primary"}
            onPress={async () => {
              if (await AiConsent_ensure()) {
                inputRef.current?.click();
              }
            }}
          />
        </View>
      )}
    </View>
  );
}
