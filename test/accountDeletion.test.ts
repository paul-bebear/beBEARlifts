import "mocha";
import { expect } from "chai";
import {
  AccountDeletion_isConfirmed,
  AccountDeletion_result,
  AccountDeletion_signInMessage,
} from "../src/models/accountDeletion";

describe("AccountDeletion", () => {
  it("confirms only the exact word, ignoring outer spaces", () => {
    expect(AccountDeletion_isConfirmed("DELETE")).to.equal(true);
    expect(AccountDeletion_isConfirmed(" DELETE ")).to.equal(true);
    expect(AccountDeletion_isConfirmed("delete")).to.equal(false);
    expect(AccountDeletion_isConfirmed("DELET")).to.equal(false);
    expect(AccountDeletion_isConfirmed("")).to.equal(false);
  });

  it("succeeds only on a 200 that says the account is deleted", () => {
    expect(AccountDeletion_result(200, { deleted: true })).to.deep.equal({ ok: true });
    expect(AccountDeletion_result(200, {})).to.deep.equal({ ok: false, error: "The server returned 200." });
  });

  it("asks to sign in again on 401 and keeps the server's error text otherwise", () => {
    expect(AccountDeletion_result(401, { error: "anything" })).to.deep.equal({
      ok: false,
      error: AccountDeletion_signInMessage,
    });
    expect(AccountDeletion_result(502, { error: "Could not delete the account" })).to.deep.equal({
      ok: false,
      error: "Could not delete the account",
    });
    expect(AccountDeletion_result(404, undefined)).to.deep.equal({ ok: false, error: "The server returned 404." });
  });
});
