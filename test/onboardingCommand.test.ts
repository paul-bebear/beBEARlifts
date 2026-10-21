import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { OnboardingCommand_run } from "../src/utils/onboardingCommand";
import { Onboarding_empty, IOnboardingEvent, IOnboardingState } from "../src/models/onboarding";
import { IDispatch, IThunk } from "../src/ducks/types";
import { IState, IEnv } from "../src/models/state";
import { Storage_getDefault } from "../src/models/storage";
import { OnboardingCatalog_programs } from "../src/utils/onboardingCatalog";
import { FoodLog_empty } from "../src/models/foodLog";
import * as food from "../src/utils/foodLogStore";
import * as ai from "../src/utils/aiRequest";
import { Thunk_importCsvData } from "../src/ducks/thunks";
import ss1 from "../programdata/programs/builtin/ss1.json";
import { AiConsent_decide } from "../src/models/aiConsent";
import { AiConsentStore } from "../src/utils/aiConsentClient";

const csv =
  "Workout DateTime,Program,Day Name,Exercise,Is Warmup Set?,Required Reps,Completed Reps,Is AMRAP?,Required RPE,Completed RPE,Log RPE?,Required Weight Value,Required Weight Unit,Completed Weight Value,Completed Weight Unit,Ask Weight?,Completed Reps Time,Target Muscles,Synergist Muscles,Notes\n2026-03-01T10:00:00.000Z,Plan,Day 1,Squat,0,5,5,0,,,0,60,kg,60,kg,0,,,,";

