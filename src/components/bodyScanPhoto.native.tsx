import { JSX, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { BodyScanRead_capture, IBodyScanRead } from "../models/bodyScanRead";
import { FoodCapture_options, FoodCapture_photo, IFoodCapturePhoto } from "../models/foodCapture";
import { AiConsent_ensure } from "../utils/aiConsentClient";
import { SupabaseClient_accessToken, Supabase_notSignedIn } from "../utils/supabaseClient";
import { FoodApi_readBodyScan } from "../utils/foodApi";
import { Dialog_choice } from "../utils/dialog";
import { ImagePicker_ensureCameraPermission } from "../utils/imagePicker.native";

interface IProps {
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onRead: (scan: IBodyScanRead) => void;
}

async function pick(): Promise<IFoodCapturePhoto> {
  const source = await Dialog_choice("Scan the printout", "Keep the whole printout in view.", [
    "Take photo",
    "Choose photo",
  ]);
  if (source == null) {
    return { kind: "cancelled" };
  }
  if (source === 0 && !(await ImagePicker_ensureCameraPermission())) {
    return { kind: "error", error: "Allow camera access in your phone's Settings, then try again." };
  }
  const response = await (source === 0 ? launchCamera : launchImageLibrary)(FoodCapture_options("label"));
  return FoodCapture_photo(response);
}

export function BodyScanPhoto(props: IProps): JSX.Element {
  const [error, setError] = useState<string | undefined>();
  return (
    <View className="mb-4" testID="body-scan-photo" data-testid="body-scan-photo">
      <Button
        name="body-scan-photo-pick"
        kind="pill-outline"
        disabled={props.busy}
        onPress={async () => {
          props.onBusyChange(true);
          setError(undefined);
          const result = await BodyScanRead_capture({
            authenticate: SupabaseClient_accessToken,
            signedOutError: Supabase_notSignedIn,
            allow: AiConsent_ensure,
            pick,
            read: FoodApi_readBodyScan,
          });
          props.onBusyChange(false);
          setError(result.kind === "error" ? result.error : undefined);
          if (result.kind === "read") {
            props.onRead(result.value);
          }
        }}
      >
        Scan the printout
      </Button>
      {props.busy && (
        <View className="items-center py-3">
          <ActivityIndicator />
          <Text className="mt-2 text-sm text-text-secondary">Reading your printout…</Text>
        </View>
      )}
      {error != null && (
        <Text className="pt-3 text-sm text-text-error" accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
}
