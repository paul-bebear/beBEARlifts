import "mocha";
import { expect } from "chai";
import { readFileSync } from "fs";
import { createRequire } from "module";
import { runInNewContext } from "vm";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import sinon from "sinon";
import { BundleNames_assetsInPage, BundleNames_hashedAsset } from "../src/utils/bundleNames";

describe("BundleNames", () => {
  it("lists the scripts and stylesheets the page loads", () => {
    const html = `
      <link rel="stylesheet" type="text/css" href="/app.0f3a9c21b4d5e6f7.css" />
      <link rel="preload" href="/images/front-muscles.svg" as="image" />
      <link rel="manifest" href="/manifest.webmanifest" />
      <script>window.Rollbar = {};</script>
      <script src="/vendors.1a2b3c4d5e6f7a8b.js"></script>
      <script src="/app.9e8d7c6b5a4f3e2d.js"></script>
      <script src="/app.9e8d7c6b5a4f3e2d.js"></script>`;
    expect(BundleNames_assetsInPage(html)).to.deep.equal([
      "/app.0f3a9c21b4d5e6f7.css",
      "/vendors.1a2b3c4d5e6f7a8b.js",
      "/app.9e8d7c6b5a4f3e2d.js",
    ]);
  });

  it("returns nothing for a page without bundles", () => {
    expect(BundleNames_assetsInPage("<html><body>offline</body></html>")).to.deep.equal([]);
  });

  it("matches only content-hashed bundle names", () => {
    expect(BundleNames_hashedAsset.test("/app.9e8d7c6b5a4f3e2d.js")).to.equal(true);
    expect(BundleNames_hashedAsset.test("/vendors.1a2b3c4d5e6f7a8b.js")).to.equal(true);
    expect(BundleNames_hashedAsset.test("/app.0f3a9c21b4d5e6f7.css")).to.equal(true);
    expect(BundleNames_hashedAsset.test("/app.js")).to.equal(false);
    expect(BundleNames_hashedAsset.test("/app.js.map")).to.equal(false);
    expect(BundleNames_hashedAsset.test("/main.9e8d7c6b5a4f3e2d.js")).to.equal(false);
  });
});

interface IWorkerEvent {
  waitUntil: (promise: Promise<unknown>) => void;
}

interface IWorker {
  cache: {
    add: sinon.SinonStub;
    addAll: sinon.SinonStub;
    match: sinon.SinonStub;
  };
  caches: {
    open: sinon.SinonStub;
    keys: sinon.SinonStub;
    delete: sinon.SinonStub;
  };
  dispatch: (type: string) => Promise<unknown[]>;
}

const bundles = ["/app.0f3a9c21b4d5e6f7.css", "/vendors.1a2b3c4d5e6f7a8b.js", "/app.9e8d7c6b5a4f3e2d.js"];
const workerPath = require.resolve("../src/webpushr-sw");
const workerCode = transpileModule(readFileSync(workerPath, "utf8"), {
  compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2015 },
}).outputText;

function serviceWorker(offlineOnly: boolean = true): IWorker {
  const html = `<link rel="stylesheet" href="${bundles[0]}"><script src="${bundles[1]}"></script><script src="${bundles[2]}"></script>`;
  const cache = {
    add: sinon.stub().resolves(),
    addAll: sinon.stub().resolves(),
    match: sinon.stub().resolves({ text: async () => html }),
  };
  const caches = {
    open: sinon.stub().resolves(cache),
    keys: sinon.stub().resolves(["liftosaur-sw-old", "liftosaur-sw-test"]),
    delete: sinon.stub().resolves(true),
  };
  const listeners = new Map<string, (event: IWorkerEvent) => void>();
  runInNewContext(workerCode, {
    exports: {},
    require: createRequire(workerPath),
    __COMMIT_HASH__: "test",
    __OFFLINE_ONLY__: offlineOnly,
    self: {
      addEventListener: (type: string, listener: (event: IWorkerEvent) => void) => listeners.set(type, listener),
    },
    caches,
    console: { log: () => undefined, warn: () => undefined },
  });
  return {
    cache,
    caches,
    dispatch: (type) => {
      const promises: Promise<unknown>[] = [];
      listeners.get(type)!({ waitUntil: (promise) => promises.push(promise) });
      expect(promises, `${type} must extend the event lifetime`).not.to.be.empty;
      return Promise.all(promises);
    },
  };
}

