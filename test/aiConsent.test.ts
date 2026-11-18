import "mocha";
import { expect } from "chai";
import {
  AiConsent_decide,
  AiConsent_disclosure,
  AiConsent_empty,
  AiConsent_isFoodAi,
  AiConsent_maySend,
  AiConsent_parse,
  AiConsent_shouldAsk,
  AiConsent_showFeatures,
} from "../src/models/aiConsent";

describe("AI consent", () => {
  it("sends only after an explicit, current-version allowance", () => {
    expect(AiConsent_maySend(AiConsent_empty())).to.equal(false);
    expect(AiConsent_maySend(AiConsent_decide(false, 123))).to.equal(false);
    expect(AiConsent_maySend(AiConsent_decide(true, 123))).to.equal(true);
    for (const raw of [
      null,
      "allowed",
      [],
      { version: 2, choice: "allowed", decidedAt: 123 },
      { version: 1, choice: "allowed" },
      { version: 1, choice: true, decidedAt: 123 },
      { version: 1, choice: "allowed", decidedAt: NaN },
      { version: 1, choice: "allowed", decidedAt: -1 },
    ]) {
      expect(AiConsent_maySend(AiConsent_parse(raw))).to.equal(false);
    }
  });

  it("round trips decisions and hides AI controls after Not now", () => {
    for (const allowed of [true, false]) {
      const consent = AiConsent_decide(allowed, 123);
      expect(AiConsent_parse(JSON.parse(JSON.stringify(consent)))).to.deep.equal(consent);
      expect(AiConsent_showFeatures(consent)).to.equal(allowed);
    }
    expect(AiConsent_showFeatures(AiConsent_empty())).to.equal(true);
    expect(["photo", "describe", "label"].every(AiConsent_isFoodAi)).to.equal(true);
    expect(["barcode", "quick", "browse"].some(AiConsent_isFoodAi)).to.equal(false);
  });

  it("asks on a tap until allowed, in the background only once, and always from Settings", () => {
    const unknown = AiConsent_empty();
    const declined = AiConsent_decide(false, 123);
    const allowed = AiConsent_decide(true, 123);
    expect([unknown, declined, allowed].map((c) => AiConsent_shouldAsk(c, "tap"))).to.deep.equal([true, true, false]);
    expect([unknown, declined, allowed].map((c) => AiConsent_shouldAsk(c, "auto"))).to.deep.equal([true, false, false]);
    expect([unknown, declined, allowed].map((c) => AiConsent_shouldAsk(c, "settings"))).to.deep.equal([
      true,
      true,
      true,
    ]);
  });
});

describe("AI consent disclosure", () => {
  it("names the provider, the gateway and that Anthropic may keep requests", () => {
    expect(AiConsent_disclosure).to.contain("Anthropic");
    expect(AiConsent_disclosure).to.contain("Vercel's AI Gateway");
    expect(AiConsent_disclosure).to.contain("may keep them for a limited time");
    expect(AiConsent_disclosure).not.to.contain("not kept");
  });
});
