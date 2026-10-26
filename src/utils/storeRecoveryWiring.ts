import { IDispatch } from "../ducks/types";
import { Thunk_cloudRestore } from "../ducks/cloudBackupThunks";
import { JsonStore_setRecovery } from "./jsonStore";
import { CloudStore } from "./supabaseClient";

export function StoreRecoveryWiring_start(dispatch: IDispatch): () => void {
  JsonStore_setRecovery({
    isSignedIn: async () => (await CloudStore.load()).session != null,
    restoreFromCloud: () => dispatch(Thunk_cloudRestore("latest")),
  });
  return () => JsonStore_setRecovery(undefined);
}
