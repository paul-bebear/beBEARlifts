import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import * as thunks from "../src/ducks/cloudBackupThunks";
import * as client from "../src/utils/cloudBackupClient";
import * as planClient from "../src/utils/accountPlanClient";
import * as supabase from "../src/utils/supabaseClient";
import { ICloudBackupCommand, ICloudBackupEvent, ICloudBackupOperation } from "../src/models/cloudBackupForm";
import { CloudBackupCommand_run } from "../src/utils/cloudBackupCommand";

async function run(
  operation: ICloudBackupOperation,
  extra: Partial<Pick<ICloudBackupCommand, "proCode" | "copy">> = {}
): Promise<ICloudBackupEvent[]> {
  const events: ICloudBackupEvent[] = [];
  const thunk = CloudBackupCommand_run({ operation, email: "bear@example.com", code: "123456", ...extra }, (e) =>
    events.push(e)
  );
  await thunk((() => undefined) as never, (() => ({})) as never, {} as never);
  return events;
}

describe("CloudBackupCommand_run", () => {
  let sentCode: sinon.SinonStub;
  let check: sinon.SinonStub;

  beforeEach(() => {
    sentCode = sinon.stub(supabase.SentCodeStore, "update").resolves();
    check = sinon.stub();
    sinon.stub(thunks, "Thunk_cloudCheck").returns(check as never);
  });

  afterEach(() => sinon.restore());

  it("saves the sent code after a good sendCode and nothing after a bad one", async () => {
    const send = sinon.stub(client, "CloudBackupClient_sendCode").resolves({ ok: true, value: undefined });
    expect((await run("sendCode"))[0].type).to.equal("sent");
    expect(sentCode.firstCall.args[0]()).to.include({ email: "bear@example.com" });
    sentCode.resetHistory();
    send.resolves({ ok: false, error: "Rate limited" });
    expect(await run("sendCode")).to.deep.equal([{ type: "failed", error: "Rate limited" }]);
    expect(sentCode.callCount).to.equal(0);
  });

  it("clears the sent code and runs the cloud check only after a good verify", async () => {
    const verify = sinon.stub(client, "CloudBackupClient_verify").resolves({ ok: false, error: "Wrong code" });
    expect(await run("verify")).to.deep.equal([{ type: "failed", error: "Wrong code" }]);
    expect(sentCode.callCount + check.callCount).to.equal(0);
    verify.resolves({ ok: true, value: {} as never });
    expect(await run("verify")).to.deep.equal([{ type: "verified" }]);
    expect(sentCode.firstCall.args[0]()).to.deep.equal({});
    expect(check.callCount).to.equal(1);
  });

  it("marks the code redeemed for the returned user only after a good redeem", async () => {
    const authed = sinon.stub(supabase, "SupabaseClient_authed").resolves({ ok: false, error: "Code used" });
    const mark = sinon.stub(planClient, "AccountPlanClient_markCodeRedeemed").resolves();
    expect(await run("redeem")).to.deep.equal([{ type: "failed", error: "Code used" }]);
    expect(JSON.parse(authed.firstCall.args[1]!.body as string)).to.deep.equal({ p_code: "" });
    expect(mark.callCount).to.equal(0);
    authed.resolves({ ok: true, value: { userId: "u1" } } as never);
    expect(await run("redeem", { proCode: "BEAR-1" })).to.deep.equal([{ type: "redeemed" }]);
    expect(authed.secondCall.args[0]).to.equal("/rest/v1/rpc/redeem_pro_code");
    expect(JSON.parse(authed.secondCall.args[1]!.body as string)).to.deep.equal({ p_code: "BEAR-1" });
    expect(mark.firstCall.args[0]).to.equal("u1");
  });

  it("turns a thrown error into a failed event, with a fixed text for a non-Error", async () => {
    const signOut = sinon.stub(client, "CloudBackupClient_signOut").rejects(new Error("boom"));
    expect(await run("signOut")).to.deep.equal([{ type: "failed", error: "boom" }]);
    signOut.callsFake(() => Promise.reject("boom"));
    expect(await run("signOut")).to.deep.equal([{ type: "failed", error: "Cloud backup failed" }]);
  });
});
