import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { FoodApi_lookupBarcode, FoodApi_requestTimeoutMs, FoodApi_timeoutError } from "../src/utils/foodApi";

describe("FoodApi request time limit", () => {
  afterEach(() => sinon.restore());

  it("gives up on a barcode lookup that never answers after 15 seconds", async () => {
    const clock = sinon.useFakeTimers();
    const fetchStub = sinon.stub(globalThis, "fetch").callsFake(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          (init?.signal as AbortSignal).addEventListener("abort", () => reject(new Error("aborted")));
        })
    );
    const pending = FoodApi_lookupBarcode("111", []);
    await clock.tickAsync(FoodApi_requestTimeoutMs - 1);
    let settled = false;
    pending.then(() => (settled = true));
    await clock.tickAsync(0);
    expect(settled).to.equal(false);
    await clock.tickAsync(1);
    expect(await pending).to.deep.equal({ ok: false, error: FoodApi_timeoutError });
    expect(FoodApi_requestTimeoutMs).to.equal(15_000);
    expect(fetchStub.callCount).to.equal(1);
  });

  it("still says offline when the request fails before the limit", async () => {
    sinon.stub(globalThis, "fetch").rejects(new Error("network"));
    const result = await FoodApi_lookupBarcode("111", []);
    expect(result).to.deep.equal({ ok: false, error: "No connection. Food lookup needs a signal." });
  });

  it("returns the product when the server answers in time", async () => {
    sinon.stub(globalThis, "fetch").callsFake(async () => new Response(JSON.stringify({ status: 0 }), { status: 200 }));
    const result = await FoodApi_lookupBarcode("111", []);
    expect(result.ok).to.equal(true);
  });
});
