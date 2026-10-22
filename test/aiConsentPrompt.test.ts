import "mocha";
import { expect } from "chai";
import { AiConsentPrompt_answer, AiConsentPrompt_show, AiConsentPrompt_subscribe } from "../src/utils/aiConsentPrompt";

describe("AI consent sheet", () => {
  it("opens the mounted sheet and resolves with the button the user taps", async () => {
    const seen: boolean[] = [];
    const unsubscribe = AiConsentPrompt_subscribe((open) => seen.push(open));
    const allowed = AiConsentPrompt_show();
    expect(seen).to.deep.equal([false, true]);
    AiConsentPrompt_answer(true);
    expect(await allowed).to.equal(true);
    expect(seen).to.deep.equal([false, true, false]);
    const declined = AiConsentPrompt_show();
    AiConsentPrompt_answer(false);
    expect(await declined).to.equal(false);
    unsubscribe();
  });
  it("answers no without a mounted sheet or a browser window", async () => {
    expect(await AiConsentPrompt_show()).to.equal(false);
  });
});
