import { JSX, useReducer } from "react";
import { View, ActivityIndicator, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { IFoodPhotoChoice } from "../models/foodAddFlow";
import {
  FoodDescribeEstimate_canSend,
  FoodDescribeEstimate_hasChoices,
  FoodDescribeEstimate_initial,
  FoodDescribeEstimate_reduce,
} from "../models/foodDescribeEstimate";
import { FoodApi_describe } from "../utils/foodApi";
import { FoodTextInput } from "./foodUi";
import { FoodChoicesReview } from "./foodChoicesReview";
import { CloudStore, SupabaseClient_accessToken } from "../utils/supabaseClient";
import { AiConsent_disabledMessage, AiConsent_ensure } from "../utils/aiConsentClient";
import { FoodAiSignIn } from "./foodPhotoPanel";
import { IconCamera } from "./icons/iconCamera";
import { Tailwind_semantic } from "../utils/tailwindConfig";

interface IProps {
  onAdd: (choices: IFoodPhotoChoice[]) => void;
  onCamera: () => void;
  onPhoto: () => void;
}

export function FoodDescribePanel(props: IProps): JSX.Element {
  const session = CloudStore.use().session;
  const [state, dispatch] = useReducer(FoodDescribeEstimate_reduce, undefined, FoodDescribeEstimate_initial);
  const canSend = FoodDescribeEstimate_canSend(state);

  const send = async (): Promise<void> => {
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
    const result = await FoodApi_describe(state.text);
    dispatch(result.ok ? { type: "estimated", estimate: result.value } : { type: "failed", error: result.error });
  };

  if (session == null) {
    return <FoodAiSignIn />;
  }

  return (
    <View testID="food-describe-panel" data-testid="food-describe-panel">
      <View className="flex-row items-end px-3 py-2 border rounded-2xl bg-form-inputbg border-form-inputstroke">
        <FoodTextInput
          testID="food-describe-input"
          className="flex-1 px-0 py-1 border-0 bg-transparent"
          value={state.text}
          onChangeText={(text) => dispatch({ type: "typed", text })}
          placeholder="What did you eat?"
          multiline={true}
          style={{ minHeight: 40, maxHeight: 120 }}
        />
        <Pressable className="p-2" hitSlop={6} testID="food-describe-camera" onPress={props.onCamera}>
          <IconCamera size={22} color={Tailwind_semantic().icon.blue} />
        </Pressable>
        <Pressable
          className="px-4 py-2 ml-1 bg-blue-400 rounded-full"
          testID="food-describe-submit"
          data-testid="food-describe-submit"
          disabled={!canSend}
          style={{ opacity: canSend ? 1 : 0.4 }}
          onPress={send}
        >
          <Text className="text-sm font-semibold text-black">Send</Text>
        </Pressable>
      </View>
      {state.isLoading && <ActivityIndicator className="py-4" />}
      {state.error != null && <Text className="pt-3 text-sm text-text-error">{state.error}</Text>}
      {state.authError != null && (
        <View>
          <Text className="pt-3 text-sm text-text-error">{state.authError}</Text>
          <FoodAiSignIn />
        </View>
      )}
      {state.note != null && <Text className="pt-3 text-sm text-text-secondary">{state.note}</Text>}
      {FoodDescribeEstimate_hasChoices(state) && (
        <View className="mt-2">
          <FoodChoicesReview
            choices={state.choices as IFoodPhotoChoice[]}
            onChange={(choices) => dispatch({ type: "choicesChanged", choices })}
            onAdd={(choices) => {
              props.onAdd(choices);
              dispatch({ type: "added" });
            }}
          />
        </View>
      )}
      {(state.choices != null || state.note != null) && (
        <Pressable className="py-3" testID="food-describe-photo" onPress={props.onPhoto}>
          <Text className="text-base text-text-link">Add a photo for a better guess</Text>
        </Pressable>
      )}
    </View>
  );
}
