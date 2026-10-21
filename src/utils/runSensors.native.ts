import { IRunPoint } from "../models/runTrack";

export function RunSensors_isAvailable(): boolean {
  return false;
}

export function RunSensors_watch(_onPoint: (point: IRunPoint) => void, _onError: (code: number) => void): () => void {
  return () => {};
}

export function RunSensors_keepScreenOn(_onChange?: (active: boolean) => void): () => void {
  return () => {};
}
