import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import {
  CloudBackup_offerPendingError,
  Thunk_cloudBackup,
  Thunk_cloudCatchUp,
  Thunk_cloudKeepPhone,
  Thunk_cloudRestore,
} from "../src/ducks/cloudBackupThunks";
import { Thunk_exportEverything, Thunk_maybeRemindBackup } from "../src/ducks/thunks";
import { IDispatch, IThunk } from "../src/ducks/types";
import { IEnv, IState } from "../src/models/state";
import { Storage_getDefault } from "../src/models/storage";
import { IHistoryRecord, IStorage } from "../src/types";
import { FoodLog_empty } from "../src/models/foodLog";
import { MusicLog_empty } from "../src/models/musicLog";
import { BodyScans_empty } from "../src/models/bodyScans";
import { WarmupPlan_empty } from "../src/models/warmupPlan";
import { WorkoutReport_empty } from "../src/models/workoutReport";
import { FullBackup_build, IFullBackupParts } from "../src/models/fullBackup";
import {
  CloudBackup_storesMark,
  CloudBackup_workoutsMark,
  ICloudState,
  ICloudStoresInput,
} from "../src/models/cloudBackup";
import * as cloud from "../src/utils/cloudBackupClient";
import * as supabase from "../src/utils/supabaseClient";
import * as food from "../src/utils/foodLogStore";
import * as music from "../src/utils/musicStore";
import * as body from "../src/utils/bodyScanStore";
import * as warmups from "../src/utils/warmupStore";
import * as feed from "../src/utils/feedClient";
import * as reminderMarks from "../src/utils/backupReminderMarks";
import { ReportStore } from "../src/utils/reportStore";
import * as dialogs from "../src/utils/dialog";
import * as exporter from "../src/utils/exporter";
import { CloudBackupCommand_run } from "../src/utils/cloudBackupCommand";
import { ICloudBackupEvent } from "../src/models/cloudBackupForm";
import { SetClips_empty, SetClips_parse } from "../src/models/setClips";
import { SetClipStore } from "../src/utils/setClipStore";
import { RunLog_empty } from "../src/models/runLog";
import { RunStore } from "../src/utils/runStore";
import { ProgramGoal_empty, ProgramGoal_set } from "../src/models/programGoal";
import { ProgramGoalStore } from "../src/utils/programGoalStore";
import { Steps_empty, Steps_setManual } from "../src/models/steps";
import { StepsStore } from "../src/utils/stepsStore";
import { DailyChecklist_empty, DailyChecklist_toggleCheckIn } from "../src/models/dailyChecklist";
import { ChecklistStore } from "../src/utils/checklistStore";
import { BearStore } from "../src/utils/bearStore";
import { BearStoreData_empty, IBearStoreData } from "../src/models/bearStoreData";
import { NotesStore } from "../src/utils/notesStore";
import { INotesLog, Notes_empty, Notes_new, Notes_save } from "../src/models/notes";
import { FullBackupFile_restore } from "../src/utils/fullBackupFile";
import { WeekScheduleStore } from "../src/utils/weekScheduleStore";
import { IWeekScheduleLog, WeekSchedule_empty, WeekSchedule_save } from "../src/models/weekSchedule";
import { IProgressPhotoLog, ProgressPhotos_empty } from "../src/models/progressPhotos";
import { ProgressPhotoStore } from "../src/utils/progressPhotoStore";
import * as photoCloud from "../src/utils/progressPhotoCloud";

const now = Date.UTC(2026, 9, 20, 18);
const session = {
  email: "paul@example.com",
  userId: "u1",
  accessToken: "secret-access",
  refreshToken: "secret-refresh",
  expiresAt: now + 3600000,
};

const none: ICloudStoresInput = { food: [], notes: [], runs: [], scans: [], checkIns: [], photos: [] };

function workouts(ids: number[]): IHistoryRecord[] {
  return ids.map(
    (id): IHistoryRecord => ({
      vtype: "history_record",
      id,
      date: new Date(id).toISOString(),
      programId: "p",
      programName: "Program",
      day: 1,
      dayName: "Day 1",
      startTime: id,
      endTime: id + 1,
      entries: [],
    })
  );
}

