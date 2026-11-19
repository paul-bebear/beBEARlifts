import "mocha";
import { expect } from "chai";
import { ShareCardImage_cleanup, ShareCardImage_prepareAhead, ShareCardImage_share } from "../src/utils/shareCardImage";

const holder = globalThis as unknown as Record<string, unknown>;
const pngDataUrl = "data:image/png;base64,aGVsbG8=";

function setNavigator(value: unknown): void {
  Object.defineProperty(globalThis, "navigator", { value, configurable: true, writable: true });
}

describe("ShareCardImage on the web", () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  afterEach(() => {
    if (originalNavigator != null) {
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    }
    delete holder.document;
  });
  it("prepares the images before the tap", () => {
    expect(ShareCardImage_prepareAhead).to.equal(true);
  });
  it("shares one file as baseName.png with the decoded bytes", async () => {
    let shared: File[] = [];
    setNavigator({
      canShare: () => true,
      share: async (data: { files: File[] }) => {
        shared = data.files;
      },
    });
    expect(await ShareCardImage_share([pngDataUrl], "workout")).to.equal("shared");
    expect(shared.map((f) => f.name)).to.deep.equal(["workout.png"]);
    expect(shared[0].type).to.equal("image/png");
    expect(await shared[0].text()).to.equal("hello");
  });
  it("numbers the file names when there are several cards", async () => {
    let shared: File[] = [];
    setNavigator({
      canShare: () => true,
      share: async (data: { files: File[] }) => {
        shared = data.files;
      },
    });
    await ShareCardImage_share([pngDataUrl, pngDataUrl], "week");
    expect(shared.map((f) => f.name)).to.deep.equal(["week-1.png", "week-2.png"]);
  });
  it("passes cancelled and refused through", async () => {
    for (const name of ["AbortError", "NotAllowedError"]) {
      setNavigator({
        canShare: () => true,
        share: async () => {
          throw Object.assign(new Error("x"), { name });
        },
      });
      const expected = name === "AbortError" ? "cancelled" : "refused";
      expect(await ShareCardImage_share([pngDataUrl], "workout")).to.equal(expected);
    }
  });
  it("downloads each file when the browser cannot share files", async () => {
    setNavigator({});
    const downloads: string[] = [];
    holder.document = {
      body: { appendChild: () => undefined },
      createElement: () => {
        const link = {
          href: "",
          download: "",
          click: () => downloads.push(link.download),
          remove: () => undefined,
        };
        return link;
      },
    };
    const realCreate = (URL as unknown as Record<string, unknown>).createObjectURL;
    const realRevoke = (URL as unknown as Record<string, unknown>).revokeObjectURL;
    URL.createObjectURL = () => "blob:fake";
    URL.revokeObjectURL = () => undefined;
    const realTimeout = globalThis.setTimeout;
    (globalThis as unknown as Record<string, unknown>).setTimeout = () => 0;
    try {
      expect(await ShareCardImage_share([pngDataUrl, pngDataUrl], "week")).to.equal("shared");
    } finally {
      globalThis.setTimeout = realTimeout;
      (URL as unknown as Record<string, unknown>).createObjectURL = realCreate;
      (URL as unknown as Record<string, unknown>).revokeObjectURL = realRevoke;
    }
    expect(downloads).to.deep.equal(["week-1.png", "week-2.png"]);
  });
  it("cleanup does nothing", async () => {
    expect(await ShareCardImage_cleanup([pngDataUrl])).to.equal(undefined);
  });
});
