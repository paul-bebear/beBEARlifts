import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { ForkServices_hosts, ForkServices_plan } from "../src/utils/forkServices";
import * as offline from "../src/utils/offlineOnly";
import { Thunk_fetchInitial } from "../src/ducks/thunks";
import { IEnv, IState } from "../src/models/state";
import { IDispatch } from "../src/ducks/types";

describe("Fork services", () => {
  afterEach(() => sinon.restore());

  it("disables every upstream service in the offline fork", () => {
    for (const unlocked of [true, false]) {
      expect(Object.values(ForkServices_plan(true, unlocked)).every((on) => !on)).to.equal(true);
    }
  });

  it("preserves upstream services when opted in, while respecting the premium unlock", () => {
    expect(Object.values(ForkServices_plan(false, false)).every(Boolean)).to.equal(true);
    expect(ForkServices_plan(false, true).storeKit).to.equal(false);
    expect(ForkServices_plan(false, true).rollbar).to.equal(true);
  });

  it("keeps the offline app on the fork's host in Debug and Release", () => {
    for (const local of [true, false]) {
      expect(ForkServices_hosts(true, local, "https://dev.invalid", "https://api.invalid")).to.deep.equal({
        host: "https://lifts.paulbebear.com",
        apiHost: "https://lifts.paulbebear.com",
      });
    }
    expect(ForkServices_hosts(false, true, "https://dev.invalid", "https://api.invalid")).to.deep.equal({
      host: "https://dev.invalid",
      apiHost: "https://api.invalid",
    });
    expect(ForkServices_hosts(false, false, "", "")).to.deep.equal({
      host: "https://lifts.paulbebear.com",
      apiHost: "https://lifts.paulbebear.com",
    });
  });

  it("still loads programs but never verifies legacy receipts at offline startup", async () => {
    sinon.stub(offline, "OfflineOnly_isEnabled").returns(true);
    const state = {
      storage: { whatsNew: "20261021", subscription: { key: "legacy", apple: [{ value: "receipt" }] } },
    } as IState;
    const dispatch = sinon.spy() as unknown as IDispatch;
    const verifyAppleReceipt = sinon.spy();
    await Thunk_fetchInitial()(dispatch, () => state, { service: { verifyAppleReceipt } } as unknown as IEnv);
    expect((dispatch as sinon.SinonSpy).callCount).to.equal(1);
    expect(typeof (dispatch as sinon.SinonSpy).firstCall.args[0]).to.equal("function");
    expect(verifyAppleReceipt.called).to.equal(false);
  });
});