function emptyParts(storage: IStorage): IFullBackupParts {
  return {
    storage,
    food: FoodLog_empty(),
    music: MusicLog_empty(),
    body: BodyScans_empty(),
    warmups: WarmupPlan_empty(),
    reports: WorkoutReport_empty(),
    clips: SetClips_empty(),
    runs: RunLog_empty(),
    goal: ProgramGoal_empty(),
    steps: Steps_empty(),
    checklist: DailyChecklist_empty(),
  };
}

function cloudFile(ids: number[], exportedAt: number = now - 86400000): string {
  return JSON.stringify(FullBackup_build(emptyParts({ ...Storage_getDefault(), history: workouts(ids) }), exportedAt));
}

describe("Cloud backup thunks", () => {
  let state: IState;
  let cloudState: ICloudState;
  let upload: sinon.SinonStub;
  let download: sinon.SinonStub;
  let saveReplaced: sinon.SinonStub;
  let confirm: sinon.SinonStub;
  let dispatch: sinon.SinonStub;
  let bear: IBearStoreData;
  let notes: INotesLog;
  let schedule: IWeekScheduleLog;
  let photos: IProgressPhotoLog;
  let photoSync: sinon.SinonStub;
  let photoRestore: sinon.SinonStub;

  function scheduled(programId: string): IWeekScheduleLog {
    return WeekSchedule_save(WeekSchedule_empty(), programId, [0, 1, null, 2, 3, 4, null]);
  }

  function noted(title: string): INotesLog {
    return Notes_save(Notes_empty(), { ...Notes_new(title, "2026-10-19", now), title }, now);
  }

  async function run(thunk: IThunk): Promise<void> {
    await thunk(dispatch as IDispatch, () => state, {} as IEnv);
  }

  beforeEach(() => {
    state = { storage: Storage_getDefault() } as IState;
    cloudState = { version: 1, session };
    dispatch = sinon.stub();
    sinon.stub(Date, "now").returns(now);
    sinon.stub(supabase.CloudStore, "load").callsFake(async () => cloudState);
    sinon.stub(supabase.CloudStore, "update").callsFake(async (fn) => {
      cloudState = fn(cloudState);
    });
    upload = sinon.stub(cloud, "CloudBackupClient_upload").resolves({ ok: true, value: now });
    download = sinon.stub(cloud, "CloudBackupClient_download").resolves({ ok: true, value: undefined });
    saveReplaced = sinon.stub(cloud, "CloudBackupClient_saveReplaced").resolves({ ok: true, value: undefined });
    confirm = sinon.stub(dialogs, "Dialog_confirm").resolves(true);
    sinon.stub(dialogs, "Dialog_alert");
    sinon.stub(reminderMarks, "BackupReminderMarks_recordBackup");
    const foodLoad = sinon.stub(food, "FoodLogStore_load").resolves(FoodLog_empty());
    sinon.stub(food, "FoodLogStore_loadStrict").callsFake(() => foodLoad());
    const musicLog = {
      ...MusicLog_empty(),
      tokens: { accessToken: "spotify-access", refreshToken: "spotify-refresh", expiresAt: now },
    };
    sinon.stub(music, "MusicStore_load").resolves(musicLog);
    sinon.stub(music, "MusicStore_loadStrict").resolves(musicLog);
    for (const [store, load, strict] of [
      [body, "BodyScanStore_load", "BodyScanStore_loadStrict"],
      [warmups, "WarmupStore_load", "WarmupStore_loadStrict"],
    ] as const) {
      const value = store === body ? BodyScans_empty() : WarmupPlan_empty();
      sinon.stub(store, load as never).resolves(value);
      sinon.stub(store, strict as never).resolves(value);
    }
    const plain: Array<[{ load: () => Promise<unknown>; loadStrict: () => Promise<unknown> }, unknown]> = [
      [ReportStore, WorkoutReport_empty()],
      [SetClipStore, SetClips_empty()],
      [RunStore, RunLog_empty()],
      [ProgramGoalStore, ProgramGoal_empty()],
      [StepsStore, Steps_empty()],
      [ChecklistStore, DailyChecklist_empty()],
    ];
    for (const [store, value] of plain) {
      const load = sinon.stub(store, "load").resolves(value);
      sinon.stub(store, "loadStrict").callsFake(() => load());
    }
    photos = ProgressPhotos_empty();
    sinon.stub(ProgressPhotoStore, "load").callsFake(async () => photos);
    sinon.stub(ProgressPhotoStore, "loadStrict").callsFake(async () => photos);
    photoSync = sinon.stub(photoCloud, "ProgressPhotoCloud_sync").resolves({ ok: true, value: undefined });
    photoRestore = sinon.stub(photoCloud, "ProgressPhotoCloud_restore").resolves({ ok: true, value: undefined });
    bear = BearStoreData_empty();
    sinon.stub(BearStore, "load").callsFake(async () => bear);
    sinon.stub(BearStore, "loadStrict").callsFake(async () => bear);
    sinon.stub(BearStore, "replace").callsFake(async (value) => {
      bear = value;
    });
    notes = Notes_empty();
    sinon.stub(NotesStore, "load").callsFake(async () => notes);
    sinon.stub(NotesStore, "loadStrict").callsFake(async () => notes);
    sinon.stub(NotesStore, "replace").callsFake(async (value) => {
      notes = value;
    });
    schedule = WeekSchedule_empty();
    sinon.stub(WeekScheduleStore, "load").callsFake(async () => schedule);
    sinon.stub(WeekScheduleStore, "loadStrict").callsFake(async () => schedule);
    sinon.stub(WeekScheduleStore, "replace").callsFake(async (value) => {
      schedule = value;
    });
  });

  function stubRestoreWrites(): void {
    sinon.stub(music, "MusicStore_update").resolves();
    sinon.stub(body, "BodyScanStore_replace").resolves();
    sinon.stub(warmups, "WarmupStore_replace").resolves();
  }
  afterEach(() => sinon.restore());

  it("keeps the cloud backup when a new phone finishes its first workout", async () => {
    state.storage.history = workouts([900]);
    download.resolves({ ok: true, value: cloudFile([1, 2, 3]) });
    await run(Thunk_cloudBackup("auto"));
    expect(upload.called).to.equal(false);
    expect(cloudState.restoreOffer?.cloud.workouts).to.equal(3);
    expect(cloudState.restoreOffer?.phone.workouts).to.equal(1);
    download.resetHistory();
    await run(Thunk_cloudBackup("auto"));
    expect(download.called).to.equal(false);
    expect(upload.called).to.equal(false);
  });

  it("uploads after a workout when this phone wrote the cloud file, and records the marks", async () => {
    state.storage.history = workouts([3, 2, 1]);
    const exportedAt = now - 86400000;
    cloudState = { version: 1, session, syncedExportedAt: new Date(exportedAt).toISOString() };
    download.resolves({ ok: true, value: cloudFile([4, 2, 1], exportedAt) });
    await run(Thunk_cloudBackup("auto"));
    expect(upload.callCount).to.equal(1);
    expect(upload.firstCall.args[1]).to.deep.equal({
      exportedAt: new Date(now).toISOString(),
      workouts: CloudBackup_workoutsMark(state.storage.history),
      stores: CloudBackup_storesMark(none),
    });
    expect((reminderMarks.BackupReminderMarks_recordBackup as sinon.SinonStub).calledWith(now)).to.equal(true);
  });

  it("skips automatic uploads with no workout, no session, or an already saved workout", async () => {
    await run(Thunk_cloudBackup("auto"));
    state.storage.history = workouts([now - 2000]);
    cloudState = { version: 1 };
    await run(Thunk_cloudBackup("auto"));
    cloudState = {
      version: 1,
      session,
      lastBackupAt: now,
      backedUpWorkouts: CloudBackup_workoutsMark(state.storage.history),
      backedUpStores: CloudBackup_storesMark(none),
    };
    await run(Thunk_cloudBackup("auto"));
    expect(download.called).to.equal(false);
    expect(upload.called).to.equal(false);
  });

  it("backs up a new note when no workout changed, then waits for the next change", async () => {
    state.storage.history = workouts([now - 2000]);
    cloudState = {
      version: 1,
      session,
      lastBackupAt: now,
      backedUpWorkouts: CloudBackup_workoutsMark(state.storage.history),
      backedUpStores: CloudBackup_storesMark(none),
    };
    notes = noted("Rest day walk");
    await run(Thunk_cloudBackup("auto"));
    expect(upload.callCount).to.equal(1);
    const mark = upload.firstCall.args[1].stores as string;
    expect(mark).to.not.equal(CloudBackup_storesMark(none));
    cloudState = { ...cloudState, backedUpStores: mark };
    await run(Thunk_cloudBackup("auto"));
    expect(upload.callCount).to.equal(1);
  });

  it("stops the backup with an error when a store cannot be read, and uploads nothing", async () => {
    (NotesStore.loadStrict as sinon.SinonStub).rejects(new Error("Could not read saved data"));
    const result = sinon.spy();
    await run(Thunk_cloudBackup("manual", result));
    expect(result.firstCall.args[0]).to.deep.equal({ ok: false, error: "Could not read saved data" });
    expect(upload.called).to.equal(false);
  });

  it("asks before replacing a cloud file another device wrote, even with nothing new in it", async () => {
    state.storage.history = workouts([3, 2, 1]);
    cloudState = { version: 1, session, syncedExportedAt: "2026-10-01T00:00:00.000Z" };
    download.resolves({ ok: true, value: cloudFile([3, 2, 1]) });
    await run(Thunk_cloudBackup("auto"));
    expect(upload.called).to.equal(false);
    expect(cloudState.restoreOffer?.otherDevice).to.equal(true);
  });

  it("asks before the first upload of this phone's data to a different account", async () => {
    state.storage.history = workouts([5]);
    cloudState = { version: 1, session, ownerUserId: "u0" };
    confirm.resolves(false);
    await run(Thunk_cloudBackup("auto"));
    expect(confirm.firstCall.args[0]).to.match(/^Upload this phone's data to paul@example\.com\?/);
    expect(upload.called).to.equal(false);
    expect(cloudState.uploadDeclinedFor).to.equal("u1");
    await run(Thunk_cloudBackup("auto"));
    expect(confirm.callCount).to.equal(1);

    confirm.resolves(true);
    await run(Thunk_cloudBackup("manual"));
    expect(confirm.callCount).to.equal(2);
    expect(upload.callCount).to.equal(1);
    expect(cloudState.ownerUserId).to.equal("u1");
    expect(photoSync.called).to.equal(true);
  });

  it("refuses a manual backup over cloud data this phone lacks", async () => {
    download.resolves({ ok: true, value: cloudFile([1]) });
    const result = sinon.spy();
    await run(Thunk_cloudBackup("manual", result));
    expect(result.firstCall.args[0]).to.deep.equal({ ok: false, error: CloudBackup_offerPendingError });
    expect(upload.called).to.equal(false);
  });

  it("saves the cloud copy before keeping this phone's data", async () => {
    const remote = cloudFile([1, 2, 3]);
    download.resolves({ ok: true, value: remote });
    cloudState = {
      ...cloudState,
      restoreOffer: { cloud: { workouts: 3, foodDays: 0 }, phone: { workouts: 1, foodDays: 0 } },
    };
    const result = sinon.spy();
    await run(Thunk_cloudKeepPhone(result));
    expect(confirm.firstCall.args[0]).to.include("Cloud backup: 3 workouts and 0 days of food.");
    expect(saveReplaced.firstCall.args[0]).to.equal(remote);
    expect(upload.calledAfter(saveReplaced)).to.equal(true);
    expect(result.firstCall.args[0]).to.deep.equal({ ok: true, value: true });
  });

  it("does not upload when saving the replaced copy fails", async () => {
    download.resolves({ ok: true, value: cloudFile([1]) });
    saveReplaced.resolves({ ok: false, error: "No connection" });
    const result = sinon.spy();
    await run(Thunk_cloudBackup("keep", result));
    expect(result.firstCall.args[0]).to.deep.equal({ ok: false, error: "No connection" });
    expect(upload.called).to.equal(false);
  });

  it("shares the full export builder and leaves both logins out of its JSON", async () => {
    bear = { line: "female", celebratedLevel: 8, seenBadges: ["level-8"], spent: 0 };
    notes = noted("Legs");
    schedule = scheduled("bebear-ulppl");
    const toFile = sinon.stub(exporter, "Exporter_toFile");
    await run(Thunk_exportEverything());
    await run(Thunk_cloudBackup("manual"));
    const text = upload.firstCall.args[0] as string;
    expect(text).to.equal(toFile.firstCall.args[1]);
    const backup = JSON.parse(text);
    expect(backup).to.have.keys(
      "format",
      "version",
      "exportedAt",
      "readme",
      "workouts",
      "food",
      "music",
      "body",
      "warmups",
      "reports",
      "clips",
      "runs",
      "goal",
      "steps",
      "checklist",
      "bear",
      "notes",
      "schedule",
      "photos",
      "journal"
    );
    expect(text).to.not.include("secret-refresh");
    expect(text).to.not.include("spotify-refresh");
    expect(text).to.not.include("bebear_cloud");
    expect(backup.bear).to.deep.equal(bear);
    expect(backup.notes).to.deep.equal(notes);
    expect(backup.schedule).to.deep.equal(schedule);
    expect(backup.journal["journal/2026-10-19.md"]).to.include("### Legs");
  });

  it("reports upload and local read errors to the settings caller", async () => {
    const result = sinon.spy();
    upload.resolves({ ok: false, error: "Quota exceeded" });
    await run(Thunk_cloudBackup("manual", result));
    expect(result.firstCall.args[0]).to.deep.equal({ ok: false, error: "Quota exceeded" });
    (food.FoodLogStore_load as sinon.SinonStub).rejects(new Error("Local read failed"));
    await run(Thunk_cloudBackup("manual", result));
    expect(result.secondCall.args[0]).to.deep.equal({ ok: false, error: "Local read failed" });
  });

  it("shows both sides before restoring and replaces nothing when cancelled", async () => {
    state.storage.history = workouts([900]);
    download.resolves({ ok: true, value: cloudFile([1, 2, 3]) });
    confirm.resolves(false);
    const result = sinon.spy();
    await run(Thunk_cloudRestore("latest", result));
    expect(confirm.firstCall.args[0]).to.include(
      "Cloud copy: 3 workouts and 0 days of food.\nThis phone: 1 workout and 0 days of food."
    );
    expect(dispatch.called).to.equal(false);
    expect(result.firstCall.args[0]).to.deep.equal({ ok: true, value: false });
  });

  it("reports missing backups, download failures and unreadable files without importing", async () => {
    const result = sinon.spy();
    await run(Thunk_cloudRestore("latest", result));
    expect(result.getCall(0).args[0]).to.deep.equal({ ok: false, error: "No cloud backup yet" });
    await run(Thunk_cloudRestore("day-1", result));
    expect(result.getCall(1).args[0]).to.deep.equal({ ok: false, error: "No copy saved there yet" });
    download.resolves({ ok: false, error: "No connection" });
    await run(Thunk_cloudRestore("latest", result));
    expect(result.getCall(2).args[0]).to.deep.equal({ ok: false, error: "No connection" });
    download.resolves({ ok: true, value: "{" });
    await run(Thunk_cloudRestore("latest", result));
    expect(result.getCall(3).args[0]).to.deep.equal({ ok: false, error: "The cloud copy could not be read" });
    expect(dispatch.called).to.equal(false);
  });

  it("restores every full-backup store while keeping this phone's logins", async () => {
    const parts = {
      ...emptyParts(state.storage),
      bear: { line: "female" as const, celebratedLevel: 9, seenBadges: ["level-9"], spent: 0 },
      notes: noted("Restored"),
      schedule: scheduled("restored-program"),
      goal: ProgramGoal_set(ProgramGoal_empty(), { kind: "maintain", activity: "5to10k", startedAt: now }),
      steps: Steps_setManual(Steps_empty(), "2026-10-20", 9000),
      checklist: DailyChecklist_toggleCheckIn(DailyChecklist_empty(), "2026-10-19"),
      clips: {
        version: 1 as const,
        clips: [
          {
            workoutId: now,
            setId: "set-1",
            exerciseId: "squat",
            timestamp: now,
            size: 1000,
            savedVia: "share" as const,
            thumbnail: "data:image/jpeg;base64,YWJj",
          },
        ],
      },
    };
    const file = FullBackup_build(parts, now - 1000);
    download.resolves({ ok: true, value: JSON.stringify(file) });
    cloudState = {
      ...cloudState,
      restoreOffer: { cloud: { workouts: 0, foodDays: 0 }, phone: { workouts: 0, foodDays: 0 } },
    };
    const replaceFood = sinon.stub(food, "FoodLogStore_replace").resolves();
    const replaceMusic = sinon.stub(music, "MusicStore_update").resolves();
    const replaceBody = sinon.stub(body, "BodyScanStore_replace").resolves();
    const replaceWarmups = sinon.stub(warmups, "WarmupStore_replace").resolves();
    const replaceReports = sinon.stub(ReportStore, "replace").resolves();
    const replaceClips = sinon.stub(SetClipStore, "replace").resolves();
    const replaceRuns = sinon.stub(RunStore, "replace").resolves();
    const replaceGoal = sinon.stub(ProgramGoalStore, "replace").resolves();
    const replaceSteps = sinon.stub(StepsStore, "replace").resolves();
    const replaceChecklist = sinon.stub(ChecklistStore, "replace").resolves();
    const result = sinon.spy();
    await run(Thunk_cloudRestore("latest", result));
    expect(result.firstCall.args[0]).to.deep.equal({ ok: true, value: true });
    expect(dispatch.calledWithMatch({ type: "UpdateState", desc: "Importing Storage" })).to.equal(true);
    expect(replaceFood.firstCall.args[0]).to.deep.equal(parts.food);
    const localMusic = {
      ...MusicLog_empty(),
      tokens: { accessToken: "local", refreshToken: "local-r", expiresAt: now },
    };
    expect(replaceMusic.firstCall.args[0](localMusic).tokens).to.equal(localMusic.tokens);
    expect(replaceBody.firstCall.args[0]).to.deep.equal(parts.body);
    expect(replaceWarmups.firstCall.args[0]).to.deep.equal(parts.warmups);
    expect(replaceReports.firstCall.args[0]).to.deep.equal(parts.reports);
    expect(replaceClips.firstCall.args[0]).to.deep.equal(SetClips_parse(parts.clips));
    expect(replaceRuns.firstCall.args[0]).to.deep.equal(parts.runs);
    expect(replaceGoal.firstCall.args[0]).to.deep.equal(parts.goal);
    expect(replaceSteps.firstCall.args[0]).to.deep.equal(parts.steps);
    expect(replaceChecklist.firstCall.args[0]).to.deep.equal(parts.checklist);
    expect(bear).to.deep.equal(parts.bear);
    expect(notes).to.deep.equal(parts.notes);
    expect(schedule).to.deep.equal(parts.schedule);
    expect(cloudState.syncedExportedAt).to.equal(file.exportedAt);
    expect(cloudState.restoreOffer).to.equal(undefined);
    expect(cloudState.session).to.deep.equal(session);
    expect(cloudState.ownerUserId).to.equal("u1");
    expect(photoRestore.firstCall.args[0]).to.deep.equal([]);
    expect(upload.called).to.equal(false);
  });

  it("puts the written stores back and keeps the workouts when one store fails", async () => {
    const parts = { ...emptyParts(state.storage), steps: Steps_setManual(Steps_empty(), "2026-10-20", 9000) };
    download.resolves({ ok: true, value: JSON.stringify(FullBackup_build(parts, now - 1000)) });
    const localFood = { ...FoodLog_empty(), goals: { calories: 1234, protein: 1, carbs: 1, fat: 1 } };
    (food.FoodLogStore_load as sinon.SinonStub).resolves(localFood);
    const replaceFood = sinon.stub(food, "FoodLogStore_replace").resolves();
    stubRestoreWrites();
    for (const store of [ReportStore, SetClipStore, RunStore, ProgramGoalStore]) {
      sinon.stub(store, "replace").resolves();
    }
    sinon.stub(StepsStore, "replace").rejects(new Error("QuotaExceededError"));
    const checklist = sinon.stub(ChecklistStore, "replace").resolves();
    const result = sinon.spy();
    await run(Thunk_cloudRestore("latest", result));
    expect(result.firstCall.args[0]).to.deep.equal({ ok: true, value: false });
    expect(replaceFood.lastCall.args[0]).to.equal(localFood);
    expect(checklist.called).to.equal(false);
    expect((BearStore.replace as sinon.SinonStub).called).to.equal(false);
    expect(dispatch.calledWithMatch({ type: "UpdateState" })).to.equal(false);
    expect((dialogs.Dialog_alert as sinon.SinonStub).lastCall.args[0]).to.include("Nothing on this phone was changed");
  });

  it("keeps the phone's bear when an older backup has no bear", async () => {
    bear = { line: "female", celebratedLevel: 7, seenBadges: ["level-7"], spent: 0 };
    const before = bear;
    await FullBackupFile_restore({ storage: state.storage });
    expect(bear).to.equal(before);
    expect((BearStore.replace as sinon.SinonStub).called).to.equal(false);
  });

  it("rolls back the earlier stores when saving the restored bear fails", async () => {
    bear = { line: "female", celebratedLevel: 2, seenBadges: ["level-2"], spent: 0 };
    const before = bear;
    const localFood = FoodLog_empty();
    (food.FoodLogStore_load as sinon.SinonStub).resolves(localFood);
    const replaceFood = sinon.stub(food, "FoodLogStore_replace").resolves();
    stubRestoreWrites();
    for (const store of [ReportStore, SetClipStore, RunStore, ProgramGoalStore, StepsStore, ChecklistStore]) {
      sinon.stub(store, "replace").resolves();
    }
    (BearStore.replace as sinon.SinonStub).rejects(new Error("QuotaExceededError"));
    const parts = {
      ...emptyParts(state.storage),
      bear: { line: "male" as const, celebratedLevel: 9, seenBadges: [], spent: 0 },
    };
    download.resolves({ ok: true, value: JSON.stringify(FullBackup_build(parts, now - 1000)) });
    const result = sinon.spy();
    await run(Thunk_cloudRestore("latest", result));
    expect(result.firstCall.args[0]).to.deep.equal({ ok: true, value: false });
    expect(replaceFood.callCount).to.equal(2);
    expect(replaceFood.lastCall.args[0]).to.equal(localFood);
    expect(bear).to.equal(before);
    expect(dispatch.calledWithMatch({ type: "UpdateState" })).to.equal(false);
  });

  it("keeps the phone's notes when an older backup has no notes", async () => {
    notes = noted("Phone");
    const before = notes;
    await FullBackupFile_restore({ storage: state.storage });
    expect(notes).to.equal(before);
    expect((NotesStore.replace as sinon.SinonStub).called).to.equal(false);
  });

  it("rolls back the bear and the earlier stores when saving the restored notes fails", async () => {
    bear = { line: "female", celebratedLevel: 2, seenBadges: ["level-2"], spent: 0 };
    const beforeBear = bear;
    notes = noted("Phone");
    const beforeNotes = notes;
    const localFood = FoodLog_empty();
    (food.FoodLogStore_load as sinon.SinonStub).resolves(localFood);
    const replaceFood = sinon.stub(food, "FoodLogStore_replace").resolves();
    stubRestoreWrites();
    for (const store of [ReportStore, SetClipStore, RunStore, ProgramGoalStore, StepsStore, ChecklistStore]) {
      sinon.stub(store, "replace").resolves();
    }
    (NotesStore.replace as sinon.SinonStub).rejects(new Error("QuotaExceededError"));
    const parts = {
      ...emptyParts(state.storage),
      bear: { line: "male" as const, celebratedLevel: 9, seenBadges: [], spent: 0 },
      notes: noted("Cloud"),
    };
    download.resolves({ ok: true, value: JSON.stringify(FullBackup_build(parts, now - 1000)) });
    const result = sinon.spy();
    await run(Thunk_cloudRestore("latest", result));
    expect(result.firstCall.args[0]).to.deep.equal({ ok: true, value: false });
    expect(replaceFood.lastCall.args[0]).to.equal(localFood);
    expect(bear).to.deep.equal(beforeBear);
    expect(notes).to.equal(beforeNotes);
    expect(dispatch.calledWithMatch({ type: "UpdateState" })).to.equal(false);
  });

  it("keeps the phone's schedule when an older backup has no schedule", async () => {
    schedule = scheduled("phone-program");
    const before = schedule;
    await FullBackupFile_restore({ storage: state.storage });
    expect(schedule).to.equal(before);
    expect((WeekScheduleStore.replace as sinon.SinonStub).called).to.equal(false);
  });

  it("rolls back the notes and the earlier stores when saving the restored schedule fails", async () => {
    notes = noted("Phone");
    const beforeNotes = notes;
    schedule = scheduled("phone-program");
    const beforeSchedule = schedule;
    const localFood = FoodLog_empty();
    (food.FoodLogStore_load as sinon.SinonStub).resolves(localFood);
    const replaceFood = sinon.stub(food, "FoodLogStore_replace").resolves();
    stubRestoreWrites();
    for (const store of [ReportStore, SetClipStore, RunStore, ProgramGoalStore, StepsStore, ChecklistStore]) {
      sinon.stub(store, "replace").resolves();
    }
    (WeekScheduleStore.replace as sinon.SinonStub).rejects(new Error("QuotaExceededError"));
    const parts = { ...emptyParts(state.storage), notes: noted("Cloud"), schedule: scheduled("cloud-program") };
    download.resolves({ ok: true, value: JSON.stringify(FullBackup_build(parts, now - 1000)) });
    const result = sinon.spy();
    await run(Thunk_cloudRestore("latest", result));
    expect(result.firstCall.args[0]).to.deep.equal({ ok: true, value: false });
    expect(replaceFood.lastCall.args[0]).to.equal(localFood);
    expect(notes).to.equal(beforeNotes);
    expect(schedule).to.equal(beforeSchedule);
    expect(dispatch.calledWithMatch({ type: "UpdateState" })).to.equal(false);
  });

  it("makes a restored weekday copy the cloud backup after saving the replaced one", async () => {
    const older = cloudFile([1, 2]);
    const latest = cloudFile([9]);
    download.withArgs("day-1").resolves({ ok: true, value: older });
    download.withArgs().resolves({ ok: true, value: latest });
    for (const store of [food]) {
      sinon.stub(store, "FoodLogStore_replace").resolves();
    }
    stubRestoreWrites();
    for (const store of [ReportStore, SetClipStore, RunStore, ProgramGoalStore, StepsStore, ChecklistStore]) {
      sinon.stub(store, "replace").resolves();
    }
    const result = sinon.spy();
    await run(Thunk_cloudRestore("day-1", result));
    expect(result.firstCall.args[0]).to.deep.equal({ ok: true, value: true });
    expect(saveReplaced.firstCall.args[0]).to.equal(latest);
    expect(upload.callCount).to.equal(1);
  });

  it("checks the cloud after sign-in, so an empty phone gets the restore offer", async () => {
    sinon.stub(cloud, "CloudBackupClient_verify").resolves({ ok: true, value: session });
    download.resolves({ ok: true, value: cloudFile([1, 2]) });
    const events: ICloudBackupEvent[] = [];
    await run(
      CloudBackupCommand_run({ operation: "verify", email: session.email, code: "123456" }, (event) =>
        events.push(event)
      )
    );
    expect(events).to.deep.equal([{ type: "verified" }]);
    expect(cloudState.restoreOffer?.cloud.workouts).to.equal(2);
  });

  it("catches up on launch and return at most once per 30 seconds", async () => {
    const flush = sinon.stub(feed, "FeedClient_flush").resolves({ ok: true, value: undefined });
    state.storage.history = workouts([5]);
    await run(Thunk_cloudCatchUp());
    await run(Thunk_cloudCatchUp());
    expect(flush.callCount).to.equal(1);
    expect(upload.callCount).to.equal(1);
    (Date.now as sinon.SinonStub).returns(now + 30000);
    await run(Thunk_cloudCatchUp());
    expect(flush.callCount).to.equal(2);
  });

  it("skips the weekly backup reminder after a recent cloud upload", async () => {
    const global = globalThis as { __OFFLINE_ONLY__?: boolean };
    global.__OFFLINE_ONLY__ = true;
    try {
      state.storage.history = workouts([5]);
      sinon.stub(reminderMarks, "BackupReminderMarks_read").returns({});
      sinon.stub(reminderMarks, "BackupReminderMarks_recordReminder");
      cloudState = { ...cloudState, lastBackupAt: now - 86400000 };
      await run(Thunk_maybeRemindBackup());
      expect(confirm.called).to.equal(false);
      cloudState = { ...cloudState, lastBackupAt: now - 8 * 86400000 };
      confirm.resolves(false);
      await run(Thunk_maybeRemindBackup());
      expect(confirm.calledOnce).to.equal(true);
    } finally {
      delete global.__OFFLINE_ONLY__;
    }
  });
});
