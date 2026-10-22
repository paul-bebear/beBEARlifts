import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { OnboardingCommand_pickImage, OnboardingCommand_run } from "../src/utils/onboardingCommand";
import {
  Onboarding_empty,
  IOnboardingEvent,
  IOnboardingState,
  Onboarding_reduce,
  Onboarding_selectedCard,
} from "../src/models/onboarding";
import { BearStore } from "../src/utils/bearStore";
import { BearStoreData_empty } from "../src/models/bearStoreData";
import { IDispatch } from "../src/ducks/types";
import { IState, IEnv } from "../src/models/state";
import { Storage_getDefault } from "../src/models/storage";
import { OnboardingCatalog_programs } from "../src/utils/onboardingCatalog";
import { FoodLog_empty, FoodLog_hasGoals } from "../src/models/foodLog";
import { FoodTargets_compute } from "../src/models/foodTargets";
import * as food from "../src/utils/foodLogStore";
import * as ai from "../src/utils/aiRequest";
import ss1 from "../programdata/programs/builtin/ss1.json";
import { AiConsent_decide } from "../src/models/aiConsent";
import { AiConsentStore } from "../src/utils/aiConsentClient";
import { ProgramGoalStore } from "../src/utils/programGoalStore";
import { IProgramGoalLog, ProgramGoal_empty } from "../src/models/programGoal";
import { Equipment_getCurrentGym } from "../src/models/equipment";

const csv =
  "Workout DateTime,Program,Day Name,Exercise,Is Warmup Set?,Required Reps,Completed Reps,Is AMRAP?,Required RPE,Completed RPE,Log RPE?,Required Weight Value,Required Weight Unit,Completed Weight Value,Completed Weight Unit,Ask Weight?,Completed Reps Time,Target Muscles,Synergist Muscles,Notes\n2026-03-01T10:00:00.000Z,Plan,Day 1,Squat,0,5,5,0,,,0,60,kg,60,kg,0,,,,";

describe("Native onboarding screenshots", () => {
  let form: IOnboardingState;
  const emit = (event: IOnboardingEvent): void => {
    form = Onboarding_reduce(form, event);
  };
  beforeEach(() => {
    form = { ...Onboarding_empty(), at: { phase: "import" } };
  });
  it("adds the picked screenshot and releases the busy state", async () => {
    await OnboardingCommand_pickImage(async () => ({ kind: "photo", dataUrl: "data:image/jpeg;base64,abc" }), emit);
    expect(form.images).to.deep.equal(["data:image/jpeg;base64,abc"]);
    expect(form.resizing).to.equal(false);
    expect(form.error).to.equal(undefined);
  });
  it("keeps earlier screenshots when the picker is cancelled", async () => {
    form = { ...form, images: ["earlier"] };
    await OnboardingCommand_pickImage(async () => ({ kind: "cancelled" }), emit);
    expect(form.images).to.deep.equal(["earlier"]);
    expect(form.resizing).to.equal(false);
    expect(form.error).to.equal(undefined);
  });
  it("shows a picker error without leaving the form busy", async () => {
    await OnboardingCommand_pickImage(async () => ({ kind: "error", error: "Photo permission denied" }), emit);
    expect(form.error).to.equal("Photo permission denied");
    expect(form.resizing).to.equal(false);
    expect(form.at.phase).to.equal("import");
  });
  it("handles a rejected native picker", async () => {
    await OnboardingCommand_pickImage(async () => {
      throw new Error("Picker unavailable");
    }, emit);
    expect(form.error).to.equal("Picker unavailable");
    expect(form.resizing).to.equal(false);
  });
  it("preserves the six-image and total-size limits", async () => {
    form = { ...form, images: Array(6).fill("earlier") };
    await OnboardingCommand_pickImage(async () => ({ kind: "photo", dataUrl: "seventh" }), emit);
    expect(form.images).to.have.length(6);
    expect(form.error).to.include("6 smaller screenshots");
    form = { ...form, images: ["x".repeat(3_500_000)] };
    await OnboardingCommand_pickImage(async () => ({ kind: "photo", dataUrl: "too large" }), emit);
    expect(form.images).to.have.length(1);
    expect(form.resizing).to.equal(false);
    expect(form.error).to.include("3.5 MB total");
  });
});

