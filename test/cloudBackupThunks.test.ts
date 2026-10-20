import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { Thunk_cloudBackup, Thunk_cloudRestore, Thunk_exportEverything } from "../src/ducks/thunks";
import { IDispatch, IThunk } from "../src/ducks/types";
import { IEnv, IState } from "../src/models/state";
import { Storage_getDefault } from "../src/models/storage";
import { IHistoryRecord } from "../src/types";
import { FoodLog_empty } from "../src/models/foodLog";
import { MusicLog_empty } from "../src/models/musicLog";
import { BodyScans_empty } from "../src/models/bodyScans";
import { WarmupPlan_empty } from "../src/models/warmupPlan";
import { WorkoutReport_empty } from "../src/models/workoutReport";
import { FullBackup_build } from "../src/models/fullBackup";
import * as cloud from "../src/utils/cloudBackupClient";
import * as supabase from "../src/utils/supabaseClient";
import * as food from "../src/utils/foodLogStore";
import * as music from "../src/utils/musicStore";
import * as body from "../src/utils/bodyScanStore";
import * as warmups from "../src/utils/warmupStore";
import { ReportStore } from "../src/utils/reportStore";
import * as dialogs from "../src/utils/dialog";
import * as exporter from "../src/utils/exporter";
import { CloudBackupCommand_run } from "../src/utils/cloudBackupCommand";
import { ICloudBackupEvent } from "../src/models/cloudBackupForm";
import { SetClips_empty, SetClips_parse } from "../src/models/setClips";
import { SetClipStore } from "../src/utils/setClipStore";

const now = Date.UTC(2026, 9, 20, 18);
const session = {
  email: "paul@example.com",
  userId: "u1",
  accessToken: "secret-access",
  refreshToken: "secret-refresh",
  expiresAt: now + 3600000,
};

