import { JSX, useReducer } from "react";
import { ActivityIndicator, Image, Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { FoodTextInput } from "./foodUi";
import { FoodChoicesReview } from "./foodChoicesReview";
import { FoodAiSignIn } from "./foodAiSignIn";
import { IFoodPhotoChoice } from "../models/foodAddFlow";
import {
  FoodAiEstimate_canSend,
  FoodAiEstimate_hasChoices,
  FoodAiEstimate_initial,
  FoodAiEstimate_reduce,
  FoodAiEstimate_request,
} from "../models/foodAiEstimate";
import type { IFoodCaptureSource } from "../models/foodCapture";
import type { IScanResume } from "../models/foodScanSteps";
import { FoodApi_estimate } from "../utils/foodApi";
import { FoodMealPhoto_pick } from "../utils/foodMealPhoto";
import { CloudStore, SupabaseClient_accessToken } from "../utils/supabaseClient";
import { AiConsent_disabledMessage, AiConsent_ensure } from "../utils/aiConsentClient";

interface IProps {
  resume?: IScanResume;
  onAdd: (choices: IFoodPhotoChoice[], photo?: string, text?: string) => void;
}

export function FoodAiPanel(props: IProps): JSX.Element {
  const session = CloudStore.use().session;
  const [state, dispatch] = useReducer(FoodAiEstimate_reduce, props.resume, FoodAiEstimate_initial);
  const canSend = FoodAiEstimate_canSend(state);

  const pick = async (source: IFoodCaptureSource): Promise<void> => {
    dispatch({ type: "picked", result: await FoodMealPhoto_pick(source) });
  };

  const send = async (): Promise<void> => {
    const request = FoodAiEstimate_request(state);
    if (request == null) {
      return;
    }
    dispatch({ type: "sent" });
    if (!(await AiConsent_ensure())) {
      dispatch({ type: "failed", error: AiConsent_disabledMessage });
      return;
    }
    const auth = await SupabaseClient_accessToken();
    if (!auth.ok) {
      dispatch({ type: "signedOut", error: auth.error });
      return;
    }
    const result = await FoodApi_estimate(request);
    dispatch(result.ok ? { type: "estimated", estimate: result.value } : { type: "failed", error: result.error });
  };

  if (session == null) {
    return <FoodAiSignIn />;
  }

  return (
    <View testID="food-ai-panel" data-testid="food-ai-panel">
      <View className="px-3 py-2 border rounded-2xl bg-form-inputbg border-form-inputstroke">
        <FoodTextInput
          testID="food-ai-input"
          className="px-0 py-1 border-0 bg-transparent"
          value={state.text}
          onChangeText={(text) => dispatch({ type: "typed", text })}
          placeholder="What did you eat? Add a photo if you have one."
          multiline={true}
          style={{ minHeight: 56, maxHeight: 140 }}
        />
      </View>
      {state.photo != null && (
        <View className="flex-row items-center mt-3">
          <Image
            testID="food-ai-photo"
            source={{ uri: state.photo }}
            resizeMode="cover"
            accessibilityLabel="Attached food photo"
            style={{ width: 72, height: 72, borderRadius: 12 }}
          />
          <Pressable
            className="px-3 py-2 ml-3"
            testID="food-ai-photo-remove"
            data-testid="food-ai-photo-remove"
            accessibilityRole="button"
            onPress={() => dispatch({ type: "photoRemoved" })}
          >
            <Text className="text-base text-text-link">Remove photo</Text>
          </Pressable>
        </View>
      )}
      <View className="flex-row mt-3" style={{ gap: 8 }}>
        <Button name="food-photo-camera" kind="pill-outline" className="flex-1" onPress={() => pick("camera")}>
          Take photo
        </Button>
        <Button name="food-photo-library" kind="pill-outline" className="flex-1" onPress={() => pick("photo-library")}>
          Choose photo
        </Button>
      </View>
      <View className="mt-3">
        <Button name="food-ai-send" testID="food-ai-send" kind="pill" disabled={!canSend} onPress={send}>
          Send
        </Button>
      </View>
      {state.isSending && (
        <View className="items-center py-4">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-text-secondary">
            {state.photo != null ? "Looking at your plate…" : "Working out your meal…"}
          </Text>
        </View>
      )}
      {state.error != null && (
        <Text className="pt-3 text-sm text-text-error" accessibilityRole="alert">
          {state.error}
        </Text>
      )}
      {state.authError != null && (
        <View>
          <Text className="pt-3 text-sm text-text-error">{state.authError}</Text>
          <FoodAiSignIn />
        </View>
      )}
      {state.note != null && <Text className="pt-3 text-sm text-text-secondary">{state.note}</Text>}
      {FoodAiEstimate_hasChoices(state) && (
        <View className="mt-2">
          <FoodChoicesReview
            choices={state.choices as IFoodPhotoChoice[]}
            onChange={(choices) => dispatch({ type: "choicesChanged", choices })}
            onAdd={(choices) => {
              props.onAdd(choices, state.photo, state.text);
              dispatch({ type: "added" });
            }}
          />
        </View>
      )}
    </View>
  );
}
