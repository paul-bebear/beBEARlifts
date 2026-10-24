import type { EventSubscription } from "react-native";
import NativeLiftosaurLocation from "../specs/NativeLiftosaurLocation";
import { IRunPoint } from "../models/runTrack";
import { IRunPermission, IRunSensorPlatform } from "../models/runRecording";

const geolocationPositionUnavailable = 2;

export const RunSensors_platform: IRunSensorPlatform = "ios";

// Null on a binary built before the module existed, which an over-the-air JS bundle can reach.
export function RunSensors_isAvailable(): boolean {
  return NativeLiftosaurLocation != null;
}

export async function RunSensors_requestPermission(): Promise<IRunPermission> {
  const permission = await NativeLiftosaurLocation?.requestPermission();
  return permission === "granted" || permission === "approximate" ? permission : "denied";
}

export function RunSensors_watch(onPoint: (point: IRunPoint) => void, onError: (code: number) => void): () => void {
  const location = NativeLiftosaurLocation;
  if (location == null) {
    onError(geolocationPositionUnavailable);
    return () => {};
  }
  const subscriptions: EventSubscription[] = [
    location.onLocation((point) =>
      onPoint({
        t: point.t,
        lat: point.lat,
        lon: point.lon,
        acc: point.acc,
        ...(point.alt != null ? { alt: point.alt } : {}),
      })
    ),
    location.onLocationError((error) => onError(error.code)),
  ];
  location.startUpdates();
  return () => {
    location.stopUpdates();
    for (const subscription of subscriptions) {
      subscription.remove();
    }
  };
}

export function RunSensors_keepScreenOn(onChange?: (active: boolean) => void): () => void {
  onChange?.(false);
  return () => {};
}