describe("Cloud backup thunks", () => {
  let state: IState;
  let upload: sinon.SinonStub;
  let download: sinon.SinonStub;
  let confirm: sinon.SinonStub;
  let dispatch: sinon.SinonStub;

  async function run(thunk: IThunk): Promise<void> {
    await thunk(dispatch as IDispatch, () => state, {} as IEnv);
  }

  beforeEach(() => {
    state = { storage: Storage_getDefault() } as IState;
    dispatch = sinon.stub();
    sinon.stub(Date, "now").returns(now);
    sinon.stub(supabase.CloudStore, "load").resolves({ version: 1, session });
    upload = sinon.stub(cloud, "CloudBackupClient_upload").resolves({ ok: true, value: now });
    download = sinon.stub(cloud, "CloudBackupClient_download");
    confirm = sinon.stub(dialogs, "Dialog_confirm").resolves(true);
    sinon.stub(dialogs, "Dialog_alert");
    sinon.stub(food, "FoodLogStore_load").resolves(FoodLog_empty());
    sinon.stub(music, "MusicStore_load").resolves({
      ...MusicLog_empty(),
      tokens: { accessToken: "spotify-access", refreshToken: "spotify-refresh", expiresAt: now },
    });
    sinon.stub(body, "BodyScanStore_load").resolves(BodyScans_empty());
    sinon.stub(warmups, "WarmupStore_load").resolves(WarmupPlan_empty());
    sinon.stub(ReportStore, "load").resolves(WorkoutReport_empty());
    sinon.stub(SetClipStore, "load").resolves(SetClips_empty());
  });
  afterEach(() => sinon.restore());

  it("skips automatic uploads with no workout, no session, or an already saved workout", async () => {
    await run(Thunk_cloudBackup(false));
    expect(upload.called).to.equal(false);
    state.storage.history = [{ id: 1, startTime: now - 2000, endTime: now - 1000 } as IHistoryRecord];
    (supabase.CloudStore.load as sinon.SinonStub).resolves({ version: 1 });
    await run(Thunk_cloudBackup(false));
    (supabase.CloudStore.load as sinon.SinonStub).resolves({ version: 1, session, lastBackupAt: now - 1000 });
    await run(Thunk_cloudBackup(false));
    expect(upload.called).to.equal(false);
    expect((food.FoodLogStore_load as sinon.SinonStub).called).to.equal(false);
  });

  it("uses end time, falls back to start time, and permits a forced empty backup", async () => {
    state.storage.history = [{ id: 1, startTime: now - 2000, endTime: now - 1000 } as IHistoryRecord];
    (supabase.CloudStore.load as sinon.SinonStub).resolves({ version: 1, session, lastBackupAt: now - 1500 });
    await run(Thunk_cloudBackup(false));
    expect(upload.callCount).to.equal(1);
    state.storage.history = [{ id: 2, startTime: now - 500 } as IHistoryRecord];
    await run(Thunk_cloudBackup(false));
    expect(upload.callCount).to.equal(2);
    state.storage.history = [];
    await run(Thunk_cloudBackup(true));
    expect(upload.callCount).to.equal(3);
  });

  it("shares the full export builder and leaves both logins out of its JSON", async () => {
    const toFile = sinon.stub(exporter, "Exporter_toFile");
    await run(Thunk_exportEverything());
    await run(Thunk_cloudBackup(true));
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
      "clips"
    );
    expect(text).to.not.include("secret-refresh");
    expect(text).to.not.include("spotify-refresh");
    expect(text).to.not.include("bebear_cloud");
  });

  it("reports upload and local read errors to the settings caller", async () => {
    const result = sinon.spy();
    upload.resolves({ ok: false, error: "Quota exceeded" });
    await run(Thunk_cloudBackup(true, result));
    expect(result.firstCall.args[0]).to.deep.equal({ ok: false, error: "Quota exceeded" });
    (food.FoodLogStore_load as sinon.SinonStub).rejects(new Error("Local read failed"));
    await run(Thunk_cloudBackup(true, result));
    expect(result.secondCall.args[0]).to.deep.equal({ ok: false, error: "Local read failed" });
  });

  it("does not download or replace data when restore is cancelled", async () => {
    confirm.resolves(false);
    const result = sinon.spy();
    await run(Thunk_cloudRestore(result));
    expect(download.called).to.equal(false);
    expect(dispatch.called).to.equal(false);
    expect(result.firstCall.args[0]).to.deep.equal({ ok: true, value: false });
  });

  it("reports missing backups and download failures without importing", async () => {
    const result = sinon.spy();
    download.resolves({ ok: true, value: undefined });
    await run(Thunk_cloudRestore(result));
    expect(result.firstCall.args[0]).to.deep.equal({ ok: false, error: "No cloud backup yet" });
    download.resolves({ ok: false, error: "No connection" });
    await run(Thunk_cloudRestore(result));
    expect(result.secondCall.args[0]).to.deep.equal({ ok: false, error: "No connection" });
    expect(dispatch.called).to.equal(false);
  });

  it("restores every full-backup store while keeping this phone's logins", async () => {
    const parts = {
      storage: state.storage,
      food: FoodLog_empty(),
      music: MusicLog_empty(),
      body: BodyScans_empty(),
      warmups: WarmupPlan_empty(),
      reports: WorkoutReport_empty(),
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
    download.resolves({ ok: true, value: JSON.stringify(FullBackup_build(parts, now)) });
    const replaceFood = sinon.stub(food, "FoodLogStore_replace").resolves();
    const replaceMusic = sinon.stub(music, "MusicStore_update").resolves();
    const replaceBody = sinon.stub(body, "BodyScanStore_update").resolves();
    const replaceWarmups = sinon.stub(warmups, "WarmupStore_update").resolves();
    const replaceReports = sinon.stub(ReportStore, "update").resolves();
    const replaceClips = sinon.stub(SetClipStore, "update").resolves();
    const updateCloud = sinon.spy(supabase.CloudStore, "update");
    const result = sinon.spy();
    await run(Thunk_cloudRestore(result));
    expect(result.firstCall.args[0]).to.deep.equal({ ok: true, value: true });
    expect(dispatch.calledWithMatch({ type: "UpdateState", desc: "Importing Storage" })).to.equal(true);
    expect(replaceFood.firstCall.args[0]).to.deep.equal(parts.food);
    const localMusic = {
      ...MusicLog_empty(),
      tokens: { accessToken: "local", refreshToken: "local-r", expiresAt: now },
    };
    expect(replaceMusic.firstCall.args[0](localMusic).tokens).to.equal(localMusic.tokens);
    expect(replaceBody.firstCall.args[0](BodyScans_empty())).to.deep.equal(parts.body);
    expect(replaceWarmups.firstCall.args[0](WarmupPlan_empty())).to.deep.equal(parts.warmups);
    expect(replaceReports.firstCall.args[0](WorkoutReport_empty())).to.deep.equal(parts.reports);
    expect(replaceClips.firstCall.args[0](SetClips_empty())).to.deep.equal(SetClips_parse(parts.clips));
    expect(updateCloud.called).to.equal(false);
  });

  it("rejects malformed cloud JSON without replacing local storage", async () => {
    const result = sinon.spy();
    download.resolves({ ok: true, value: "{" });
    await run(Thunk_cloudRestore(result));
    expect(result.firstCall.args[0]).to.deep.equal({ ok: true, value: false });
    expect(dispatch.calledWithMatch({ type: "UpdateState" })).to.equal(false);
  });

  it("checks for a cloud backup after sign-in only on a phone without workouts", async () => {
    sinon.stub(cloud, "CloudBackupClient_verify").resolves({ ok: true, value: session });
    const events: ICloudBackupEvent[] = [];
    await run(
      CloudBackupCommand_run({ operation: "verify", email: session.email, code: "123456" }, (event) =>
        events.push(event)
      )
    );
    expect(events).to.deep.equal([{ type: "verified", hasHistory: false }]);
    state.storage.history = [{ id: 1, startTime: now } as IHistoryRecord];
    await run(
      CloudBackupCommand_run({ operation: "verify", email: session.email, code: "123456" }, (event) =>
        events.push(event)
      )
    );
    expect(events[1]).to.deep.equal({ type: "verified", hasHistory: true });
    expect(download.called).to.equal(false);
  });
});
