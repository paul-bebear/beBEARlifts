import "mocha";
import { expect } from "chai";
import { lg } from "../src/utils/posthog";

describe("lg", () => {
  const global = globalThis as { __OFFLINE_ONLY__?: boolean };

  afterEach(() => {
    delete global.__OFFLINE_ONLY__;
  });

  async function postedUserIds(): Promise<string[]> {
    const posted: string[] = [];
    const fakeService = {
      postEvent: async (e: { userId: string }) => {
        posted.push(e.userId);
      },
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    lg("some-action", undefined, fakeService, "someuser");
    await new Promise((r) => setTimeout(r, 0));
    return posted;
  }

  it("posts no event from the offline build", async () => {
    global.__OFFLINE_ONLY__ = true;
    expect(await postedUserIds()).to.eql([]);
  });

  it("posts the event from the online build", async () => {
    global.__OFFLINE_ONLY__ = false;
    expect(await postedUserIds()).to.eql(["someuser"]);
  });
});