describe("Service worker precache", () => {
  it("requires the app page and every bundle before caching optional assets", async () => {
    const worker = serviceWorker();
    await worker.dispatch("install");
    expect(worker.caches.open.firstCall.args).to.deep.equal(["liftosaur-sw-test"]);
    expect(worker.cache.addAll.args).to.deep.equal([[["/app/"]], [bundles]]);
    sinon.assert.callOrder(worker.cache.addAll, worker.cache.match, worker.cache.add);
    expect(worker.cache.add.args.map(([url]) => url)).not.to.include("/app/");
  });

  it("rejects installation when the app page cannot be cached", async () => {
    const worker = serviceWorker();
    const failure = new Error("App page timed out");
    worker.cache.addAll.onFirstCall().rejects(failure);
    const result = await worker.dispatch("install").catch((error) => error);
    expect(result).to.equal(failure);
    sinon.assert.notCalled(worker.cache.add);
    sinon.assert.notCalled(worker.caches.delete);
  });

  it("rejects installation when the cached app page is missing", async () => {
    const worker = serviceWorker();
    worker.cache.match.resolves(undefined);
    const result = await worker.dispatch("install").catch((error: Error) => error);
    expect(result).to.have.property("message", "[Service Worker] App page missing from cache");
    sinon.assert.notCalled(worker.cache.add);
  });

  for (const bundle of bundles) {
    it(`rejects installation when ${bundle} fails, then allows a retry`, async () => {
      const worker = serviceWorker();
      const failure = new Error(`Could not cache ${bundle}`);
      worker.cache.addAll.callsFake(async (urls: string[]) => {
        if (urls.includes(bundle)) {
          throw failure;
        }
      });
      const result = await worker.dispatch("install").catch((error) => error);
      expect(result).to.equal(failure);
      sinon.assert.notCalled(worker.cache.add);
      sinon.assert.notCalled(worker.caches.delete);

      worker.cache.addAll.resolves();
      await worker.dispatch("install");
      sinon.assert.called(worker.cache.add);
    });
  }

  it("tolerates optional asset failures and omits legacy bundles in the offline build", async () => {
    const worker = serviceWorker();
    worker.cache.add.rejects(new Error("Optional asset missing"));
    await worker.dispatch("install");
    const optionalUrls = worker.cache.add.args.map(([url]) => url);
    expect(optionalUrls).to.include("/icons/icon192.png");
    expect(optionalUrls).to.include("/notification.m4r");
    expect(optionalUrls.filter((url: string) => /^\/(app|main|vendors)\.(js|css)\?/.test(url))).to.deep.equal([]);
  });

  it("keeps legacy bundles in the upstream build's optional cache list", async () => {
    const worker = serviceWorker(false);
    await worker.dispatch("install");
    expect(worker.cache.add.args.map(([url]) => url)).to.include.members([
      "/app.css?version=test",
      "/app.js?version=test",
      "/main.css?version=test",
      "/main.js?version=test",
      "/vendors.css?vendor=test",
      "/vendors.js?vendor=test",
    ]);
  });

  it("keeps activation alive until old caches are deleted and preserves the current cache", async () => {
    const worker = serviceWorker();
    let finishDelete: (deleted: boolean) => void = () => undefined;
    worker.caches.delete.returns(new Promise<boolean>((resolve) => (finishDelete = resolve)));
    let activated = false;
    const activation = worker.dispatch("activate").then(() => (activated = true));
    await new Promise((resolve) => setImmediate(resolve));
    expect(worker.caches.delete.args).to.deep.equal([["liftosaur-sw-old"]]);
    expect(activated).to.equal(false);
    finishDelete(true);
    await activation;
    expect(activated).to.equal(true);
  });
});
