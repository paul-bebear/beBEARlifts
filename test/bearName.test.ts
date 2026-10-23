import "mocha";
import { expect } from "chai";
import { BearName_initialForm, BearName_isSaved, BearName_sheet, BearName_title } from "../src/models/bearName";
import { Friends_profileSavedMessage, IProfile } from "../src/models/friends";
import { FriendsForm_reduce, IFriendsForm } from "../src/models/friendsForm";

const bruno: IProfile = { userId: "u1", handle: "bruno", displayName: "Bruno B" };

function typed(form: IFriendsForm, value: string): IFriendsForm {
  return FriendsForm_reduce(form, { type: "handle", value });
}

describe("BearName", () => {
  it("titles My bear with the handle, or My bear without one", () => {
    expect(BearName_title(bruno)).to.equal("bruno");
    expect(BearName_title(undefined)).to.equal("My bear");
  });

  it("starts the form from the saved handle and name", () => {
    const form = BearName_initialForm(bruno);
    expect([form.handle, form.displayName]).to.deep.equal(["bruno", "Bruno B"]);
    const blank = BearName_initialForm(undefined);
    expect([blank.handle, blank.displayName]).to.deep.equal(["", ""]);
  });

  it("asks a signed-out user to sign in", () => {
    const sheet = BearName_sheet({ hasLoaded: false, form: BearName_initialForm(undefined) });
    expect([sheet.stage, sheet.heading, sheet.hint, sheet.canSave]).to.deep.equal([
      "signedOut",
      "Name your bear",
      "Sign in to name your bear",
      false,
    ]);
  });

  it("waits for the profile to load, and shows a load error", () => {
    const form = BearName_initialForm(undefined);
    expect(BearName_sheet({ userId: "u1", hasLoaded: false, form }).stage).to.equal("loading");
    const failed = FriendsForm_reduce(form, { type: "failed", error: "No connection" });
    const sheet = BearName_sheet({ userId: "u1", hasLoaded: false, form: failed });
    expect([sheet.stage, sheet.hint, sheet.canSave]).to.deep.equal(["failed", "No connection", false]);
  });

  it("blocks a bad handle with the friends message", () => {
    const form = typed(BearName_initialForm(undefined), "bo");
    const sheet = BearName_sheet({ userId: "u1", hasLoaded: true, form });
    expect([sheet.fieldError, sheet.canSave]).to.deep.equal(["A handle has 3 to 20 characters.", false]);
    const spaced = BearName_sheet({ userId: "u1", hasLoaded: true, form: typed(form, "big bear") });
    expect(spaced.fieldError).to.equal("Use only letters, numbers and _ in a handle.");
  });

  it("allows saving a good new handle, with or without the @", () => {
    const blank = BearName_initialForm(undefined);
    expect(BearName_sheet({ userId: "u1", hasLoaded: true, form: typed(blank, "Bruno_2") }).canSave).to.equal(true);
    expect(BearName_sheet({ userId: "u1", hasLoaded: true, form: typed(blank, "@bruno") }).canSave).to.equal(true);
    expect(BearName_sheet({ userId: "u1", hasLoaded: true, form: blank }).canSave).to.equal(false);
    expect(BearName_sheet({ userId: "u1", hasLoaded: true, form: blank }).fieldError).to.equal(undefined);
  });

  it("does not offer Save for the handle the user already has", () => {
    const form = BearName_initialForm(bruno);
    const same = BearName_sheet({ userId: "u1", hasLoaded: true, me: bruno, form });
    expect([same.canSave, same.isNew]).to.deep.equal([false, false]);
    expect(BearName_sheet({ userId: "u1", hasLoaded: true, me: bruno, form: typed(form, "@Bruno") }).canSave).to.equal(
      false
    );
    expect(BearName_sheet({ userId: "u1", hasLoaded: true, me: bruno, form: typed(form, "bruno2") }).canSave).to.equal(
      true
    );
  });

  it("saves the new handle and keeps the display name", () => {
    const form = FriendsForm_reduce(typed(BearName_initialForm(bruno), "bruno2"), {
      type: "saveProfile",
      isNew: false,
    });
    expect(form.command).to.deep.equal({
      type: "saveProfile",
      handle: "bruno2",
      displayName: "Bruno B",
      isNew: false,
    });
    const sheet = BearName_sheet({ userId: "u1", hasLoaded: true, me: bruno, form });
    expect([sheet.canSave, sheet.saveLabel]).to.deep.equal([false, "Saving…"]);
  });

  it("uses the handle as the name of a new profile", () => {
    const form = FriendsForm_reduce(typed(BearName_initialForm(undefined), "bruno"), {
      type: "saveProfile",
      isNew: true,
    });
    expect(form.command).to.deep.equal({ type: "saveProfile", handle: "bruno", displayName: "bruno", isNew: true });
  });

  it("shows a taken handle in plain words and lets the user retry", () => {
    const saving = FriendsForm_reduce(typed(BearName_initialForm(bruno), "taken"), {
      type: "saveProfile",
      isNew: false,
    });
    const failed = FriendsForm_reduce(saving, { type: "failed", error: "Someone already has that handle." });
    const sheet = BearName_sheet({ userId: "u1", hasLoaded: true, me: bruno, form: failed });
    expect([sheet.fieldError, sheet.canSave]).to.deep.equal(["Someone already has that handle.", true]);
    const edited = typed(failed, "taken2");
    expect(BearName_sheet({ userId: "u1", hasLoaded: true, me: bruno, form: edited }).fieldError).to.equal(undefined);
  });

  it("reports a save once the profile saved message arrives", () => {
    const saving = FriendsForm_reduce(typed(BearName_initialForm(bruno), "bruno2"), {
      type: "saveProfile",
      isNew: false,
    });
    expect(BearName_isSaved(saving)).to.equal(false);
    const done = FriendsForm_reduce(saving, { type: "done", message: Friends_profileSavedMessage });
    expect(BearName_isSaved(done)).to.equal(true);
    expect(BearName_isSaved(FriendsForm_reduce(done, { type: "handle", value: "x" }))).to.equal(false);
  });
});
