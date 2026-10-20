import "mocha";
import { expect } from "chai";
import { IFeedDraft } from "../src/models/feedPost";
import { ISocialEvent, ISocialSheet, SocialSignIn_errorText, SocialSignIn_next } from "../src/models/socialSignIn";

const draft: IFeedDraft = {
  kind: "meal",
  clientKey: "meal:2026-10-20:lunch",
  payload: {
    v: 1,
    day: "2026-10-20",
    meal: "lunch",
    items: [],
    totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  },
};
const share = { kind: "share" as const, draft };
const me = { userId: "u1", username: "anna" };

function run(events: ISocialEvent[], start: ISocialSheet = { step: "closed" }): ReturnType<typeof SocialSignIn_next> {
  let result = { sheet: start, effects: [] } as ReturnType<typeof SocialSignIn_next>;
  for (const event of events) {
    result = SocialSignIn_next(result.sheet, event);
  }
  return result;
}

describe("SocialSignIn_next", () => {
  it("checks the session and profile every time it opens", () => {
    const opened = run([{ type: "open", intent: share }]);
    expect(opened.sheet.step).to.equal("checking");
    expect(opened.effects).to.deep.equal([{ type: "loadMe" }]);
    const again = run([{ type: "open", intent: share }], { step: "done", intent: share, message: "x" });
    expect(again.effects).to.deep.equal([{ type: "loadMe" }]);
  });

  it("goes to account when signed out, username when there is no profile, compose when both exist", () => {
    expect(run([{ type: "open", intent: share }, { type: "loaded", me: undefined }]).sheet).to.deep.include({
      step: "account",
      mode: "signUp",
    });
    expect(run([{ type: "open", intent: share }, { type: "loaded", me: { userId: "u1" } }]).sheet.step).to.equal(
      "username"
    );
    expect(run([{ type: "open", intent: share }, { type: "loaded", me }]).sheet).to.deep.include({
      step: "compose",
      audience: "friends",
      comment: "",
    });
    expect(run([{ type: "open", intent: { kind: "join" } }, { type: "loaded", me }]).sheet.step).to.equal("done");
  });

  it("shows a retry after the SDK fails to load, and keeps the draft", () => {
    const failed = run([
      { type: "open", intent: share },
      { type: "loadFailed", message: "No connection" },
    ]);
    expect(failed.sheet).to.deep.include({ step: "failed", intent: share });
    expect(SocialSignIn_next(failed.sheet, { type: "retry" }).effects).to.deep.equal([{ type: "loadMe" }]);
  });

  it("signs up, then asks for a username, then composes the share", () => {
    const signedOut = run([
      { type: "open", intent: share },
      { type: "loaded", me: undefined },
    ]);
    const submitted = SocialSignIn_next(signedOut.sheet, {
      type: "submitAccount",
      email: " a@b.co ",
      password: "secret1",
    });
    expect(submitted.effects).to.deep.equal([{ type: "signUp", email: "a@b.co", password: "secret1" }]);
    expect(JSON.stringify(submitted.sheet)).to.not.contain("secret1");
    const signedUp = SocialSignIn_next(submitted.sheet, {
      type: "accountDone",
      result: { ok: true, value: { userId: "u1" } },
    });
    expect(signedUp.sheet.step).to.equal("username");
    expect(signedUp.effects).to.deep.equal([{ type: "authChanged" }]);
    const named = SocialSignIn_next(signedUp.sheet, { type: "submitUsername", username: " Anna " });
    expect(named.effects).to.deep.equal([{ type: "createProfile", username: "anna" }]);
    const done = SocialSignIn_next(named.sheet, { type: "usernameDone", result: { ok: true, value: undefined } });
    expect(done.sheet.step).to.equal("compose");
  });

  it("switches to sign in and checks the inputs before any request", () => {
    const signIn = run([
      { type: "open", intent: share },
      { type: "loaded", me: undefined },
      { type: "switchMode" },
    ]);
    expect(signIn.sheet).to.deep.include({ step: "account", mode: "signIn" });
    const badEmail = SocialSignIn_next(signIn.sheet, { type: "submitAccount", email: "anna", password: "secret1" });
    expect(badEmail.effects).to.deep.equal([]);
    expect(badEmail.sheet).to.deep.include({ error: "Check the email address." });
    const shortPassword = SocialSignIn_next(signIn.sheet, { type: "submitAccount", email: "a@b.co", password: "123" });
    expect(shortPassword.effects).to.deep.equal([]);
  });

  it("shows a taken username and lets the user try again", () => {
    const sent = run([
      { type: "open", intent: { kind: "join" } },
      { type: "loaded", me: { userId: "u1" } },
      { type: "submitUsername", username: "anna" },
      { type: "usernameDone", result: { ok: false, message: "That username is taken." } },
    ]);
    expect(sent.sheet).to.deep.include({ step: "username", isBusy: false, error: "That username is taken." });
    expect(run([{ type: "submitUsername", username: "a!" }], sent.sheet).effects).to.deep.equal([]);
  });

  it("shares once even when Share is tapped twice, then reports the key", () => {
    const compose = run([
      { type: "open", intent: share },
      { type: "loaded", me },
      { type: "setAudience", audience: "public" },
      { type: "setComment", comment: "  Big lunch  " },
    ]);
    const first = SocialSignIn_next(compose.sheet, { type: "submitShare" });
    expect(first.effects).to.deep.equal([{ type: "share", draft, audience: "public", comment: "Big lunch" }]);
    expect(SocialSignIn_next(first.sheet, { type: "submitShare" }).effects).to.deep.equal([]);
    const done = SocialSignIn_next(first.sheet, { type: "shareDone", result: { ok: true, value: undefined } });
    expect(done.sheet).to.deep.include({ step: "done", message: "Shared with everyone." });
    expect(done.effects).to.deep.equal([{ type: "shared", clientKey: draft.clientKey }]);
  });

  it("keeps the draft after a failed share and clears it on close", () => {
    const failed = run([
      { type: "open", intent: share },
      { type: "loaded", me },
      { type: "submitShare" },
      { type: "shareDone", result: { ok: false, message: "No connection" } },
    ]);
    expect(failed.sheet).to.deep.include({ step: "compose", isBusy: false, error: "No connection", intent: share });
    expect(SocialSignIn_next(failed.sheet, { type: "close" }).sheet).to.deep.equal({ step: "closed" });
  });

  it("ignores a result that arrives after the sheet moved on", () => {
    const reopened = run([
      { type: "open", intent: share },
      { type: "loaded", me },
      { type: "submitShare" },
      { type: "close" },
      { type: "open", intent: share },
      { type: "loaded", me },
    ]);
    const late = SocialSignIn_next(reopened.sheet, { type: "shareDone", result: { ok: true, value: undefined } });
    expect(late.sheet).to.equal(reopened.sheet);
    expect(late.effects).to.deep.equal([]);
  });

  it("caps the comment at 500 characters", () => {
    const compose = run([
      { type: "open", intent: share },
      { type: "loaded", me },
      { type: "setComment", comment: "x".repeat(600) },
    ]);
    expect(compose.sheet.step === "compose" ? compose.sheet.comment.length : 0).to.equal(500);
  });
});

describe("SocialSignIn_errorText", () => {
  it("turns Supabase errors into plain text", () => {
    expect(SocialSignIn_errorText({ code: "23505", message: "duplicate key" })).to.equal("That username is taken.");
    expect(SocialSignIn_errorText({ code: "invalid_credentials" })).to.equal("Wrong email or password.");
    expect(SocialSignIn_errorText({ code: "user_already_exists" })).to.equal(
      "That email already has an account. Sign in instead."
    );
    expect(SocialSignIn_errorText({ status: 429 })).to.equal("Too many tries. Wait a minute and try again.");
    expect(SocialSignIn_errorText({ message: "TypeError: Failed to fetch" })).to.equal(
      "No connection. Try again with a signal."
    );
    expect(SocialSignIn_errorText({})).to.equal("Something went wrong. Try again.");
  });
});
