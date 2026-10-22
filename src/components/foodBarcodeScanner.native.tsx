import { JSX, useCallback, useEffect, useRef, useState } from "react";
import { Linking, Pressable, View } from "react-native";
import {
  Camera,
  isScannedCode,
  ScannedObject,
  ScannedObjectType,
  useCameraPermission,
  useObjectOutput,
} from "react-native-vision-camera";
import { OpenFoodFacts_firstBarcode } from "../models/openFoodFacts";
import { Text } from "./primitives/text";

interface IProps {
  onDetected: (code: string) => void;
}

// iOS reports UPC-A as EAN-13 with a leading zero, so there is no separate UPC-A type.
const barcodeTypes: ScannedObjectType[] = ["ean-13", "ean-8", "upc-e"];

export function FoodBarcodeScanner(props: IProps): JSX.Element {
  const permission = useCameraPermission();
  const [isDone, setIsDone] = useState(false);
  const isDoneRef = useRef(false);
  const onDetectedRef = useRef(props.onDetected);
  onDetectedRef.current = props.onDetected;

  useEffect(() => {
    if (permission.canRequestPermission) {
      permission.requestPermission();
    }
  }, [permission.canRequestPermission]);

  const onObjectsScanned = useCallback((objects: ScannedObject[]) => {
    const code = OpenFoodFacts_firstBarcode(
      objects.map((object) => (isScannedCode(object) ? object.value : undefined))
    );
    if (code != null && !isDoneRef.current) {
      isDoneRef.current = true;
      setIsDone(true);
      onDetectedRef.current(code);
    }
  }, []);
  const objectOutput = useObjectOutput({ types: barcodeTypes, onObjectsScanned });

  if (permission.status === "denied" || permission.status === "restricted") {
    return (
      <View testID="food-barcode-scanner" className="items-center py-6">
        <Text className="text-base text-center text-text-error">
          Camera access is off. Allow the camera for this app in Settings, then try again.
        </Text>
        <Pressable className="py-2 mt-2" testID="food-barcode-open-settings" onPress={() => Linking.openSettings()}>
          <Text className="text-base text-text-link">Open Settings</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View testID="food-barcode-scanner">
      <View className="overflow-hidden bg-black rounded-2xl" style={{ aspectRatio: 4 / 3 }}>
        {permission.hasPermission && (
          <Camera
            style={{ flex: 1 }}
            device="back"
            isActive={!isDone}
            outputs={[objectOutput]}
            resizeMode="cover"
            enableNativeTapToFocusGesture={true}
          />
        )}
        <View
          pointerEvents="none"
          className="absolute border-2 border-blue-400 rounded-xl"
          style={{ left: "12%", right: "12%", top: "35%", bottom: "35%" }}
        />
      </View>
      <Text className="mt-3 text-sm text-center text-text-secondary">
        Point the camera at the barcode. It scans by itself.
      </Text>
    </View>
  );
}
