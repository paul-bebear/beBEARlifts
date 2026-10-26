import "mocha";
import { expect } from "chai";
import { StoreRecovery_choice, StoreRecovery_prompt } from "../src/models/storeRecovery";

describe("StoreRecovery", () => {
  it("offers a cloud restore only when signed in, and always names the saved copy", () => {
    const signedIn = StoreRecovery_prompt("bebear_foodlog", true);
    expect(signedIn.options).to.deep.equal(["Restore from cloud", "Start this log again"]);
    expect(signedIn.message).to.include("bebear_foodlog_unreadable");
    const signedOut = StoreRecovery_prompt("bebear_foodlog", false);
    expect(signedOut.options).to.deep.equal(["Start this log again", "Not now"]);
  });

  it("maps the tapped button to a choice and treats Cancel as later", () => {
    const prompt = StoreRecovery_prompt("bebear_notes", true);
    expect(StoreRecovery_choice(prompt, 0)).to.equal("restore");
    expect(StoreRecovery_choice(prompt, 1)).to.equal("reset");
    expect(StoreRecovery_choice(prompt, undefined)).to.equal("later");
    expect(StoreRecovery_choice(prompt, 7)).to.equal("later");
  });
});
