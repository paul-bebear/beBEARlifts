import { JSX, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import {
  BodyScanRead_capture,
  BodyScanRead_permission,
  BodyScanRead_unreadable,
  IBodyScanRead,
} from "../models/bodyScanRead";
import { AiConsent_ensure } from "../utils/aiConsentClient";
import { SupabaseClient_accessToken, Supabase_notSignedIn } from "../utils/supabaseClient";
import { FoodApi_readBodyScan } from "../utils/foodApi";
import { ImageResize_toJpegDataUrl } from "../utils/imageResize";

interface IProps {
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onRead: (scan: IBodyScanRead) => void;
}

const permission = {
  authenticate: SupabaseClient_accessToken,
  signedOutError: Supabase_notSignedIn,
  allow: AiConsent_ensure,
};

export function BodyScanPhoto(props: IProps): JSX.Element {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | undefined>();

  const read = async (file: File): Promise<void> => {
    props.onBusyChange(true);
    setError(undefined);
    const result = await BodyScanRead_capture({
      ...permission,
      pick: async () => ({ kind: "photo", dataUrl: await ImageResize_toJpegDataUrl(file, 1600) }),
      read: FoodApi_readBodyScan,
    });
    props.onBusyChange(false);
    setError(result.kind === "error" ? result.error : undefined);
    if (result.kind === "read") {
      props.onRead(result.value);
    }
  };

  return (
    <View className="mb-4" testID="body-scan-photo" data-testid="body-scan-photo">
      <input
        ref={input}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        data-testid="body-scan-photo-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file != null) {
            read(file);
          }
        }}
      />
      <Button
        name="body-scan-photo-pick"
        kind="pill-outline"
        disabled={props.busy}
        onPress={async () => {
          props.onBusyChange(true);
          setError(undefined);
          try {
            const denied = await BodyScanRead_permission(permission);
            setError(denied?.kind === "error" ? denied.error : undefined);
            if (denied == null) {
              input.current?.click();
            }
          } catch {
            setError(BodyScanRead_unreadable);
          } finally {
            props.onBusyChange(false);
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
