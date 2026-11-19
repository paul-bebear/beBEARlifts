import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import {
  POST,
  Onboard_limits as OnboardingLimits,
  Onboard_maxBodyBytes,
  Onboard_validate,
} from "../api/ai/onboard.mjs";

describe("Onboarding API", () => {
  const payload = { answers: { goal: "muscle", days: 3 }, images: [] };
  const image = "data:image/jpeg;base64,YQ==";
  let originalGemini: string | undefined;
  function request(body: unknown, token: boolean = false): Request {
    return new Request("https://app/api/ai/onboard", {
      method: "POST",
      headers: token ? { Authorization: "Bearer user-jwt" } : {},
      body: JSON.stringify(body),
    });
  }
  beforeEach(() => {
    originalGemini = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "test-provider-key";
  });
  afterEach(() => {
    sinon.restore();
    if (originalGemini == null) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalGemini;
    }
  });
  it("refuses unsigned requests before calling the provider", async () => {
    const fetchStub = sinon.stub(globalThis, "fetch");
    expect((await POST(request(payload))).status).to.equal(401);
    expect(fetchStub.called).to.equal(false);
  });
  it("refuses malformed and oversized requests before spending an AI call", async () => {
    const fetchStub = sinon.stub(globalThis, "fetch");
    for (const body of [
      null,
      [],
      {},
      { ...payload, images: ["https://untrusted/image"] },
      { ...payload, images: new Array(7).fill(image) },
      { ...payload, previousAnswer: {} },
    ]) {
      expect((await POST(request(body, true))).status).to.equal(400);
    }
    expect((await POST(request({ text: "x".repeat(4_200_001) }, true))).status).to.equal(413);
    expect(fetchStub.called).to.equal(false);
  });
  it("accepts six images under the combined size limit", () => {
    expect(Onboard_validate({ ...payload, images: new Array(6).fill(image) })).to.equal(undefined);
    expect(Onboard_validate({ ...payload, images: ["data:image/jpeg;base64," + "x".repeat(3_500_001)] })).to.be.a(
      "string"
    );
  });
  it("reads its screenshot and answer limits from the file the app imports", () => {
    expect(OnboardingLimits).to.deep.equal({
      maxBodyBytes: 4_200_000,
      maxAnswersChars: 12_000,
      maxImages: 6,
      maxImageChars: 3_500_000,
      imageTypes: ["jpeg", "png", "webp"],
      maxPreviousAnswerChars: 600_000,
      maxValidationErrorChars: 8000,
    });
    expect(Onboard_maxBodyBytes).to.equal(OnboardingLimits.maxBodyBytes);
    const tooMany = new Array(OnboardingLimits.maxImages + 1).fill(image);
    expect(Onboard_validate({ ...payload, images: tooMany })).to.equal("Use up to 6 screenshots, under 3.5 MB total.");
    expect(Onboard_validate(null)).to.equal("Send your answers and up to 6 screenshots.");
    const longAnswer = "x".repeat(OnboardingLimits.maxPreviousAnswerChars + 1);
    expect(Onboard_validate({ ...payload, previousAnswer: longAnswer })).to.equal("The previous answer is too large.");
    expect(Onboard_validate({ ...payload, validationError: "x".repeat(8001) })).to.equal(
      "The validation error is too large."
    );
    expect(Onboard_validate({ ...payload, answers: { note: "x".repeat(12_000) } })).to.equal(
      "The answers are too long."
    );
    for (const type of OnboardingLimits.imageTypes) {
      expect(Onboard_validate({ ...payload, images: [`data:image/${type};base64,YQ==`] })).to.equal(undefined);
    }
    expect(Onboard_validate({ ...payload, images: ["data:image/gif;base64,YQ=="] })).to.be.a("string");
  });
  it("sends image parts, references and one correction to the authenticated provider", async () => {
    const fetchStub = sinon.stub(globalThis, "fetch");
    fetchStub.onFirstCall().resolves(new Response(JSON.stringify({ plan: "free", lifetime: 0 })));
    fetchStub
      .onSecondCall()
      .resolves(new Response(JSON.stringify({ choices: [{ message: { content: '{"builtin":"fierce-5"}' } }] })));
    const response = await POST(
      request({ ...payload, images: [image], previousAnswer: "bad plan", validationError: "Unknown exercise" }, true)
    );
    expect(response.status).to.equal(200);
    expect(await response.json()).to.deep.equal({ text: '{"builtin":"fierce-5"}' });
    const providerBody = JSON.parse((fetchStub.secondCall.args[1] as RequestInit).body as string);
    expect(providerBody.messages[0].content).to.include("Basic Beginner Routine");
    expect(providerBody.messages[0].content).to.include("CSV columns");
    expect(providerBody.messages[1].content[1]).to.deep.equal({ type: "image_url", image_url: { url: image } });
    expect(providerBody.messages[3].content).to.include("Unknown exercise");
  });
  it("reports auth limits, provider errors and unreachable services", async () => {
    const fetchStub = sinon.stub(globalThis, "fetch");
    fetchStub.resolves(new Response("{}", { status: 429 }));
    expect((await POST(request(payload, true))).status).to.equal(429);
    fetchStub.reset();
    fetchStub.onFirstCall().resolves(new Response(JSON.stringify({ plan: "free", lifetime: 0 })));
    fetchStub.onSecondCall().rejects(new Error("network"));
    expect((await POST(request(payload, true))).status).to.equal(504);
  });
  it("gives the setup back when the provider fails", async () => {
    sinon.stub(console, "error");
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_x";
    const fetchStub = sinon.stub(globalThis, "fetch");
    fetchStub.onFirstCall().resolves(new Response(JSON.stringify({ plan: "free", lifetime: 0, userId: "u1" })));
    fetchStub.onSecondCall().resolves(new Response("{}", { status: 500 }));
    fetchStub.onThirdCall().resolves(new Response("true"));
    expect((await POST(request(payload, true))).status).to.equal(502);
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(fetchStub.thirdCall.args[0]).to.match(/rpc\/ai_usage_refund$/);
    expect(JSON.parse((fetchStub.thirdCall.args[1] as RequestInit).body as string)).to.deep.equal({
      p_user: "u1",
      p_kind: "onboard",
      p_ref: null,
    });
  });
  it("passes on why the provider stopped", async () => {
    const fetchStub = sinon.stub(globalThis, "fetch");
    fetchStub.onFirstCall().resolves(new Response(JSON.stringify({ plan: "free", lifetime: 0, userId: "u1" })));
    fetchStub
      .onSecondCall()
      .resolves(
        new Response(JSON.stringify({ choices: [{ message: { content: '{"lifto' }, finish_reason: "length" }] }))
      );
    expect(await (await POST(request(payload, true))).json()).to.deep.equal({
      text: '{"lifto',
      finishReason: "length",
    });
    expect(fetchStub.callCount).to.equal(2);
  });
});
