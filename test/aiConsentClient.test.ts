import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { AiConsent_decide, AiConsent_empty, IAiConsent } from "../src/models/aiConsent";
import { AiConsent_ensure, AiConsentStore } from "../src/utils/aiConsentClient";
import * as prompt from "../src/utils/aiConsentPrompt";

describe("AI consent persistence", () => {
  let stored: IAiConsent;
  let ask: sinon.SinonStub;
  beforeEach(() => {
    stored = AiConsent_empty();
    sinon.stub(AiConsentStore, "load").callsFake(async () => stored);
    sinon.stub(AiConsentStore, "update").callsFake(async (fn) => {
      stored = fn(stored);
    });
    ask = sinon.stub(prompt, "AiConsentPrompt_show");
  });
  afterEach(() => sinon.restore());

  it("waits for Allow and shares one prompt between concurrent requests", async () => {
    let answer!: (value: boolean) => void;
    ask.returns(
      new Promise<boolean>((resolve) => {
        answer = resolve;
      })
    );
    const first = AiConsent_ensure();
    const second = AiConsent_ensure();
    let resolved = false;
    first.then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(ask.callCount).to.equal(1);
    expect(resolved).to.equal(false);
    answer(true);
    expect(await Promise.all([first, second])).to.deep.equal([true, true]);
    expect(stored.choice).to.equal("allowed");
  });

  it("remembers Not now and permits a new choice only from Settings", async () => {
    ask.resolves(false);
    expect(await AiConsent_ensure()).to.equal(false);
    expect(await AiConsent_ensure()).to.equal(false);
    expect(ask.callCount).to.equal(1);
    ask.resolves(true);
    expect(await AiConsent_ensure(true)).to.equal(true);
    expect(stored.choice).to.equal("allowed");
    expect(await AiConsent_ensure()).to.equal(true);
    expect(ask.callCount).to.equal(2);
  });

  it("fails closed when saving Allow fails", async () => {
    ask.resolves(true);
    (AiConsentStore.update as sinon.SinonStub).rejects(new Error("disk full"));
    expect(await AiConsent_ensure()).to.equal(false);
  });

  it("lets Settings revoke an existing allowance", async () => {
    stored = AiConsent_decide(true, 123);
    ask.resolves(false);
    expect(await AiConsent_ensure(true)).to.equal(false);
    expect(stored.choice).to.equal("declined");
  });
});
