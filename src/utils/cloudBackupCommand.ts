import { Thunk_cloudBackup, Thunk_cloudRestore } from "../ducks/thunks";
import { IThunk } from "../ducks/types";
import { ICloudBackupCommand, ICloudBackupEvent } from "../models/cloudBackupForm";
import {
  CloudBackupClient_download,
  CloudBackupClient_sendCode,
  CloudBackupClient_signOut,
  CloudBackupClient_verify,
} from "./cloudBackupClient";

export function CloudBackupCommand_run(command: ICloudBackupCommand, emit: (event: ICloudBackupEvent) => void): IThunk {
  return async (dispatch, getState, env) => {
    try {
      switch (command.operation) {
        case "sendCode": {
          const result = await CloudBackupClient_sendCode(command.email);
          emit(result.ok ? { type: "sent" } : { type: "failed", error: result.error });
          break;
        }
        case "verify": {
          const result = await CloudBackupClient_verify(command.email, command.code);
          emit(
            result.ok
              ? { type: "verified", hasHistory: getState().storage.history.length > 0 }
              : { type: "failed", error: result.error }
          );
          break;
        }
        case "findBackup": {
          const result = await CloudBackupClient_download();
          emit(result.ok ? { type: "found", exists: result.value != null } : { type: "failed", error: result.error });
          break;
        }
        case "backup":
          await Thunk_cloudBackup(true, (result) =>
            emit(result.ok ? { type: "done", message: "Backup saved." } : { type: "failed", error: result.error })
          )(dispatch, getState, env);
          break;
        case "restore":
          await Thunk_cloudRestore((result) =>
            emit(result.ok ? { type: "done" } : { type: "failed", error: result.error })
          )(dispatch, getState, env);
          break;
        case "signOut":
          await CloudBackupClient_signOut();
          emit({ type: "signedOut" });
          break;
      }
    } catch (error) {
      emit({ type: "failed", error: error instanceof Error ? error.message : "Cloud backup failed" });
    }
  };
}
