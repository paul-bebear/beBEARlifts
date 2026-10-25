import { IRunPoint } from "../models/runTrack";
import { IRunPermission, IRunSensorPlatform } from "../models/runRecording";

export const RunSensors_platform: IRunSensorPlatform = "android";

export function RunSensors_isAvailable(): boolean {
  return false;
}

export async function RunSensors_requestPermission(): Promise<IRunPermission> {
  return "denied";
}

export function RunSensors_watch(_onPoint: (point: IRunPoint) => void, _onError: (code: number) => void): () => void {
  return () => {};
}

export function RunSensors_keepScreenOn(_onChange?: (active: boolean) => void): () => void {
  return () => {};
}
