import "mocha";
import { expect } from "chai";
import { SupabaseClient_errorText } from "../src/utils/supabaseClient";

describe("Supabase error text", () => {
  it("explains a wrong or expired code and the resend limit in plain words", () => {
    expect(SupabaseClient_errorText("/auth/v1/verify", 403, { msg: "Token has expired or is invalid" })).to.equal(
      "That code is wrong or expired. Send a new code."
    );
    expect(SupabaseClient_errorText("/auth/v1/otp", 429, { msg: "For security purposes, you can only…" })).to.equal(
      "Wait a minute before asking for another code."
    );
    expect(SupabaseClient_errorText("/auth/v1/otp", 429, { msg: "Email rate limit exceeded" })).to.equal(
      "Too many sign-in emails went out this hour. Try again later."
    );
  });
  it("keeps database messages, such as the lookup limit, and hides the vendor name", () => {
    expect(
      SupabaseClient_errorText("/rest/v1/rpc/find_profile", 429, { message: "Daily profile lookup allowance reached" })
    ).to.equal("Daily profile lookup allowance reached");
    expect(SupabaseClient_errorText("/rest/v1/profiles", 500, { error: "Supabase is down" })).to.equal(
      "The server is down"
    );
    expect(SupabaseClient_errorText("/rest/v1/profiles", 502, undefined)).to.equal("The server returned 502.");
  });
});
