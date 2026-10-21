import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { JsonStore_create } from "../src/utils/jsonStore";
import * as indexeddb from "../src/utils/indexeddb";

describe("JsonStore", () => {
  beforeEach(() => sinon.stub(indexeddb, "IndexedDBUtils_get").resolves("0"));
  afterEach(() => sinon.restore());

  it("reports failed writes and permits retrying the next snapshot", async () => {
    const persist = sinon.stub().onFirstCall().rejects(new Error("Quota exceeded"));
    persist.onSecondCall().resolves();
    const store = JsonStore_create("runs-test", Number, () => 0, persist);
    let error: unknown;
    try {
      await store.update(() => 1);
    } catch (caught) {
      error = caught;
    }
    expect((error as Error).message).to.equal("Quota exceeded");
    await store.update(() => 2);
    expect(persist.secondCall.args).to.deep.equal(["runs-test", "2"]);
    expect(await store.load()).to.equal(2);
  });

  it("writes concurrent snapshots in order and clears the final draft", async () => {
    const persist = sinon.stub().resolves();
    const store = JsonStore_create<number | undefined>("draft-test", Number, () => undefined, persist);
    await Promise.all([store.update(() => 1), store.update(() => 2), store.update(() => undefined)]);
    expect(persist.getCalls().map((call) => call.args[1])).to.deep.equal(["1", "2", undefined]);
  });
});
