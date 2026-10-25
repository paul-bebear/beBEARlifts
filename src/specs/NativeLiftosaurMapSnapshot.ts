/* eslint-disable @typescript-eslint/naming-convention */
import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

export type LiftosaurMapSnapshotRequest = {
  lats: ReadonlyArray<number>;
  lons: ReadonlyArray<number>;
  width: number;
  height: number;
  padding: number;
};

export type LiftosaurMapSnapshotResult = {
  uri: string;
  xs: ReadonlyArray<number>;
  ys: ReadonlyArray<number>;
};

export interface Spec extends TurboModule {
  render(request: LiftosaurMapSnapshotRequest): Promise<LiftosaurMapSnapshotResult>;
}

export default TurboModuleRegistry.get<Spec>("LiftosaurMapSnapshot");