describe("Onboarding commands", () => {
  let state: IState;
  let events: IOnboardingEvent[];
  let dispatch: IDispatch;
  let foodLog = FoodLog_empty();
  let goalLog: IProgramGoalLog = ProgramGoal_empty();

  beforeEach(() => {
    goalLog = ProgramGoal_empty();
    sinon.stub(ProgramGoalStore, "update").callsFake(async (fn) => {
      goalLog = fn(goalLog);
    });
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

  function cardsFor(answers: Partial<IOnboardingState["answers"]>): IOnboardingState {
    return Onboarding_reduce(Onboarding_empty(), { type: "answers", patch: answers });
  }

  function start(form: IOnboardingState): IOnboardingState {
    return { ...form, at: { phase: "flow", id: "welcome" }, command: "apply", run: form.run + 1 };
  }

  it("builds the picked card's plan on Start, offline, with the card's name", async () => {
    state.programs = [];
    const request = sinon.stub(ai, "AiRequest_post");
    const plan = start(cardsFor({ places: ["gym"], goal: "size" }));
    await run(plan);
    expect(events).to.deep.equal([]);
    expect(request.called).to.equal(false);
    const program = state.storage.programs[0];
    expect(program.name).to.equal(Onboarding_selectedCard(plan)?.name);
    expect(state.storage.currentProgramId).to.equal(program.id);
    expect(program.planner?.weeks[0].days.length).to.be.greaterThan(0);
    expect(goalLog.current?.kind).to.equal("buildMuscle");
    expect(foodLog.profile).to.include({ goal: "gain", activity: "light" });
  });
  it("keeps only the equipment of the picked places in the current gym", async () => {
    await run(start(cardsFor({ places: ["dumbbells"], goal: "strength" })));
    const equipment = Equipment_getCurrentGym(state.storage.settings).equipment;
    expect(equipment.dumbbell?.isDeleted).to.equal(false);
    expect(equipment.barbell?.isDeleted).to.equal(true);
    expect(goalLog.current?.kind).to.equal("maintain");
  });
  it("saves calculated food targets on Start alongside the chosen three-day plan", async () => {
    const plan = cardsFor({
      places: ["gym"],
      experience: "years",
      days: 3,
      heightUnit: "cm",
      height: "180",
      unit: "kg",
      weight: "80",
      age: "30",
      sex: "male",
      activity: "sedentary",
      foodGoal: "lose",
    });
    await run(start(plan));
    expect(events).to.deep.equal([]);
    expect(state.storage.programs[0].name).to.equal("beBEAR 3-Day Full Body");
    expect(FoodLog_hasGoals(foodLog.goals)).to.equal(true);
    expect(foodLog.goals).to.deep.equal(
      FoodTargets_compute({ weightKg: 80, heightCm: 180, sex: "male", age: 30 }, "sedentary", "lose").goals
    );
    expect(foodLog.profile).to.include({
      activity: "sedentary",
      goal: "lose",
      heightCm: 180,
      sex: "male",
      birthYear: new Date().getFullYear() - 30,
    });
    expect(goalLog.current).to.include({ kind: "buildMuscle", sex: "male" });
  });
  it("leaves food targets unset when optional food questions are skipped", async () => {
    await run(
      start(
        cardsFor({
          places: ["gym"],
          heightUnit: "cm",
          height: "180",
          unit: "kg",
          weight: "80",
          age: "30",
          sex: "male",
        })
      )
    );
    expect(events).to.deep.equal([]);
    expect(FoodLog_hasGoals(foodLog.goals)).to.equal(false);
    expect(state.storage.programs).to.have.length(1);
  });
  it("preserves saved food targets when the food goal is skipped", async () => {
    const goals = FoodTargets_compute(
      { weightKg: 70, heightCm: 170, sex: "female", age: 25 },
      "light",
      "maintain"
    ).goals;
    foodLog = { ...foodLog, goals };
    await run(start(cardsFor({ places: ["gym"], activity: "light" })));
    expect(events).to.deep.equal([]);
    expect(foodLog.goals).to.deep.equal(goals);
  });
  it("leaves a goal the user already set alone", async () => {
    goalLog = { version: 1, current: { kind: "loseFat", activity: "under5k", startedAt: 1 }, past: [] };
    await run(start(cardsFor({ places: ["gym"] })));
    expect(goalLog.current?.kind).to.equal("loseFat");
  });
  it("saves the picked bear to the bear store, and leaves it unset when no bear was picked", async () => {
    let bear = BearStoreData_empty();
    sinon.stub(BearStore, "update").callsFake(async (fn) => {
      bear = fn(bear);
    });
    await run(start(cardsFor({ places: ["gym"] })));
    expect(bear.line).to.equal(undefined);
    await run(start(cardsFor({ places: ["gym"], bearLine: "female" })));
    expect(bear.line).to.equal("female");
  });
  it("applies the card picked on the plans step after the flow has moved past it", async () => {
    const form = start({ ...cardsFor({ places: ["gym"], experience: "new" }), pickedDays: 5 });
    await run(form);
    expect(state.storage.programs.find((p) => p.id === state.storage.currentProgramId)?.name).to.equal(
      Onboarding_selectedCard(form)?.name
    );
    expect(Onboarding_selectedCard(form)?.days).to.equal(5);
  });

  it("shows the beBEAR cards when AI permission was revoked", async () => {
    (AiConsentStore.load as sinon.SinonStub).resolves(AiConsent_decide(false, 123));
    const request = sinon.stub(ai, "AiRequest_post");
    await run({ ...Onboarding_empty(), useAi: true, command: "prepare" });
    expect(events[0].type).to.equal("fallback");
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
      await run({ ...Onboarding_empty(), source: "import", command: "apply", result: ready.result });
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
    expect(events[0]).to.deep.equal({ type: "fallback", run: 0, reason: "No connection" });
  });
  it("tags every answer with the run that asked for it", async () => {
    sinon.stub(ai, "AiRequest_post").resolves({ ok: false, error: "No connection" });
    await run({ ...Onboarding_empty(), command: "prepare", run: 7 });
    expect(events[0]).to.include({ type: "fallback", run: 7 });
  });

  async function prepareWithHistory(): Promise<IOnboardingState> {
    sinon
      .stub(ai, "AiRequest_post")
      .resolves({ ok: true, body: { text: JSON.stringify({ builtin: "fierce-5", historyCsv: csv }) } });
    await run({ ...Onboarding_empty(), command: "prepare" });
    const ready = events[0];
    events = [];
    if (ready.type !== "ready") {
      throw new Error("expected a ready event");
    }
    return Onboarding_reduce({ ...Onboarding_empty(), source: "import", command: "prepare" }, ready);
  }

  it("reads AI history before Start and shows its count without saving it", async () => {
    const done = await prepareWithHistory();
    expect(done.result?.history?.records).to.have.length(1);
    expect(done.importHistory).to.equal(true);
    expect(state.storage.history).to.have.length(0);
  });
  it("applies program, history, units, weight and food targets on Start", async () => {
    const done = await prepareWithHistory();
    const form: IOnboardingState = {
      ...done,
      command: "apply",
      answers: {
        ...done.answers,
        heightUnit: "cm",
        height: "180",
        weight: "80",
        unit: "kg",
        age: "30",
        sex: "male",
        goal: "strength",
        activity: "active",
        foodGoal: "gain",
      },
    };
    await run(form);
    expect(events).to.deep.equal([]);
    expect(state.storage.programs).to.have.length(1);
    expect(state.storage.currentProgramId).to.equal(state.storage.programs[0].id);
    expect(state.storage.settings.units).to.equal("kg");
    expect(state.storage.history).to.have.length(1);
    expect(state.storage.importSessions?.[0].workoutCount).to.equal(1);
    expect(state.storage.stats.weight.weight?.[0].value).to.deep.equal({ value: 80, unit: "kg" });
    expect(foodLog.profile).to.include({ heightCm: 180, sex: "male", goal: "gain", activity: "active" });
    expect(foodLog.goals).to.deep.equal(
      FoodTargets_compute({ weightKg: 80, heightCm: 180, sex: "male", age: 30 }, "active", "gain").goals
    );
    expect(goalLog.current).to.include({ kind: "maintain", sex: "male" });
  });
  it("skips workouts already in history and all workouts when the box is unticked", async () => {
    const done = await prepareWithHistory();
    await run({ ...done, command: "apply" });
    expect(state.storage.history).to.have.length(1);
    state.storage.programs = [];
    await run({ ...done, command: "apply" });
    expect(state.storage.history).to.have.length(1);
    state.storage.history = [];
    await run({ ...done, command: "apply", importHistory: false });
    expect(state.storage.history).to.have.length(0);
  });
  it("does not create a program when food persistence fails", async () => {
    const form = Onboarding_empty();
    form.command = "apply";
    form.result = { name: "Fierce 5", days: 3, answer: { builtin: "fierce-5", renamed: [], note: "" } };
    (food.FoodLogStore_update as sinon.SinonStub).rejects(new Error("Storage full"));
    await run(form);
    expect(events[0].type).to.equal("failed");
    expect(state.storage.programs).to.have.length(0);
  });
});
