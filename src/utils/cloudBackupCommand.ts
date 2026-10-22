import {
  Thunk_cloudBackup,
  Thunk_cloudCheck,
  Thunk_cloudKeepPhone,
  Thunk_cloudRestore,
} from "../ducks/cloudBackupThunks";
import { IThunk } from "../ducks/types";
import {
  CloudBackupForm_parsePlan,
  IAccountPlan,
  ICloudBackupCommand,
  ICloudBackupEvent,
} from "../models/cloudBackupForm";
import {
  CloudBackupClient_deleteAccount,
  CloudBackupClient_sendCode,
  CloudBackupClient_signOut,
  CloudBackupClient_verify,
} from "./cloudBackupClient";
import { SentCodeStore, SupabaseClient_authed, SupabaseClient_json, SupabaseClient_readJson } from "./supabaseClient";

export async function CloudBackupCommand_loadPlan(): Promise<IAccountPlan | undefined> {
  const result = await SupabaseClient_authed("/rest/v1/account_plans?select=plan", { method: "GET" });
  return result.ok ? CloudBackupForm_parsePlan(await SupabaseClient_readJson(result.value.response)) : undefined;
}

export function CloudBackupCommand_run(command: ICloudBackupCommand, emit: (event: ICloudBackupEvent) => void): IThunk {
  return async (dispatch, getState, env) => {
    try {
      switch (command.operation) {
        case "sendCode": {
          const result = await CloudBackupClient_sendCode(command.email);
          if (result.ok) {
            await SentCodeStore.update(() => ({ email: command.email, sentAt: Date.now() })).catch(() => undefined);
          }
          emit(result.ok ? { type: "sent" } : { type: "failed", error: result.error });
          break;
        }
        case "verify": {
          const result = await CloudBackupClient_verify(command.email, command.code);
          if (result.ok) {
            await SentCodeStore.update(() => ({})).catch(() => undefined);
            await Thunk_cloudCheck()(dispatch, getState, env);
          }
          emit(result.ok ? { type: "verified" } : { type: "failed", error: result.error });
          break;
        }
        case "backup":
          await Thunk_cloudBackup("manual", (result) =>
            emit(result.ok ? { type: "done", message: "Backup saved." } : { type: "failed", error: result.error })
          )(dispatch, getState, env);
          break;
        case "restore":
          await Thunk_cloudRestore(command.copy ?? "latest", (result) =>
            emit(result.ok ? { type: "done" } : { type: "failed", error: result.error })
          )(dispatch, getState, env);
          break;
        case "keepPhone":
          await Thunk_cloudKeepPhone((result) =>
            emit(
              result.ok
                ? { type: "done", message: result.value ? "Backup saved." : undefined }
                : { type: "failed", error: result.error }
            )
          )(dispatch, getState, env);
          break;
        case "signOut":
          await CloudBackupClient_signOut();
          emit({ type: "signedOut" });
          break;
        case "deleteAccount": {
          const result = await CloudBackupClient_deleteAccount();
          emit(result.ok ? { type: "deleted" } : { type: "failed", error: result.error });
          break;
        }
        case "redeem": {
          const result = await SupabaseClient_authed(
            "/rest/v1/rpc/redeem_pro_code",
            SupabaseClient_json({ p_code: command.proCode ?? "" })
          );
          emit(result.ok ? { type: "redeemed" } : { type: "failed", error: result.error });
          break;
        }
      }
    } catch (error) {
      emit({ type: "failed", error: error instanceof Error ? error.message : "Cloud backup failed" });
    }
  };
}