describe("Onboarding commands", () => {
  let state: IState;
  let events: IOnboardingEvent[];
  let dispatch: IDispatch;
  let foodLog = FoodLog_empty();

  beforeEach(() => {
    sinon.stub(AiConsentStore, "load").resolves(AiConsent_decide(true, 123));
    state = { storage: Storage_getDefault(), programs: OnboardingCatalog_programs(), loading: { items: {} } } as IState;
    events = [];
    foodLog = FoodLog_empty();
    sinon.stub(food, "FoodLogStore_update").callsFake(async (fn) => {
      foodLog = fn(foodLog);
    });
    dispatch = async (action) => {
      if (typeof action === "function") {
        return;
      }
      if (action.type === "UpdateState") {
        state = action.lensRecording.reduce((memo, recording) => recording.fn(memo), state);
      }
    };
  });
  afterEach(() => sinon.restore());

  async function run(form: IOnboardingState, env: IEnv = {} as IEnv): Promise<void> {
    await OnboardingCommand_run(form, (e) => events.push(e))(dispatch, () => state, env);
  }

  it("prepares a bundled plan without network calls or saving it before Start", async () => {
    state.programs = [];
    const request = sinon.stub(ai, "AiRequest_post");
    await run({ ...Onboarding_empty(), command: "fallback" });
    expect(events[0].type).to.equal("ready");
    if (events[0].type === "ready") {
      expect(events[0].result).to.include({ name: "Fierce 5", days: 3 });
    }
    expect(state.storage.programs).to.have.length(0);
    expect(request.called).to.equal(false);
  });

  it("uses the built-in plan when AI permission was revoked", async () => {
    (AiConsentStore.load as sinon.SinonStub).resolves(AiConsent_decide(false, 123));
    const request = sinon.stub(ai, "AiRequest_post");
    await run({ ...Onboarding_empty(), useAi: true, command: "prepare" });
    expect(events[0].type).to.equal("ready");
    expect(request.called).to.equal(false);
  });
  it("repairs an invalid Liftoscript answer once using the exact validation error", async () => {
    const request = sinon.stub(ai, "AiRequest_post");
    request
      .onFirstCall()
      .resolves({ ok: true, body: { text: JSON.stringify({ liftoscript: "# Week 1\n## Day 1\nSquat / 3x" }) } });
    request
      .onSecondCall()
      .resolves({ ok: true, body: { text: JSON.stringify({ liftoscript: "# Week 1\n## Day 1\nSquat / 3x5" }) } });
    await run({ ...Onboarding_empty(), command: "prepare" });
    expect(request.callCount).to.equal(2);
    expect((request.secondCall.args[1] as { validationError: string }).validationError)
      .to.be.a("string")
      .and.not.equal("");
    expect(events[0].type).to.equal("ready");
    expect(state.storage.programs).to.have.length(0);
  });
  it("loads AI-selected built-ins outside the offline shortlist and retains them for an offline Start", async () => {
    state.programs = [];
    sinon.stub(ai, "AiRequest_post").resolves({ ok: true, body: { text: '{"builtin":"ss1"}' } });
    const detail = sinon.stub().resolves(ss1);
    await run({ ...Onboarding_empty(), command: "prepare" }, { service: { programDetail: detail } } as unknown as IEnv);
    expect(detail.firstCall.args).to.deep.equal(["ss1"]);
    const ready = events[0];
    expect(ready.type).to.equal("ready");
    if (ready.type === "ready") {
      events = [];
      await run({ ...Onboarding_empty(), command: "apply", result: ready.result });
      expect(events).to.deep.equal([]);
      expect(state.storage.programs[0].name).to.equal(ready.result.name);
    }
  });
  it("stops after two invalid answers and makes network failures recoverable", async () => {
    const request = sinon.stub(ai, "AiRequest_post").resolves({ ok: true, body: { text: "broken" } });
    await run({ ...Onboarding_empty(), command: "prepare" });
    expect(request.callCount).to.equal(2);
    expect(events[0].type).to.equal("failed");
    request.reset();
    request.resolves({ ok: false, error: "No connection" });
    events = [];
    await run({ ...Onboarding_empty(), command: "prepare" });
    expect(request.callCount).to.equal(1);
    expect(events[0]).to.include({ type: "ready" });
    if (events[0].type === "ready") {
      expect(events[0].result.answer.note).to.include("No connection");
    }
  });
  it("applies program, history, units, weight and food profile on Start", async () => {
    const form = Onboarding_empty();
    form.answers = { ...form.answers, height: "180", weight: "80", unit: "kg", age: "30", sex: "male", goal: "lose" };
    form.command = "apply";
    form.result = {
      name: "Fierce 5",
      days: 3,
      answer: { builtin: "fierce-5", historyCsv: csv, renamed: [], note: "" },
    };
    await run(form);
    expect(events).to.deep.equal([]);
    expect(state.storage.programs).to.have.length(1);
    expect(state.storage.currentProgramId).to.equal(state.storage.programs[0].id);
    expect(state.storage.settings.units).to.equal("kg");
    expect(state.storage.history).to.have.length(1);
    expect(state.storage.importSessions?.[0].workoutCount).to.equal(1);
    expect(state.storage.stats.weight.weight?.[0].value).to.deep.equal({ value: 80, unit: "kg" });
    expect(foodLog.profile).to.include({ heightCm: 180, sex: "male", goal: "lose" });
  });
  it("does not create a program when history is unreadable or food persistence fails", async () => {
    const form = Onboarding_empty();
    form.command = "apply";
    form.result = {
      name: "Fierce 5",
      days: 3,
      answer: { builtin: "fierce-5", historyCsv: "bad", renamed: [], note: "" },
    };
    await run(form);
    expect(events[0].type).to.equal("failed");
    expect(state.storage.programs).to.have.length(0);
    form.result.answer.historyCsv = undefined;
    (food.FoodLogStore_update as sinon.SinonStub).rejects(new Error("Storage full"));
    await run(form);
    expect(state.storage.programs).to.have.length(0);
  });
  it("imports onboarding history immediately without opening the normal import preview", async () => {
    const actions = sinon.spy(dispatch);
    const thunk: IThunk = Thunk_importCsvData(csv, "apply");
    await thunk(actions, () => state, {} as IEnv);
    expect(state.storage.history).to.have.length(1);
    expect(state.importPreview).to.equal(undefined);
  });
});
