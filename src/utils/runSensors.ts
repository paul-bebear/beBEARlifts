import { IRunPoint } from "../models/runTrack";
import { IRunPermission, IRunSensorPlatform } from "../models/runRecording";

export const RunSensors_platform: IRunSensorPlatform = "web";

export function RunSensors_isAvailable(): boolean {
  return typeof navigator !== "undefined" && navigator.geolocation != null;
}

export async function RunSensors_requestPermission(): Promise<IRunPermission> {
  return "granted";
}

export function RunSensors_watch(onPoint: (point: IRunPoint) => void, onError: (code: number) => void): () => void {
  if (!RunSensors_isAvailable()) {
    onError(2);
    return () => {};
  }
  let active = true;
  const id = navigator.geolocation.watchPosition(
    (position) => {
      if (active) {
        onPoint({
          t: position.timestamp,
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          acc: position.coords.accuracy,
          ...(position.coords.altitude != null ? { alt: position.coords.altitude } : {}),
        });
      }
    },
    (error) => {
      if (active) {
        onError(error.code);
      }
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
  );
  return () => {
    active = false;
    navigator.geolocation.clearWatch(id);
  };
}

export function RunSensors_keepScreenOn(onChange?: (active: boolean) => void): () => void {
  if (typeof navigator === "undefined" || !("wakeLock" in navigator) || typeof document === "undefined") {
    onChange?.(false);
    return () => {};
  }
  let disposed = false;
  let pending = false;
  let lock: WakeLockSentinel | undefined;
  const request = async (): Promise<void> => {
    if (disposed || pending || document.visibilityState !== "visible" || (lock != null && !lock.released)) {
      return;
    }
    pending = true;
    try {
      const acquired = await navigator.wakeLock.request("screen");
      if (disposed) {
        await acquired.release();
      } else {
        lock = acquired;
        acquired.addEventListener("release", () => onChange?.(false));
        onChange?.(true);
      }
    } catch {
      onChange?.(false);
    } finally {
      pending = false;
    }
  };
  document.addEventListener("visibilitychange", request);
  request();
  return () => {
    disposed = true;
    document.removeEventListener("visibilitychange", request);
    lock?.release().catch(() => undefined);
  };
}
