import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { AiCaps_defaults, IAiCapsRefusal } from "../src/models/aiCaps";
import { IAccountPlanState } from "../src/models/accountPlan";
import * as actionSheet from "../src/utils/actionSheet";
import * as indexeddb from "../src/utils/indexeddb";
import * as purchases from "../src/utils/purchases";
import { AccountPlanStore } from "../src/utils/accountPlanClient";
import { PlusOfferClient_onRefusal, PlusOfferStore } from "../src/utils/plusOfferClient";
import { CloudStore } from "../src/utils/supabaseClient";

const dayRefusal: IAiCapsRefusal = {
  reason: "day",
  plan: "free",
  used: { day: 3, week: 3 },
  caps: { day: 3, week: 10 },
};

async function titleShown(plan: IAccountPlanState): Promise<string> {
  await AccountPlanStore.replace(plan);
  const shown = new Promise<string>((resolve) => {
    sinon.stub(actionSheet, "ActionSheet_show").callsFake((options, callback) => {
      resolve(options.title ?? "");
      callback(undefined);
    });
  });
  PlusOfferClient_onRefusal(dayRefusal);
  return shown;
}

describe("PlusOfferClient_onRefusal", () => {
  beforeEach(async () => {
    sinon.stub(indexeddb, "IndexedDBUtils_get").resolves(undefined);
    sinon.stub(indexeddb, "IndexedDBUtils_setMany").resolves();
    sinon.stub(purchases, "Purchases_isAvailable").returns(true);
    sinon.stub(CloudStore, "load").resolves({ session: { userId: "a" } } as never);
    await PlusOfferStore.replace({});
  });
  afterEach(() => sinon.restore());

  it("quotes the beBEAR+ numbers the server sent", async () => {
    const plan: IAccountPlanState = {
      status: "known",
      userId: "a",
      plan: "free",
      aiCaps: { ...AiCaps_defaults, plusDay: 40, plusWeek: 200 },
    };
    expect(await titleShown(plan)).to.equal("You used today's 3 AI uses. beBEAR+ gives 40 a day.");
  });

  it("quotes today's numbers when the store holds no server caps", async () => {
    const plan: IAccountPlanState = { status: "known", userId: "a", plan: "free" };
    expect(await titleShown(plan)).to.equal("You used today's 3 AI uses. beBEAR+ gives 30 a day.");
  });
});
