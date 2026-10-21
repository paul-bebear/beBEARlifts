import "mocha";
import { expect } from "chai";
import { CloudBackupForm_empty, CloudBackupForm_reduce as reduce } from "../src/models/cloudBackupForm";

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

  it("offers a found backup only after sign-in with no local history", () => {
    let state = reduce(emailStep(), { type: "verified", hasHistory: false });
    expect(state.step).to.equal("signedIn");
    expect(state.code).to.equal("");
    expect(state.command?.operation).to.equal("findBackup");
    state = reduce(state, { type: "found", exists: true });
    expect(state.offerRestore).to.equal(true);
    expect(state.command).to.equal(undefined);
    expect(reduce(emailStep(), { type: "verified", hasHistory: true }).command).to.equal(undefined);
    expect(reduce(state, { type: "found", exists: false }).offerRestore).to.equal(false);
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
});
