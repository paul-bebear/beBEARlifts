import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import Module from "module";
import { IAccountPlanState } from "../src/models/accountPlan";
import { ICloudSession } from "../src/models/cloudBackup";

type IAppStateListener = (next: string) => void;
type IPlanFollowsSignIn = typeof import("../src/utils/planFollowsSignIn");
type IAccountPlanClient = typeof import("../src/utils/accountPlanClient");
type IPurchases = typeof import("../src/utils/purchases");
type ISupabaseClient = typeof import("../src/utils/supabaseClient");

const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe("PlanFollowsSignIn_start", () => {
  let appStateListener: IAppStateListener | undefined;
  let removeAppState: sinon.SinonStub;
  let sessionListener: ((cloud: { session?: Partial<ICloudSession> }) => void) | undefined;
  let unsubscribe: sinon.SinonStub;
  let currentSession: Partial<ICloudSession> | undefined;
  let planStatus: IAccountPlanState;
  let planClient: IAccountPlanClient;
  let purchases: IPurchases;
  let supabase: ISupabaseClient;
  let followSignIn: IPlanFollowsSignIn;
  const loader = Module as unknown as { _load: (...args: unknown[]) => unknown };
  const originalLoad = loader._load;
  let sync: sinon.SinonStub;
  let clear: sinon.SinonStub;
  let configure: sinon.SinonStub;
  let identify: sinon.SinonStub;

  before(() => {
    loader._load = function (request: unknown, ...rest: unknown[]): unknown {
      if (request === "react-native") {
        return {
          AppState: {
            addEventListener: (_type: string, listener: IAppStateListener) => {
              appStateListener = listener;
              return { remove: removeAppState };
            },
          },
        };
      }
      return originalLoad.call(this, request, ...rest);
    };
    planClient = require("../src/utils/accountPlanClient");
    purchases = require("../src/utils/purchases");
    supabase = require("../src/utils/supabaseClient");
    followSignIn = require("../src/utils/planFollowsSignIn");
  });

  after(() => {
    loader._load = originalLoad;
  });

  beforeEach(() => {
    appStateListener = undefined;
    sessionListener = undefined;
    currentSession = undefined;
    planStatus = { status: "unknown" };
    removeAppState = sinon.stub();
    unsubscribe = sinon.stub();
    sync = sinon.stub(planClient, "AccountPlanClient_sync").resolves("free");
    clear = sinon.stub(planClient, "AccountPlanClient_clear").resolves();
    sinon.stub(planClient.AccountPlanStore, "get").callsFake(() => planStatus);
    configure = sinon.stub(purchases, "Purchases_configure");
    identify = sinon.stub(purchases, "Purchases_identify");
    sinon.stub(supabase.CloudStore, "load").callsFake(async () => ({ session: currentSession }) as never);
    sinon.stub(supabase.CloudStore, "subscribe").callsFake((listener) => {
      sessionListener = listener as never;
      return unsubscribe;
    });
  });

  afterEach(() => sinon.restore());

  function signalSession(userId: string | undefined): void {
    sessionListener?.({ session: userId == null ? undefined : { userId } });
  }

  describe("with the store available", () => {
    beforeEach(() => {
      sinon.stub(purchases, "Purchases_isAvailable").returns(true);
    });

    it("configures the store once with the saved user and syncs the plan", async () => {
      currentSession = { userId: "a" };
      followSignIn.PlanFollowsSignIn_start();
      await flush();
      expect(configure.args).to.deep.equal([["a"]]);
      expect(identify.callCount).to.equal(0);
      expect(sync.callCount).to.equal(1);
      expect(clear.callCount).to.equal(0);
    });

    it("clears the plan on first run with nobody signed in", async () => {
      followSignIn.PlanFollowsSignIn_start();
      await flush();
      expect(configure.args).to.deep.equal([[undefined]]);
      expect(clear.callCount).to.equal(1);
      expect(sync.callCount).to.equal(0);
    });

    it("identifies the new user on sign-in and clears the plan on sign-out", async () => {
      followSignIn.PlanFollowsSignIn_start();
      await flush();
      signalSession("a");
      expect(identify.args).to.deep.equal([["a"]]);
      expect(sync.callCount).to.equal(1);
      signalSession(undefined);
      expect(identify.args).to.deep.equal([["a"], [undefined]]);
      expect(clear.callCount).to.equal(2);
      expect(configure.callCount).to.equal(1);
    });

    it("does nothing when a session update keeps the same user", async () => {
      currentSession = { userId: "a" };
      followSignIn.PlanFollowsSignIn_start();
      await flush();
      signalSession("a");
      signalSession("a");
      expect(sync.callCount).to.equal(1);
      expect(identify.callCount).to.equal(0);
    });

    it("ignores session updates that arrive before the first load finishes", async () => {
      currentSession = { userId: "a" };
      followSignIn.PlanFollowsSignIn_start();
      signalSession("b");
      await flush();
      expect(configure.args).to.deep.equal([["a"]]);
      expect(sync.callCount).to.equal(1);
    });
  });

  describe("without the store", () => {
    beforeEach(() => {
      sinon.stub(purchases, "Purchases_isAvailable").returns(false);
    });

    it("syncs and clears the plan, and never calls the store", async () => {
      currentSession = { userId: "a" };
      followSignIn.PlanFollowsSignIn_start();
      await flush();
      signalSession(undefined);
      expect(sync.callCount).to.equal(1);
      expect(clear.callCount).to.equal(1);
      expect(configure.callCount).to.equal(0);
      expect(identify.callCount).to.equal(0);
    });
  });

  describe("returning to the app", () => {
    it("syncs again only while a purchase is activating", async () => {
      sinon.stub(purchases, "Purchases_isAvailable").returns(false);
      followSignIn.PlanFollowsSignIn_start();
      await flush();
      sync.resetHistory();
      planStatus = { status: "activating", userId: "a" };
      appStateListener?.("background");
      expect(sync.callCount).to.equal(0);
      appStateListener?.("active");
      expect(sync.callCount).to.equal(1);
      planStatus = { status: "known", userId: "a", plan: "free" };
      appStateListener?.("active");
      expect(sync.callCount).to.equal(1);
    });
  });

  it("stops listening when the returned function runs", async () => {
    sinon.stub(purchases, "Purchases_isAvailable").returns(false);
    const stop = followSignIn.PlanFollowsSignIn_start();
    await flush();
    stop();
    expect(unsubscribe.callCount).to.equal(1);
    expect(removeAppState.callCount).to.equal(1);
  });
});
