import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import {
  RunSensors_isAvailable,
  RunSensors_keepScreenOn,
  RunSensors_platform,
  RunSensors_requestPermission,
  RunSensors_watch,
} from "../src/utils/runSensors";

describe("RunSensors", () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");

  function install(name: string, value: unknown): void {
    Object.defineProperty(globalThis, name, { configurable: true, value });
  }

  afterEach(() => {
    for (const [name, descriptor] of [
      ["navigator", originalNavigator],
      ["document", originalDocument],
    ] as const) {
      if (descriptor != null) {
        Object.defineProperty(globalThis, name, descriptor);
      } else {
        Reflect.deleteProperty(globalThis, name);
      }
    }
    sinon.restore();
  });

  it("maps GPS positions, reports errors, and clears the watch", () => {
    const watchPosition = sinon.stub().returns(42);
    const clearWatch = sinon.spy();
    install("navigator", { geolocation: { watchPosition, clearWatch } });
    const point = sinon.spy();
    const error = sinon.spy();
    expect(RunSensors_isAvailable()).to.equal(true);
    const stop = RunSensors_watch(point, error);
    const [success, failure, options] = watchPosition.firstCall.args;
    expect(options).to.deep.equal({ enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    success({ timestamp: 1000, coords: { latitude: 40, longitude: -3, accuracy: 5, altitude: 100 } });
    expect(point.firstCall.args[0]).to.deep.equal({ t: 1000, lat: 40, lon: -3, acc: 5, alt: 100 });
    success({ timestamp: 2000, coords: { latitude: 40, longitude: -3, accuracy: 6, altitude: null } });
    expect(point.secondCall.args[0]).not.to.have.property("alt");
    failure({ code: 1 });
    expect(error.calledWith(1)).to.equal(true);
    stop();
    expect(clearWatch.calledWith(42)).to.equal(true);
    success({ timestamp: 3000, coords: { latitude: 40, longitude: -3, accuracy: 5, altitude: null } });
    failure({ code: 3 });
    expect(point.callCount).to.equal(2);
    expect(error.callCount).to.equal(1);
  });

  it("leaves the location prompt to the browser", async () => {
    expect(RunSensors_platform).to.equal("web");
    expect(await RunSensors_requestPermission()).to.equal("granted");
  });

  it("handles platforms without GPS or wake lock", () => {
    install("navigator", {});
    const error = sinon.spy();
    const awake = sinon.spy();
    expect(RunSensors_isAvailable()).to.equal(false);
    RunSensors_watch(sinon.spy(), error)();
    RunSensors_keepScreenOn(awake)();
    expect(error.calledWith(2)).to.equal(true);
    expect(awake.calledWith(false)).to.equal(true);
  });

  it("reacquires a released wake lock when visible and removes its listener on stop", async () => {
    const page = Object.assign(new EventTarget(), { visibilityState: "visible" });
    const lock = Object.assign(new EventTarget(), { released: false, release: sinon.stub().resolves() });
    const request = sinon.stub().resolves(lock);
    install("document", page);
    install("navigator", { wakeLock: { request } });
    const awake = sinon.spy();
    const stop = RunSensors_keepScreenOn(awake);
    await Promise.resolve();
    expect(request.calledWith("screen")).to.equal(true);
    expect(awake.calledWith(true)).to.equal(true);
    lock.released = true;
    lock.dispatchEvent(new Event("release"));
    expect(awake.lastCall.args).to.deep.equal([false]);
    page.visibilityState = "hidden";
    page.dispatchEvent(new Event("visibilitychange"));
    expect(request.callCount).to.equal(1);
    page.visibilityState = "visible";
    page.dispatchEvent(new Event("visibilitychange"));
    await Promise.resolve();
    expect(request.callCount).to.equal(2);
    stop();
    expect(lock.release.callCount).to.equal(1);
    page.dispatchEvent(new Event("visibilitychange"));
    expect(request.callCount).to.equal(2);
  });

  it("releases a wake lock that resolves after cleanup", async () => {
    let resolve: (lock: unknown) => void = () => {};
    const pending = new Promise((done) => {
      resolve = done;
    });
    install("document", Object.assign(new EventTarget(), { visibilityState: "visible" }));
    install("navigator", { wakeLock: { request: () => pending } });
    const release = sinon.stub().resolves();
    const stop = RunSensors_keepScreenOn();
    stop();
    resolve({ release });
    await Promise.resolve();
    expect(release.calledOnce).to.equal(true);
  });

  it("reports denied wake lock requests without throwing", async () => {
    install("document", Object.assign(new EventTarget(), { visibilityState: "visible" }));
    install("navigator", { wakeLock: { request: sinon.stub().rejects(new Error("Denied")) } });
    const awake = sinon.spy();
    const stop = RunSensors_keepScreenOn(awake);
    await Promise.resolve();
    await Promise.resolve();
    expect(awake.calledWith(false)).to.equal(true);
    stop();
  });
});
