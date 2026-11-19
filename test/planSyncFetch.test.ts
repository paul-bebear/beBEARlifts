import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { PlanSyncFetch_post } from "../src/utils/planSyncFetch";

const busy = (): Response => new Response("{}", { status: 429, headers: { "Retry-After": "20" } });
const free = (): Response => new Response(JSON.stringify({ plan: "free", grant: null }), { status: 200 });

describe("planSyncFetch", () => {
  let clock: sinon.SinonFakeTimers;
  let fetchStub: sinon.SinonStub;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    fetchStub = sinon.stub(globalThis, "fetch");
  });
  afterEach(() => sinon.restore());

  it("asks again after Retry-After while a restore is activating, and returns the RevenueCat answer", async () => {
    fetchStub.onFirstCall().resolves(busy());
    fetchStub.onSecondCall().resolves(free());
    const pending = PlanSyncFetch_post(
      "jwt",
      () => true,
      () => true
    );
    await clock.tickAsync(19999);
    expect(fetchStub.callCount).to.equal(1);
    await clock.tickAsync(1);
    const response = await pending;
    expect(fetchStub.callCount).to.equal(2);
    expect(await response.json()).to.deep.equal({ plan: "free", grant: null });
  });

  it("returns the 429 at once when no purchase is activating", async () => {
    fetchStub.resolves(busy());
    const response = await PlanSyncFetch_post(
      "jwt",
      () => true,
      () => false
    );
    expect(response.status).to.equal(429);
    expect(fetchStub.callCount).to.equal(1);
  });

  it("stops waiting when a newer sync has started", async () => {
    fetchStub.resolves(busy());
    let current = true;
    const pending = PlanSyncFetch_post(
      "jwt",
      () => current,
      () => true
    );
    await clock.tickAsync(0);
    current = false;
    await clock.tickAsync(20000);
    expect((await pending).status).to.equal(429);
    expect(fetchStub.callCount).to.equal(1);
  });

  it("gives up after 3 retries", async () => {
    fetchStub.callsFake(() => Promise.resolve(busy()));
    const pending = PlanSyncFetch_post(
      "jwt",
      () => true,
      () => true
    );
    await clock.tickAsync(60000);
    expect((await pending).status).to.equal(429);
    expect(fetchStub.callCount).to.equal(4);
  });
});
