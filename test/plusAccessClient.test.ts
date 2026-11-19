import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { IAccountPlanState } from "../src/models/accountPlan";
import { ICloudState } from "../src/models/cloudBackup";
import { AccountPlanStore } from "../src/utils/accountPlanClient";
import { PlusAccessClient_allows } from "../src/utils/plusAccessClient";
import { CloudStore } from "../src/utils/supabaseClient";

const plus = { status: "known", userId: "u1", plan: "plus" } as IAccountPlanState;
const signedIn = (userId: string) => ({ version: 1, session: { userId } }) as unknown as ICloudState;

describe("PlusAccessClient_allows", () => {
  afterEach(() => sinon.restore());

  it("allows a free feature and gates a Plus feature on the signed-in user's plan", async () => {
    const plan = sinon.stub(AccountPlanStore, "load").resolves({ status: "unknown" } as IAccountPlanState);
    const cloud = sinon.stub(CloudStore, "load").resolves({ version: 1 } as ICloudState);
    expect(await PlusAccessClient_allows("plates")).to.equal(true);
    expect(plan.callCount + cloud.callCount).to.equal(0);
    expect(await PlusAccessClient_allows("ai")).to.equal(false);
    plan.resolves(plus);
    expect(await PlusAccessClient_allows("api")).to.equal(false);
    cloud.resolves(signedIn("u2"));
    expect(await PlusAccessClient_allows("weekInsights")).to.equal(false);
    cloud.resolves(signedIn("u1"));
    expect(await PlusAccessClient_allows("ai")).to.equal(true);
  });
});
