import "mocha";
import { expect } from "chai";
import {
  CloudBackupForm_empty,
  CloudBackupForm_parseSentCode,
  CloudBackupForm_redeemedMessage,
  CloudBackupForm_resendLabel,
  CloudBackupForm_resendRemainingMs,
  CloudBackupForm_reduce as reduce,
} from "../src/models/cloudBackupForm";

function emailStep(): ReturnType<typeof CloudBackupForm_empty> {
  return reduce(CloudBackupForm_empty(), { type: "email", value: " paul@example.com " });
}

describe("CloudBackupForm", () => {
  it("validates before sending, trims the email and blocks duplicate requests", () => {
    const invalid = reduce(CloudBackupForm_empty(), { type: "request", operation: "sendCode" });
    expect(invalid.error).to.equal("Enter a valid email address.");
    expect(invalid.command).to.equal(undefined);
    const pending = reduce(emailStep(), { type: "request", operation: "sendCode" });
    expect(pending.command?.email).to.equal("paul@example.com");
    expect(reduce(pending, { type: "request", operation: "sendCode" })).to.equal(pending);
    expect(reduce(pending, { type: "email", value: "other@example.com" })).to.equal(pending);
  });

  it("shows client errors and permits retrying the same code", () => {
    let state = reduce(emailStep(), { type: "sent" });
    state = reduce(state, { type: "request", operation: "verify" });
    expect(state.command).to.equal(undefined);
    expect(state.error).to.include("6 to 10 digit");
    state = reduce(state, { type: "code", value: " 123456 " });
    state = reduce(state, { type: "request", operation: "verify" });
    expect(state.command?.code).to.equal("123456");
    state = reduce(state, { type: "failed", error: "Token has expired or is invalid" });
    expect(state.step).to.equal("code");
    expect(state.error).to.equal("Token has expired or is invalid");
    state = reduce(state, { type: "request", operation: "verify" });
    expect(state.error).to.equal(undefined);
    expect(state.command?.operation).to.equal("verify");
  });

  it("signs in, opens the older copies and restores the one tapped", () => {
    let state = reduce(emailStep(), { type: "verified" });
    expect(state.step).to.equal("signedIn");
    expect(state.code).to.equal("");
    expect(state.command).to.equal(undefined);
    state = reduce(state, { type: "toggleOlderCopies" });
    expect(state.showOlderCopies).to.equal(true);
    state = reduce(state, { type: "request", operation: "restore", copy: "day-3" });
    expect(state.command?.operation).to.equal("restore");
    expect(state.command?.copy).to.equal("day-3");
    expect(reduce(state, { type: "toggleOlderCopies" })).to.equal(state);
    state = reduce(state, { type: "done" });
    expect(state.showOlderCopies).to.equal(false);
    expect(reduce(state, { type: "request", operation: "keepPhone" }).command?.operation).to.equal("keepPhone");
  });

  it("resends the code and can change the email", () => {
    let state = reduce(emailStep(), { type: "sent" });
    state = reduce(state, { type: "code", value: "123456" });
    state = reduce(state, { type: "request", operation: "sendCode" });
    expect(state.command?.operation).to.equal("sendCode");
    state = reduce(state, { type: "sent" });
    expect(state.code).to.equal("");
    state = reduce(state, { type: "changeEmail" });
    expect(state.step).to.equal("email");
    expect(state.email).to.equal(" paul@example.com ");
  });

  it("loads a saved session and clears the form on sign-out", () => {
    let state = reduce(CloudBackupForm_empty(), { type: "session", email: "paul@example.com" });
    expect(state.step).to.equal("signedIn");
    state = reduce(state, { type: "request", operation: "backup" });
    expect(state.command?.operation).to.equal("backup");
    state = reduce(state, { type: "done", message: "Backup saved." });
    expect(state.command).to.equal(undefined);
    expect(state.message).to.equal("Backup saved.");
    state = reduce(state, { type: "request", operation: "signOut" });
    expect(state.command?.operation).to.equal("signOut");
    expect(reduce(state, { type: "signedOut" })).to.deep.equal(CloudBackupForm_empty());
  });

  it("deletes the account only after DELETE is typed, and keeps the dialog open on failure", () => {
    const signedIn = reduce(CloudBackupForm_empty(), { type: "session", email: "paul@example.com" });
    expect(reduce(signedIn, { type: "request", operation: "deleteAccount" })).to.equal(signedIn);
    let state = reduce(signedIn, { type: "deleteOpen" });
    expect(state.deleteText).to.equal("");
    state = reduce(state, { type: "deleteText", value: "delete" });
    state = reduce(state, { type: "request", operation: "deleteAccount" });
    expect(state.command).to.equal(undefined);
    expect(state.error).to.equal("Type DELETE to confirm.");
    state = reduce(state, { type: "deleteText", value: "DELETE" });
    expect(state.error).to.equal(undefined);
    state = reduce(state, { type: "request", operation: "deleteAccount" });
    expect(state.command?.operation).to.equal("deleteAccount");
    expect(reduce(state, { type: "deleteCancel" })).to.equal(state);
    state = reduce(state, { type: "failed", error: "No connection" });
    expect(state.deleteText).to.equal("DELETE");
    expect(state.error).to.equal("No connection");
    state = reduce(state, { type: "request", operation: "deleteAccount" });
    state = reduce(state, { type: "session", email: undefined });
    expect(state.command?.operation).to.equal("deleteAccount");
    state = reduce(state, { type: "deleted" });
    expect(state.step).to.equal("email");
    expect(state.deleteText).to.equal(undefined);
    expect(state.message).to.include("still on this phone");
    expect(reduce(state, { type: "session", email: undefined })).to.equal(state);
  });

  it("opens the delete dialog only while signed in and closes it on cancel", () => {
    const signedOut = CloudBackupForm_empty();
    expect(reduce(signedOut, { type: "deleteOpen" })).to.equal(signedOut);
    expect(reduce(signedOut, { type: "deleteText", value: "DELETE" })).to.equal(signedOut);
    const signedIn = reduce(signedOut, { type: "session", email: "paul@example.com" });
    const open = reduce(reduce(signedIn, { type: "deleteOpen" }), { type: "deleteText", value: "DEL" });
    expect(reduce(open, { type: "deleteCancel" }).deleteText).to.equal(undefined);
  });

  it("rejects account operations while signed out and code requests while signed in", () => {
    const signedOut = CloudBackupForm_empty();
    expect(reduce(signedOut, { type: "request", operation: "restore" })).to.equal(signedOut);
    const signedIn = reduce(emailStep(), { type: "session", email: "paul@example.com" });
    expect(reduce(signedIn, { type: "request", operation: "sendCode" })).to.equal(signedIn);
  });

  it("reopens the code step after a restart when the code is under 60 minutes old", () => {
    const sentAt = 1_000_000;
    const sent = CloudBackupForm_parseSentCode({ email: "paul@example.com", sentAt });
    const resumed = reduce(CloudBackupForm_empty(), { type: "resume", sent, now: sentAt + 50 * 60 * 1000 });
    expect(resumed).to.include({ step: "code", email: "paul@example.com", code: "", sentAt });
    const stale = reduce(CloudBackupForm_empty(), { type: "resume", sent, now: sentAt + 61 * 60 * 1000 });
    expect(stale.step).to.equal("email");
    const typing = reduce(CloudBackupForm_empty(), { type: "email", value: "other@example.com" });
    expect(reduce(typing, { type: "resume", sent, now: sentAt })).to.equal(typing);
    expect(CloudBackupForm_parseSentCode({ email: "x", sentAt: "soon" })).to.deep.equal({});
  });

  it("counts down 3 minutes before a new code and refuses an early resend", () => {
    const sentAt = 5_000_000;
    expect(CloudBackupForm_resendLabel(undefined, sentAt)).to.equal("Send a new code");
    expect(CloudBackupForm_resendLabel(sentAt, sentAt)).to.equal("Send a new code in 3:00");
    expect(CloudBackupForm_resendLabel(sentAt, sentAt + 19_000)).to.equal("Send a new code in 2:41");
    expect(CloudBackupForm_resendLabel(sentAt, sentAt + 179_001)).to.equal("Send a new code in 0:01");
    expect(CloudBackupForm_resendLabel(sentAt, sentAt + 180_000)).to.equal("Send a new code");
    expect(CloudBackupForm_resendRemainingMs(sentAt, sentAt - 10_000)).to.equal(180_000);
    const sent = reduce(emailStep(), { type: "sent", now: sentAt });
    expect(sent.sentAt).to.equal(sentAt);
    const early = reduce(sent, { type: "request", operation: "sendCode", now: sentAt + 60_000 });
    expect(early).to.equal(sent);
    const later = reduce(sent, { type: "request", operation: "sendCode", now: sentAt + 180_000 });
    expect(later.command?.operation).to.equal("sendCode");
    expect(reduce(later, { type: "sent", now: sentAt + 181_000 }).sentAt).to.equal(sentAt + 181_000);
  });

  it("redeems a trimmed beBEAR+ code only when signed in", () => {
    expect(reduce(CloudBackupForm_empty(), { type: "request", operation: "redeem" }).command).to.equal(undefined);
    let state = reduce(CloudBackupForm_empty(), { type: "session", email: "paul@example.com" });
    state = reduce(state, { type: "request", operation: "redeem" });
    expect(state.error).to.equal("Enter the beBEAR+ code.");
    state = reduce(state, { type: "proCode", value: " BEAR-1 " });
    state = reduce(state, { type: "request", operation: "redeem" });
    expect(state.command).to.deep.include({ operation: "redeem", proCode: "BEAR-1" });
    const refused = reduce(state, { type: "failed", error: "That code is not valid or was already used." });
    expect(refused.error).to.equal("That code is not valid or was already used.");
    expect(refused.proCode).to.equal(" BEAR-1 ");
    state = reduce(state, { type: "redeemed" });
    expect(state).to.deep.include({
      proCode: "",
      command: undefined,
      message: CloudBackupForm_redeemedMessage,
    });
  });
});
