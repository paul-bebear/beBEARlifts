import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { ISetClipVideoEffects, SetClipVideo_save, SetClipVideo_share } from "../src/utils/setClipVideo";
import { ISetClip } from "../src/models/setClips";

describe("SetClipVideo_share", () => {
  const file = { name: "set.mov", size: 20000000, type: "video/quicktime" } as File;

  it("opens the share sheet synchronously before any metadata work", async () => {
    const share = sinon.stub().resolves();
    const canShare = sinon.stub().returns(true);
    const result = SetClipVideo_share(file, { share, canShare });
    expect(share.calledOnceWithExactly({ files: [file] })).to.equal(true);
    expect(canShare.calledOnceWithExactly({ files: [file] })).to.equal(true);
    expect(await result).to.equal("share");
  });

  it("requests a download when file sharing is unavailable", async () => {
    const share = sinon.stub().resolves();
    expect(await SetClipVideo_share(file, { share, canShare: () => false })).to.equal("download");
    expect(share.called).to.equal(false);
    expect(await SetClipVideo_share(file, {} as Navigator)).to.equal("download");
  });

  it("does not mark or download a cancelled share", async () => {
    const share = sinon.stub().rejects({ name: "AbortError" });
    expect(await SetClipVideo_share(file, { share, canShare: () => true })).to.equal(undefined);
  });

  it("reports a share failure so the user can retry with a fresh tap", async () => {
    const error = new Error("Permission denied");
    try {
      await SetClipVideo_share(file, { share: sinon.stub().rejects(error), canShare: () => true });
      expect.fail("Expected a failure");
    } catch (caught) {
      expect(caught).to.equal(error);
    }
  });
});

describe("SetClipVideo_save", () => {
  const file = { name: "set.mov", size: 20000000, type: "video/quicktime" } as File;
  const target = { workoutId: 1234, setId: "set-1", exerciseId: "squat" };
  const thumbnail = "data:image/jpeg;base64,YWJj";

  function effects(savedVia: ISetClip["savedVia"] | undefined): ISetClipVideoEffects {
    return {
      share: sinon.stub().resolves(savedVia),
      download: sinon.spy(),
      frame: sinon.stub().resolves({ duration: 5, thumbnail }),
      put: sinon.stub().resolves(),
      now: () => 2000,
    };
  }

  it("stores metadata before reading the frame and never stores the File", async () => {
    const calls = effects("share");
    await SetClipVideo_save(file, target, calls);
    sinon.assert.callOrder(
      calls.share as sinon.SinonStub,
      calls.put as sinon.SinonStub,
      calls.frame as sinon.SinonStub
    );
    const writes = (calls.put as sinon.SinonStub).args.map(([value]) => value);
    expect(writes).to.deep.equal([
      { ...target, timestamp: 2000, size: file.size, savedVia: "share" },
      { ...target, timestamp: 2000, size: file.size, savedVia: "share", duration: 5, thumbnail },
    ]);
    sinon.assert.notCalled(calls.download as sinon.SinonSpy);
  });

  it("downloads unsupported files before recording the download", async () => {
    const calls = effects("download");
    await SetClipVideo_save(file, target, calls);
    sinon.assert.callOrder(calls.download as sinon.SinonSpy, calls.put as sinon.SinonStub);
    expect((calls.put as sinon.SinonStub).firstCall.args[0].savedVia).to.equal("download");
  });

  it("leaves storage and frame decoding untouched after cancellation", async () => {
    const calls = effects(undefined);
    await SetClipVideo_save(file, target, calls);
    sinon.assert.notCalled(calls.put as sinon.SinonStub);
    sinon.assert.notCalled(calls.frame as sinon.SinonStub);
    sinon.assert.notCalled(calls.download as sinon.SinonSpy);
  });

  it("keeps the camera mark when the video cannot be decoded", async () => {
    const calls = effects("share");
    (calls.frame as sinon.SinonStub).rejects(new Error("Unsupported video codec"));
    await SetClipVideo_save(file, target, calls);
    expect((calls.put as sinon.SinonStub).firstCall.args[0]).to.deep.equal({
      ...target,
      timestamp: 2000,
      size: file.size,
      savedVia: "share",
    });
  });

  it("writes nothing when sharing fails", async () => {
    const calls = effects("share");
    const error = new Error("Requires a fresh tap");
    (calls.share as sinon.SinonStub).rejects(error);
    try {
      await SetClipVideo_save(file, target, calls);
      expect.fail("Expected a failure");
    } catch (caught) {
      expect(caught).to.equal(error);
    }
    sinon.assert.notCalled(calls.put as sinon.SinonStub);
  });
});
