import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { POST, Onboard_validate } from "../api/ai/onboard.mjs";

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
  it("sends image parts, references and one correction to the authenticated provider", async () => {
    const fetchStub = sinon.stub(globalThis, "fetch");
    fetchStub.onFirstCall().resolves(new Response("1"));
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
    fetchStub.resolves(new Response("61"));
    expect((await POST(request(payload, true))).status).to.equal(429);
    fetchStub.reset();
    fetchStub.onFirstCall().resolves(new Response("1"));
    fetchStub.onSecondCall().rejects(new Error("network"));
    expect((await POST(request(payload, true))).status).to.equal(504);
  });
});
