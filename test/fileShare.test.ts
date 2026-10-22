import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { FileShare_download, FileShare_share } from "../src/utils/fileShare";

describe("FileShare_share", () => {
  const file = { name: "card.png", size: 10, type: "image/png" } as File;

  it("calls share before its first await and reports a finished share", async () => {
    const share = sinon.stub().resolves();
    const pending = FileShare_share([file], { share, canShare: () => true });
    expect(share.calledOnceWithExactly({ files: [file] })).to.equal(true);
    expect(await pending).to.equal("shared");
  });

  it("reports unavailable without calling share when the files cannot be shared", async () => {
    const share = sinon.stub().resolves();
    expect(await FileShare_share([file], { share, canShare: () => false })).to.equal("unavailable");
    expect(await FileShare_share([file], { share })).to.equal("unavailable");
    expect(await FileShare_share([file], { canShare: () => true })).to.equal("unavailable");
    expect(share.called).to.equal(false);
  });

  it("maps a closed sheet to cancelled and a blocked sheet to refused", async () => {
    const aborted = sinon.stub().rejects({ name: "AbortError" });
    const blocked = sinon.stub().rejects({ name: "NotAllowedError" });
    expect(await FileShare_share([file], { share: aborted, canShare: () => true })).to.equal("cancelled");
    expect(await FileShare_share([file], { share: blocked, canShare: () => true })).to.equal("refused");
  });

  it("rethrows any other share failure", async () => {
    const error = new Error("Data error");
    try {
      await FileShare_share([file], { share: sinon.stub().rejects(error), canShare: () => true });
      expect.fail("Expected a failure");
    } catch (caught) {
      expect(caught).to.equal(error);
    }
  });
});

describe("FileShare_download", () => {
  const global = globalThis as { document?: unknown };

  afterEach(() => {
    sinon.restore();
    delete global.document;
  });

  it("clicks a link named after the file and revokes the object URL 60 seconds later", () => {
    const clock = sinon.useFakeTimers();
    const link = { href: "", download: "", click: sinon.spy(), remove: sinon.spy() };
    const appendChild = sinon.spy();
    global.document = { createElement: () => link, body: { appendChild } };
    sinon.stub(URL, "createObjectURL").returns("blob:clip");
    const revoke = sinon.stub(URL, "revokeObjectURL");

    FileShare_download({ name: "set.mov" } as File);

    expect(link).to.include({ href: "blob:clip", download: "set.mov" });
    sinon.assert.callOrder(appendChild, link.click, link.remove);
    clock.tick(59 * 1000);
    expect(revoke.called).to.equal(false);
    clock.tick(1000);
    expect(revoke.calledOnceWithExactly("blob:clip")).to.equal(true);
  });
});
