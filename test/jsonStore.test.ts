import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { JsonStore_create } from "../src/utils/jsonStore";
import * as indexeddb from "../src/utils/indexeddb";
import * as dialogs from "../src/utils/dialog";
import { FoodLogStore_load, FoodLogStore_update } from "../src/utils/foodLogStore";
import { MusicStore_load, MusicStore_update } from "../src/utils/musicStore";
import { BodyScanStore_load, BodyScanStore_update } from "../src/utils/bodyScanStore";
import { WarmupStore_load, WarmupStore_update } from "../src/utils/warmupStore";

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("Expected a rejection");
}

describe("JsonStore", () => {
  let saved: Map<string, string | undefined>;
  let get: sinon.SinonStub;
  let persist: sinon.SinonStub;
  let alert: sinon.SinonStub;

  beforeEach(() => {
    saved = new Map();
    get = sinon.stub(indexeddb, "IndexedDBUtils_get").callsFake(async (key) => saved.get(key));
    persist = sinon.stub().callsFake(async (key: string, value?: string) => {
      saved.set(key, value);
    });
    sinon.stub(indexeddb, "IndexedDBUtils_setMany").callsFake(async (pairs) => {
      for (const [key, value] of pairs) {
        saved.set(key, value);
      }
    });
    alert = sinon.stub(dialogs, "Dialog_alert");
  });
  afterEach(() => sinon.restore());

  function counter(key: string): ReturnType<typeof JsonStore_create<number>> {
    return JsonStore_create(
      key,
      (raw) => (typeof raw === "number" ? raw : 0),
      () => 0,
      persist
    );
  }

  it("reports failed writes, keeps the saved value and permits retrying", async () => {
    saved.set("runs-test", "5");
    persist.onFirstCall().rejects(new Error("Quota exceeded"));
    const store = counter("runs-test");
    await store.load();
    const listener = sinon.spy();
    store.subscribe(listener);

    const error = await rejection(store.update(() => 1));
    expect((error as Error).message).to.equal("Quota exceeded");
    expect(store.get()).to.equal(5);
    expect(await store.load()).to.equal(5);
    expect(listener.called).to.equal(false);
    expect(saved.get("runs-test")).to.equal("5");

    await store.update((value) => value + 1);
    expect(persist.secondCall.args).to.deep.equal(["runs-test", "6"]);
    expect(await store.load()).to.equal(6);
    expect(listener.calledOnceWithExactly(6)).to.equal(true);
  });

  it("writes concurrent increments in order, then clears the final draft", async () => {
    const store = JsonStore_create<number | undefined>(
      "draft-test",
      (raw) => (typeof raw === "number" ? raw : undefined),
      () => undefined,
      persist
    );
    await Promise.all([
      store.update((value) => (value ?? 0) + 1),
      store.update((value) => (value ?? 0) + 1),
      store.update(() => undefined),
    ]);
    expect(persist.getCalls().map((call) => call.args[1])).to.deep.equal(["1", "2", undefined]);
    expect(store.get()).to.equal(undefined);
  });

  it("waits for persistence before publishing a value", async () => {
    const store = counter("pending");
    await store.load();
    let finish: () => void = () => undefined;
    persist.callsFake(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    const listener = sinon.spy();
    store.subscribe(listener);
    const update = store.update(() => 1);
    await new Promise((resolve) => setImmediate(resolve));
    expect(store.get()).to.equal(0);
    expect(listener.called).to.equal(false);
    finish();
    await update;
    expect(store.get()).to.equal(1);
    expect(listener.calledOnceWithExactly(1)).to.equal(true);
  });

  it("re-reads another tab's changes before each update", async () => {
    const first = counter("shared");
    const second = counter("shared");
    await Promise.all([first.load(), second.load()]);
    await first.update((value) => value + 1);
    await second.update((value) => value + 1);
    await first.update((value) => value + 1);
    expect(saved.get("shared")).to.equal("3");
    expect(first.get()).to.equal(3);
  });

  it("rejects an update after a failed read and retries on the next call", async () => {
    const store = counter("unavailable");
    get.rejects(new Error("Read aborted"));
    expect(await store.load()).to.equal(0);
    const transform = sinon.spy((value: number) => value + 1);
    const error = await rejection(store.update(transform));
    expect((error as Error).message).to.equal("Could not read saved data");
    expect(transform.called).to.equal(false);
    expect(persist.called).to.equal(false);
    expect(alert.calledOnceWithExactly("Could not read saved data")).to.equal(true);

    saved.set("unavailable", "8");
    get.callsFake(async (key) => saved.get(key));
    await store.update(transform);
    expect(saved.get("unavailable")).to.equal("9");
  });

  it("retries a failed load without caching the empty value", async () => {
    const store = counter("retry-load");
    get.onFirstCall().rejects(new Error("Read aborted"));
    expect(await store.load()).to.equal(0);
    saved.set("retry-load", "8");
    expect(await store.load()).to.equal(8);
  });

  it("preserves malformed JSON and refuses to replace it until a read succeeds", async () => {
    const raw = '{"entries":[';
    saved.set("broken", raw);
    const store = counter("broken");
    await store.load();
    expect(saved.get("broken_unreadable")).to.equal(raw);
    expect(saved.get("broken")).to.equal(raw);
    expect(((await rejection(store.update(() => 1))) as Error).message).to.equal("Could not read saved data");
    expect(saved.get("broken")).to.equal(raw);
    expect(persist.getCalls().every((call) => call.args[0] === "broken_unreadable")).to.equal(true);

    saved.set("broken", "4");
    await store.update((value) => value + 1);
    expect(saved.get("broken")).to.equal("5");
    expect(saved.get("broken_unreadable")).to.equal(raw);
  });

  it("does not write the original key if preserving malformed JSON fails", async () => {
    saved.set("broken", "{");
    persist.rejects(new Error("Quota exceeded"));
    const store = counter("broken");
    expect(((await rejection(store.update(() => 1))) as Error).message).to.equal("Could not read saved data");
    expect(persist.calledOnceWithExactly("broken_unreadable", "{")).to.equal(true);
    expect(saved.get("broken")).to.equal("{");
    expect(store.get()).to.equal(0);
  });

  it("rejects a parser failure before applying the update", async () => {
    saved.set("invalid", "{}");
    const store = JsonStore_create(
      "invalid",
      () => {
        throw new Error("Invalid data");
      },
      () => 0,
      persist
    );
    const transform = sinon.spy(() => 1);
    expect(((await rejection(store.update(transform))) as Error).message).to.equal("Could not read saved data");
    expect(transform.called).to.equal(false);
    expect(persist.called).to.equal(false);
    expect(saved.get("invalid")).to.equal("{}");
  });

  it("refreshes subscribers without writing when the transform returns the saved value", async () => {
    saved.set("noop", "1");
    const store = counter("noop");
    await store.load();
    const listener = sinon.spy();
    const unsubscribe = store.subscribe(listener);
    saved.set("noop", "2");
    await store.update((value) => value);
    expect(store.get()).to.equal(2);
    expect(listener.calledOnceWithExactly(2)).to.equal(true);
    expect(persist.called).to.equal(false);
    unsubscribe();
    await store.update((value) => value + 1);
    expect(listener.calledOnce).to.equal(true);
  });

  it("uses rejecting transactions by default and reports a save error", async () => {
    const transaction = indexeddb.IndexedDBUtils_setMany as sinon.SinonStub;
    transaction.onFirstCall().rejects(new Error("Quota exceeded"));
    const store = JsonStore_create("default", Number, () => 0);
    expect(((await rejection(store.update(() => 1))) as Error).message).to.equal("Quota exceeded");
    expect(store.get()).to.equal(0);
    expect(alert.calledOnceWithExactly("Could not save data. The phone may be out of space. Try again.")).to.equal(
      true
    );
    await store.update(() => 2);
    expect(transaction.secondCall.args).to.deep.equal([[["default", "2"]]]);
    expect(store.get()).to.equal(2);
  });

  describe("strict IndexedDB reads", () => {
    const originalWindow = (global as { window?: unknown }).window;

    afterEach(() => {
      (global as { window?: unknown }).window = originalWindow;
    });

    function database(abort: boolean): sinon.SinonSpy {
      const request = Object.assign(new EventTarget(), { result: ["7"] });
      const transaction = Object.assign(new EventTarget(), {
        error: new Error("Transaction aborted"),
        objectStore: () => ({
          getAll: () => {
            queueMicrotask(() => {
              request.dispatchEvent(new Event("success"));
              transaction.dispatchEvent(new Event(abort ? "abort" : "complete"));
            });
            return request;
          },
        }),
      });
      const close = sinon.spy();
      const connection = Object.assign(new EventTarget(), { result: { transaction: () => transaction, close } });
      (global as { window?: unknown }).window = {
        indexedDB: {
          open: () => {
            queueMicrotask(() => connection.dispatchEvent(new Event("success")));
            return connection;
          },
        },
      };
      get.restore();
      return close;
    }

    it("waits for transaction completion on a successful read", async () => {
      const close = database(false);
      const store = counter("strict");
      expect(await store.load()).to.equal(7);
      expect(close.calledOnce).to.equal(true);
    });

    it("rejects an aborted read even after the request returned a value", async () => {
      const close = database(true);
      const store = counter("strict");
      expect(((await rejection(store.update(() => 1))) as Error).message).to.equal("Could not read saved data");
      expect(persist.called).to.equal(false);
      expect(store.get()).to.equal(0);
      expect(close.calledOnce).to.equal(true);
    });

    it("keeps the legacy read's error fallback", async () => {
      database(true);
      sinon.stub(console, "error");
      expect(await indexeddb.IndexedDBUtils_get("legacy")).to.equal(undefined);
    });

    it("rejects initialization failures instead of leaving the read pending", async function () {
      this.timeout(1000);
      get.restore();
      (global as { window?: unknown }).window = {
        indexedDB: {
          open: () => {
            throw new Error("Database unavailable");
          },
        },
      };
      const store = counter("unavailable");
      expect(((await rejection(store.update(() => 1))) as Error).message).to.equal("Could not read saved data");
      expect(persist.called).to.equal(false);
    });
  });

  const migrated = [
    { key: "bebear_foodlog", load: FoodLogStore_load, write: () => FoodLogStore_update((log) => ({ ...log })) },
    { key: "bebear_music", load: MusicStore_load, write: () => MusicStore_update((log) => ({ ...log })) },
    { key: "bebear_bodyscans", load: BodyScanStore_load, write: () => BodyScanStore_update((log) => ({ ...log })) },
    { key: "bebear_warmups", load: WarmupStore_load, write: () => WarmupStore_update((log) => ({ ...log })) },
  ];
  for (const store of migrated) {
    it(`keeps ${store.key}'s API and recovers after a failed write`, async () => {
      const transaction = indexeddb.IndexedDBUtils_setMany as sinon.SinonStub;
      transaction.onFirstCall().rejects(new Error("Quota exceeded"));
      await rejection(store.write());
      expect(saved.has(store.key)).to.equal(false);
      await store.write();
      expect(transaction.secondCall.args[0][0][0]).to.equal(store.key);
      expect(await store.load()).to.deep.equal(JSON.parse(saved.get(store.key)!));
    });
  }
});
