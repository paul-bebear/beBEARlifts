import { IEnv, IState } from "../models/state";
import { IDispatch, IThunk } from "./types";
import { Thunk_importStorage } from "./thunks";
import {
  CloudBackup_isAutoDue,
  CloudBackup_isCatchUpDue,
  CloudBackup_ownerAnswer,
  CloudBackup_ownerCheck,
  CloudBackup_storesMark,
  CloudBackup_workoutsMark,
  ICloudCopy,
  ICloudRestoreOffer,
  ICloudStoresInput,
} from "../models/cloudBackup";
import {
  CloudBackupCompare_decide,
  CloudBackupCompare_holdings,
  CloudBackupCompare_keepText,
  CloudBackupCompare_read,
  CloudBackupCompare_restoreText,
  CloudBackupCompare_when,
  ICloudBackupHoldings,
} from "../models/cloudBackupCompare";
import {
  CloudBackupClient_download,
  CloudBackupClient_saveReplaced,
  CloudBackupClient_upload,
} from "../utils/cloudBackupClient";
import { CloudStore, ICloudResult } from "../utils/supabaseClient";
import { FullBackupFile_build, FullBackupFile_stores } from "../utils/fullBackupFile";
import { FoodLogStore_load } from "../utils/foodLogStore";
import { NotesStore } from "../utils/notesStore";
import { RunStore } from "../utils/runStore";
import { BodyScanStore_load } from "../utils/bodyScanStore";
import { ChecklistStore } from "../utils/checklistStore";
import { ProgressPhotoStore } from "../utils/progressPhotoStore";
import { ProgressPhotoCloud_restore, ProgressPhotoCloud_sync } from "../utils/progressPhotoCloud";
import { FeedClient_flush } from "../utils/feedClient";
import { BackupReminderMarks_recordBackup } from "../utils/backupReminderMarks";
import { Dialog_alert, Dialog_confirm } from "../utils/dialog";

// auto runs after a workout and skips when nothing changed. manual is "Back up now". keep is "Keep this phone's data".
export type ICloudBackupMode = "auto" | "manual" | "keep";

export const CloudBackup_offerPendingError =
  "The cloud backup changed since this phone's last backup. Choose Restore or Keep first.";

export const CloudBackup_ownerDeclinedError = "Nothing was uploaded. This phone's data stays off that account.";

let lastCatchUpAt: number | undefined;
let ownerQuestion: Promise<boolean> | undefined;

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function storesNow(): Promise<ICloudStoresInput> {
  const [food, notes, runs, body, checklist, photos] = await Promise.all([
    FoodLogStore_load(),
    NotesStore.load(),
    RunStore.load(),
    BodyScanStore_load(),
    ChecklistStore.load(),
    ProgressPhotoStore.load(),
  ]);
  return FullBackupFile_stores({ food, notes, runs, body, checklist, photos });
}

// The finish screen and a return to the app can both reach this at once, and the user should see one question.
async function askOwner(question: string): Promise<boolean> {
  if (ownerQuestion == null) {
    ownerQuestion = Dialog_confirm(question).finally(() => {
      ownerQuestion = undefined;
    });
  }
  return ownerQuestion;
}

async function ownerAllows(mode: ICloudBackupMode): Promise<ICloudResult<boolean>> {
  const check = CloudBackup_ownerCheck(await CloudStore.load(), mode !== "auto");
  if (check.kind === "upload") {
    return { ok: true, value: true };
  }
  if (check.kind === "skip") {
    return { ok: true, value: false };
  }
  const yes = await askOwner(check.question);
  await CloudStore.update((state) => CloudBackup_ownerAnswer(state, yes));
  return yes ? { ok: true, value: true } : { ok: false, error: CloudBackup_ownerDeclinedError };
}

async function phoneHoldings(getState: () => IState): Promise<ICloudBackupHoldings> {
  const food = await FoodLogStore_load();
  return CloudBackupCompare_holdings(getState().storage.history, food.entries);
}

// Ok with undefined when the cloud holds nothing this phone lacks. Otherwise the offer is stored for the banner.
async function offerFromCloud(getState: () => IState): Promise<ICloudResult<ICloudRestoreOffer | undefined>> {
  const remote = await CloudBackupClient_download();
  if (!remote.ok) {
    return remote;
  }
  const cloud = remote.value != null ? CloudBackupCompare_read(remote.value) : undefined;
  const synced = (await CloudStore.load()).syncedExportedAt;
  const decision = CloudBackupCompare_decide(cloud, await phoneHoldings(getState), synced);
  if (decision.kind === "upload") {
    return { ok: true, value: undefined };
  }
  await CloudStore.update((state) => ({ ...state, restoreOffer: decision.offer }));
  return { ok: true, value: decision.offer };
}

