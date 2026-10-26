import { JSX, useEffect, useReducer, useState } from "react";
import { ActivityIndicator, Image, View } from "react-native";
import { Text } from "./primitives/text";
import { IFoodPhotoChoice } from "../models/foodAddFlow";
import { FoodPhoto_empty, FoodPhoto_reduce, FoodPhoto_shouldOpenCamera } from "../models/foodCapture";
import type { IScanResume } from "../models/foodScanSteps";
import { NativeFoodCapture_meal } from "../utils/nativeFoodCapture.native";
import { CloudStore } from "../utils/supabaseClient";
import { FoodAiSignIn } from "./foodAiSignIn";
import { FoodChoicesReview } from "./foodChoicesReview";
import { FoodTextInput } from "./foodUi";
import { Button } from "./button";

interface IProps {
  initialNote?: string;
  resume?: IScanResume;
  onAdd: (choices: IFoodPhotoChoice[]) => void;
}

export function FoodPhotoPanel(props: IProps): JSX.Element {
  const hasSession = CloudStore.use().session != null;
  const [state, emit] = useReducer(FoodPhoto_reduce, props.resume, FoodPhoto_empty);
  const [note, setNote] = useState(props.initialNote ?? "");
  useEffect(() => {
    if (FoodPhoto_shouldOpenCamera(hasSession, state)) {
      emit({ type: "start" });
      NativeFoodCapture_meal("camera", props.initialNote ?? "").then(emit);
    }
  }, [hasSession]);
  if (!hasSession) {
    return <FoodAiSignIn />;
  }
  return (
    <View testID="food-photo-panel">
      {state.preview != null && (
        <Image
          source={{ uri: state.preview }}
          resizeMode="cover"
          accessibilityLabel="Selected food photo"
          style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 16, marginBottom: 12 }}
        />
      )}
      <Text className="pb-3 text-sm text-text-secondary">
        Take a photo from above with the whole plate in view. Check the portions before adding your food.
      </Text>
      <FoodTextInput
        testID="food-photo-note"
        value={note}
        onChangeText={setNote}
        placeholder="Optional note, e.g. half the rice was left"
        editable={!state.busy}
      />
      {state.busy && (
        <View className="items-center py-6">
          <ActivityIndicator />
          <Text className="mt-2 text-sm">Looking at your plate…</Text>
        </View>
      )}
      {state.error != null && (
        <Text className="py-3 text-sm text-text-error" accessibilityRole="alert">
          {state.error}
        </Text>
      )}
      {state.note != null && <Text className="pt-3 text-sm text-text-secondary">{state.note}</Text>}
      {!state.busy && state.choices != null && state.choices.length > 0 && (
        <FoodChoicesReview
          choices={state.choices}
          onChange={(choices) => emit({ type: "choices", choices })}
          onAdd={props.onAdd}
        />
      )}
      {!state.busy && (
        <View className="flex-row mt-3" style={{ gap: 8 }}>
          <Button
            name="food-photo-camera"
            kind="pill"
            className="flex-1"
            onPress={async () => {
              emit({ type: "start" });
              emit(await NativeFoodCapture_meal("camera", note));
            }}
          >
            Take photo
          </Button>
          <Button
            name="food-photo-library"
            kind="pill-outline"
            className="flex-1"
            onPress={async () => {
              emit({ type: "start" });
              emit(await NativeFoodCapture_meal("photo-library", note));
            }}
          >
            Choose photo
          </Button>
        </View>
      )}
    </View>
  );
}
