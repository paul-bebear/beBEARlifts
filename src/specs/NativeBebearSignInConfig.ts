import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface Spec extends TurboModule {
  getConstants(): { googleIosClientId: string; urlSchemes: string[]; receiptName: string };
}

export default TurboModuleRegistry.get<Spec>("BebearSignInConfig");
