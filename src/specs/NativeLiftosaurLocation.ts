/* eslint-disable @typescript-eslint/naming-convention */
import type { TurboModule } from "react-native";
import type { EventEmitter } from "react-native/Libraries/Types/CodegenTypes";
import { TurboModuleRegistry } from "react-native";

export type LiftosaurLocationPoint = {
  t: number;
  lat: number;
  lon: number;
  acc: number;
  alt?: number;
};

export type LiftosaurLocationError = {
  code: number;
};

export interface Spec extends TurboModule {
  requestPermission(): Promise<string>;
  startUpdates(): void;
  stopUpdates(): void;

  readonly onLocation: EventEmitter<LiftosaurLocationPoint>;
  readonly onLocationError: EventEmitter<LiftosaurLocationError>;
}

export default TurboModuleRegistry.get<Spec>("LiftosaurLocation");
