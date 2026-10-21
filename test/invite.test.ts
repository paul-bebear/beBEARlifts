import "mocha";
import { expect } from "chai";
import { Invite_fromUrl, Invite_parseHandle, Invite_surface, Invite_defaultHandle } from "../src/models/invite";

describe("Invites", () => {
  it("derives a valid initial friend handle from an account ID", () => {
    const handle = Invite_defaultHandle("12AB5678-9012-3456-7890-123456789012");
    expect(handle).to.equal("lifter_12ab567890123");
    expect(Invite_parseHandle(handle)).to.equal(handle);
  });
  it("accepts only exact lowercase handles with 3 to 20 characters", () => {
    expect(Invite_parseHandle("paul_123")).to.equal("paul_123");
    for (const raw of [undefined, {}, "ab", "a".repeat(21), "Paul", " paul", "<script>", "a-b"]) {
      expect(Invite_parseHandle(raw)).to.equal(undefined);
    }
  });
  it("reads one URL parameter and rejects ambiguous or malformed links", () => {
    expect(Invite_fromUrl("https://lifts.paulbebear.com/app/?invite=paul_123")).to.equal("paul_123");
    expect(Invite_fromUrl("https://host/app/?invite=paul&invite=someone")).to.equal(undefined);
    expect(Invite_fromUrl("https://host/app/?invite=%3Cscript%3E")).to.equal(undefined);
    expect(Invite_fromUrl("broken")).to.equal(undefined);
  });
  it("shows the installation guide before either a new or existing invited user opens the app", () => {
    expect(
      Invite_surface({ offline: true, standalone: false, handle: "paul", historyCount: 4, programCount: 1 })
    ).to.equal("guide");
    expect(
      Invite_surface({ offline: true, standalone: true, handle: "paul", historyCount: 0, programCount: 0 })
    ).to.equal("chat");
  });
  it("keeps returning users and online builds in the app", () => {
    expect(Invite_surface({ offline: true, standalone: true, historyCount: 1, programCount: 0 })).to.equal("app");
    expect(Invite_surface({ offline: true, standalone: true, historyCount: 0, programCount: 1 })).to.equal("app");
    expect(
      Invite_surface({ offline: false, standalone: false, handle: "paul", historyCount: 0, programCount: 0 })
    ).to.equal("app");
  });
});
