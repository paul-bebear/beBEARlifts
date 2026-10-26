import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { ProgressPhotoCloud_restore, ProgressPhotoCloud_sync } from "../src/utils/progressPhotoCloud";
import * as cloud from "../src/utils/cloudBackupClient";
import { CloudStore } from "../src/utils/supabaseClient";
import { ProgressPhotoStore } from "../src/utils/progressPhotoStore";
import { ICloudState } from "../src/models/cloudBackup";
import { IProgressPhotoLog, ProgressPhotos_parse } from "../src/models/progressPhotos";

const session = { email: "a@b.co", userId: "u1", accessToken: "a", refreshToken: "r", expiresAt: 1 };
const jpeg = (base64: string): string => `data:image/jpeg;base64,${base64}`;

describe("ProgressPhotoCloud", () => {
  let state: ICloudState;
  let photos: IProgressPhotoLog;
  let put: sinon.SinonStub;
  let remove: sinon.SinonStub;
  let get: sinon.SinonStub;

  beforeEach(() => {
    state = { version: 1, session, ownerUserId: "u1" };
    photos = ProgressPhotos_parse({
      photos: [
        { id: 1, timestamp: 1, dataUrl: jpeg("AAAA") },
        { id: 2, timestamp: 2, dataUrl: jpeg("BBBB") },
      ],
    });
    sinon.stub(CloudStore, "load").callsFake(async () => state);
    sinon.stub(CloudStore, "update").callsFake(async (fn) => {
      state = fn(state);
    });
    sinon.stub(ProgressPhotoStore, "load").callsFake(async () => photos);
    sinon.stub(ProgressPhotoStore, "loadStrict").callsFake(async () => photos);
    sinon.stub(ProgressPhotoStore, "update").callsFake(async (fn) => {
      photos = fn(photos);
    });
    put = sinon.stub(cloud, "CloudBackupClient_putPhoto").resolves({ ok: true, value: undefined });
    remove = sinon.stub(cloud, "CloudBackupClient_deletePhoto").resolves({ ok: true, value: undefined });
    get = sinon.stub(cloud, "CloudBackupClient_getPhoto").resolves({ ok: true, value: undefined });
  });
  afterEach(() => sinon.restore());

  it("uploads each new photo once and deletes a photo removed from the phone", async () => {
    state.uploadedPhotos = [2, 9];
    await ProgressPhotoCloud_sync();
    expect(remove.calledOnceWithExactly("u1", 9)).to.equal(true);
    expect(put.callCount).to.equal(1);
    expect(put.firstCall.args.slice(0, 2)).to.deep.equal(["u1", 1]);
    expect(Array.from(put.firstCall.args[2] as Uint8Array)).to.deep.equal([0, 0, 0]);
    expect(state.uploadedPhotos).to.deep.equal([2, 1]);
    await ProgressPhotoCloud_sync();
    expect(put.callCount).to.equal(1);
  });

  it("uploads nothing for an account that does not own this phone's data", async () => {
    state = { version: 1, session, ownerUserId: "u0" };
    await ProgressPhotoCloud_sync();
    expect(put.called).to.equal(false);
  });

  it("stops at a failed upload and keeps the photo for the next try", async () => {
    put.resolves({ ok: false, error: "No connection" });
    expect(await ProgressPhotoCloud_sync()).to.deep.equal({ ok: false, error: "No connection" });
    expect(state.uploadedPhotos).to.equal(undefined);
  });

  it("downloads the photos the phone lacks during a restore", async () => {
    get.withArgs("u1", 3).resolves({ ok: true, value: new Uint8Array([0, 0, 0]) });
    await ProgressPhotoCloud_restore([
      { id: 3, timestamp: 3 },
      { id: 2, timestamp: 2 },
      { id: 4, timestamp: 4 },
    ]);
    expect(get.callCount).to.equal(2);
    expect(photos.photos.map((p) => p.id)).to.deep.equal([3, 2, 1]);
    expect(photos.photos[0]).to.deep.equal({ id: 3, timestamp: 3, dataUrl: jpeg("AAAA") });
    expect(state.uploadedPhotos).to.deep.equal([3]);
  });
});
