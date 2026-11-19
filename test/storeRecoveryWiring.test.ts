import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import * as cloudThunks from "../src/ducks/cloudBackupThunks";
import * as dialogs from "../src/utils/dialog";
import * as indexeddb from "../src/utils/indexeddb";
import { JsonStore_create, JsonStore_setRecovery } from "../src/utils/jsonStore";
import { StoreRecoveryWiring_start } from "../src/utils/storeRecoveryWiring";
import { CloudStore } from "../src/utils/supabaseClient";

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe("StoreRecoveryWiring_start", () => {
  let saved: Map<string, string | undefined>;
  let choice: sinon.SinonStub;
  let restoreThunk: sinon.SinonStub;
  let dispatch: sinon.SinonStub;

  beforeEach(() => {
    saved = new Map([["bebear_notes", "{broken"]]);
    sinon.stub(indexeddb, "IndexedDBUtils_get").callsFake(async (key) => saved.get(key));
    sinon.stub(indexeddb, "IndexedDBUtils_setMany").callsFake(async (pairs) => {
      for (const [key, value] of pairs) {
        saved.set(key, value);
      }
    });
    sinon.stub(dialogs, "Dialog_alert");
    choice = sinon.stub(dialogs, "Dialog_choice");
    restoreThunk = sinon.stub(cloudThunks, "Thunk_cloudRestore").returns("thunk" as never);
    dispatch = sinon.stub();
  });

  afterEach(() => {
    JsonStore_setRecovery(undefined);
    sinon.restore();
  });

  function brokenStore(): ReturnType<typeof JsonStore_create<string>> {
    return JsonStore_create<string>(
      "bebear_notes",
      (raw) => String(raw),
      () => ""
    );
  }

  it("offers the cloud restore to a signed-in user and dispatches the latest restore", async () => {
    sinon.stub(CloudStore, "load").resolves({ session: { userId: "a" } } as never);
    choice.resolves(0);
    StoreRecoveryWiring_start(dispatch);
    await brokenStore().load();
    await flush();
    expect(choice.args[0][2]).to.deep.equal(["Restore from cloud", "Start this log again"]);
    expect(restoreThunk.args).to.deep.equal([["latest"]]);
    expect(dispatch.args).to.deep.equal([["thunk"]]);
  });

  it("offers no cloud restore to a signed-out user", async () => {
    sinon.stub(CloudStore, "load").resolves({ session: undefined } as never);
    choice.resolves(2);
    StoreRecoveryWiring_start(dispatch);
    await brokenStore().load();
    await flush();
    expect(choice.args[0][2]).to.deep.equal(["Start this log again", "Not now"]);
    expect(dispatch.callCount).to.equal(0);
  });

  it("offers no cloud restore once the returned function has run", async () => {
    sinon.stub(CloudStore, "load").resolves({ session: { userId: "a" } } as never);
    choice.resolves(undefined);
    const stop = StoreRecoveryWiring_start(dispatch);
    stop();
    await brokenStore().load();
    await flush();
    expect(choice.args[0][2]).to.deep.equal(["Start this log again", "Not now"]);
    expect(dispatch.callCount).to.equal(0);
  });
});
