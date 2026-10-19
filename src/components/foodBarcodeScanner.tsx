import { JSX, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";

interface IProps {
  onDetected: (code: string) => void;
}

function cameraErrorMessage(e: unknown): string {
  const name = (e as { name?: string })?.name;
  if (name === "NotAllowedError") {
    return "Camera access is off. Allow the camera for this app in iOS Settings, then try again.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No camera found on this device.";
  }
  return "The camera could not start. Type the barcode in Search instead.";
}

export function FoodBarcodeScanner(props: IProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(props.onDetected);
  onDetectedRef.current = props.onDetected;
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let isCancelled = false;
    let stop: (() => void) | undefined;
    (async () => {
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
        ]);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 });
        if (isCancelled || videoRef.current == null) {
          return;
        }
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } },
          videoRef.current,
          (result) => {
            if (result != null && !isCancelled) {
              isCancelled = true;
              controls.stop();
              onDetectedRef.current(result.getText());
            }
          }
        );
        stop = () => controls.stop();
        if (isCancelled) {
          stop();
        }
      } catch (e) {
        if (!isCancelled) {
          setError(cameraErrorMessage(e));
        }
      }
    })();
    return () => {
      isCancelled = true;
      stop?.();
    };
  }, []);

  return (
    <View testID="food-barcode-scanner" data-testid="food-barcode-scanner">
      {error != null ? (
        <Text className="py-6 text-base text-center text-text-error">{error}</Text>
      ) : (
        <View className="overflow-hidden bg-black rounded-2xl" style={{ aspectRatio: 4 / 3 }}>
          <video
            ref={videoRef}
            playsInline={true}
            muted={true}
            autoPlay={true}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <View
            pointerEvents="none"
            className="absolute border-2 border-blue-400 rounded-xl"
            style={{ left: "12%", right: "12%", top: "35%", bottom: "35%" }}
          />
        </View>
      )}
      <Text className="mt-3 text-sm text-center text-text-secondary">
        Point the camera at the barcode. It scans by itself.
      </Text>
    </View>
  );
}