async function backUp(mode: ICloudBackupMode, getState: () => IState): Promise<ICloudResult<number | undefined>> {
  if (
    mode === "auto" &&
    !CloudBackup_isAutoDue(await CloudStore.load(), getState().storage.history, await storesNow())
  ) {
    return { ok: true, value: undefined };
  }
  const allowed = await ownerAllows(mode);
  if (!allowed.ok || !allowed.value) {
    return allowed.ok ? { ok: true, value: undefined } : allowed;
  }
  if (mode === "keep") {
    const remote = await CloudBackupClient_download();
    if (!remote.ok) {
      return remote;
    }
    if (remote.value != null) {
      const saved = await CloudBackupClient_saveReplaced(remote.value);
      if (!saved.ok) {
        return saved;
      }
    }
  } else {
    const offer = await offerFromCloud(getState);
    if (!offer.ok) {
      return offer;
    }
    if (offer.value != null) {
      return { ok: false, error: CloudBackup_offerPendingError };
    }
  }
  const { text, now, stores } = await FullBackupFile_build(() => getState().storage);
  const result = await CloudBackupClient_upload(text, {
    exportedAt: new Date(now).toISOString(),
    workouts: CloudBackup_workoutsMark(getState().storage.history),
    stores: CloudBackup_storesMark(stores),
  });
  if (result.ok) {
    BackupReminderMarks_recordBackup(result.value);
  }
  return result;
}

export function Thunk_cloudBackup(
  mode: ICloudBackupMode,
  onResult?: (result: ICloudResult<number | undefined>) => void
): IThunk {
  return async (dispatch, getState) => {
    let result: ICloudResult<number | undefined>;
    try {
      result = await backUp(mode, getState);
    } catch (error) {
      result = { ok: false, error: errorText(error, "Could not save cloud backup") };
    }
    if (result.ok) {
      await ProgressPhotoCloud_sync().catch(() => undefined);
    }
    if (onResult != null) {
      onResult(result);
    } else if (mode !== "auto" && !result.ok) {
      Dialog_alert(result.error);
    }
  };
}

// Runs after sign-in, so a phone with no workouts still learns that a backup is waiting.
export function Thunk_cloudCheck(): IThunk {
  return async (dispatch, getState) => {
    try {
      await offerFromCloud(getState);
    } catch {
      // The next automatic backup runs the same check before it uploads.
    }
  };
}

export function Thunk_cloudKeepPhone(onResult?: (result: ICloudResult<boolean>) => void): IThunk {
  return async (dispatch, getState, env) => {
    const offer = (await CloudStore.load()).restoreOffer;
    const text =
      offer != null
        ? CloudBackupCompare_keepText(offer, CloudBackupCompare_when(offer.cloud.exportedAt))
        : "Replace the cloud backup with this phone's data?";
    if (!(await Dialog_confirm(text))) {
      onResult?.({ ok: true, value: false });
      return;
    }
    await Thunk_cloudBackup("keep", (result) => onResult?.(result.ok ? { ok: true, value: true } : result))(
      dispatch,
      getState,
      env
    );
  };
}

async function restore(
  copy: ICloudCopy,
  dispatch: IDispatch,
  getState: () => IState,
  env: IEnv
): Promise<ICloudResult<boolean>> {
  const remote = await CloudBackupClient_download(copy);
  if (!remote.ok) {
    return remote;
  }
  if (remote.value == null) {
    return { ok: false, error: copy === "latest" ? "No cloud backup yet" : "No copy saved there yet" };
  }
  const cloud = CloudBackupCompare_read(remote.value);
  if (cloud == null) {
    return { ok: false, error: "The cloud copy could not be read" };
  }
  const phone = await phoneHoldings(getState);
  const when = CloudBackupCompare_when(cloud.summary.exportedAt);
  if (!(await Dialog_confirm(CloudBackupCompare_restoreText(cloud.summary, phone.summary, when)))) {
    return { ok: true, value: false };
  }
  let imported = false;
  await Thunk_importStorage(remote.value, (success) => {
    imported = success;
  })(dispatch, getState, env);
  if (!imported) {
    return { ok: true, value: false };
  }
  // The phone now holds this account's data, so the next upload asks nothing.
  await CloudStore.update((state) => CloudBackup_ownerAnswer(state, true));
  await ProgressPhotoCloud_restore(cloud.photos ?? []).catch(() => undefined);
  if (copy !== "latest") {
    // An older copy becomes the cloud backup too, and keep saves the replaced latest.json first.
    const kept = await backUp("keep", getState);
    return kept.ok ? { ok: true, value: true } : kept;
  }
  const stores = CloudBackup_storesMark(await storesNow());
  await CloudStore.update((state) => ({
    ...state,
    lastBackupAt: Date.now(),
    syncedExportedAt: cloud.summary.exportedAt,
    backedUpWorkouts: CloudBackup_workoutsMark(getState().storage.history),
    backedUpStores: stores,
    restoreOffer: undefined,
  }));
  return { ok: true, value: true };
}

export function Thunk_cloudRestore(
  copy: ICloudCopy = "latest",
  onResult?: (result: ICloudResult<boolean>) => void
): IThunk {
  return async (dispatch, getState, env) => {
    let result: ICloudResult<boolean>;
    try {
      result = await restore(copy, dispatch, getState, env);
    } catch (error) {
      result = { ok: false, error: errorText(error, "Could not restore cloud backup") };
    }
    if (onResult != null) {
      onResult(result);
    } else if (!result.ok) {
      Dialog_alert(result.error);
    }
  };
}

// iOS can suspend the app before the finish screen's upload ends, so the launch and each return to the app retry.
export function Thunk_cloudCatchUp(): IThunk {
  return async (dispatch, getState, env) => {
    const now = Date.now();
    if (!CloudBackup_isCatchUpDue(lastCatchUpAt, now)) {
      return;
    }
    lastCatchUpAt = now;
    await Promise.all([Thunk_cloudBackup("auto")(dispatch, getState, env), FeedClient_flush().catch(() => undefined)]);
  };
}
