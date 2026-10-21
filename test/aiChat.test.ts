import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { aiChat, aiUnavailableMessage } from "../api/_ai.mjs";
import { AiAuth_check } from "../api/_auth.mjs";
import { POST as report } from "../api/ai/report.mjs";
import { POST as warmup } from "../api/ai/warmup.mjs";
import { POST as onboard } from "../api/ai/onboard.mjs";
import { POST as photo } from "../api/food/photo.mjs";

const ai = { name: "Test provider", url: "https://provider.test/chat", token: "provider-key", model: "test-model" };
const options = { messages: [{ role: "user", content: "Hello" }], maxTokens: 300, temperature: 0.4 };
const image = "data:image/jpeg;base64,YQ==";

function answer(text: string = "A helpful answer", finishReason: string = "stop"): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content: text }, finish_reason: finishReason }] }));
}

function request(body: unknown, signedIn: boolean = true): Request {
  return new Request("https://app.test/api/ai/test", {
    method: "POST",
    headers: signedIn ? { Authorization: "Bearer user-jwt" } : {},
    body: JSON.stringify(body),
  });
}

describe("aiChat", () => {
  afterEach(() => sinon.restore());

  it("sends the configured request and preserves text and finish reason", async () => {
    const fetchStub = sinon.stub(globalThis, "fetch").resolves(answer("  Result  ", "length"));
    expect(await aiChat(ai, options, 30000)).to.deep.equal({
      ok: true,
      text: "  Result  ",
      finishReason: "length",
    });
    const [url, init] = fetchStub.firstCall.args as [string, RequestInit];
    expect(url).to.equal(ai.url);
    expect(init.method).to.equal("POST");
    expect(init.headers).to.include({ Authorization: "Bearer provider-key", "Content-Type": "application/json" });
    expect(JSON.parse(init.body as string)).to.deep.equal({
      model: ai.model,
      messages: options.messages,
      max_tokens: 300,
      temperature: 0.4,
    });
  });

  it("logs array, object and non-JSON provider errors and returns a fixed message", async () => {
    const fetchStub = sinon.stub(globalThis, "fetch");
    const logStub = sinon.stub(console, "error");
    for (const raw of [
      JSON.stringify([{ error: { message: "Private provider quota detail" } }]),
      JSON.stringify({ error: { message: "Private provider quota detail" } }),
      "Private provider quota detail",
    ]) {
      fetchStub.resolves(new Response(raw, { status: 429 }));
      expect(await aiChat(ai, options, 30000)).to.deep.equal({
        ok: false,
        status: 502,
        error: aiUnavailableMessage,
      });
      expect(logStub.lastCall.args).to.include("Private provider quota detail");
    }
  });

  it("rejects missing or empty content instead of returning a successful blank answer", async () => {
    const fetchStub = sinon.stub(globalThis, "fetch");
    sinon.stub(console, "error");
    for (const raw of ["{}", "not JSON", JSON.stringify({ choices: [{ message: { content: " " } }] })]) {
      fetchStub.resolves(new Response(raw));
      expect(await aiChat(ai, options, 30000)).to.include({ ok: false, status: 502, error: aiUnavailableMessage });
    }
  });

  it("aborts a timed-out fetch and hides network errors", async () => {
    const timer = sinon.useFakeTimers();
    sinon.stub(console, "error");
    let signal: AbortSignal | undefined;
    const fetchStub = sinon.stub(globalThis, "fetch").callsFake((_url, init) => {
      signal = init?.signal ?? undefined;
      return new Promise((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new DOMException("Private timeout", "AbortError")));
      });
    });
    const pending = aiChat(ai, options, 30000);
    await timer.tickAsync(30000);
    expect(await pending).to.deep.equal({ ok: false, status: 504, error: aiUnavailableMessage });
    expect(signal?.aborted).to.equal(true);
    expect(timer.countTimers()).to.equal(0);
    fetchStub.rejects(new TypeError("Private network error"));
    expect(await aiChat(ai, options, 30000)).to.include({ ok: false, status: 504, error: aiUnavailableMessage });
  });

  it("does not call the provider or charge quota without provider credentials", async () => {
    const fetchStub = sinon.stub(globalThis, "fetch");
    const unavailable = { ...ai, token: "" };
    expect(await aiChat(unavailable, options, 30000)).to.deep.equal({
      ok: false,
      status: 503,
      error: aiUnavailableMessage,
    });
    const denied = await AiAuth_check(request({}), unavailable);
    expect(denied?.status).to.equal(503);
    expect(await denied?.json()).to.deep.equal({ error: aiUnavailableMessage });
    expect((await AiAuth_check(request({}, false), unavailable))?.status).to.equal(401);
    expect(fetchStub.called).to.equal(false);
  });
});

describe("AI routes", () => {
  let originalGemini: string | undefined;
  const routes = [
    { post: report, body: { dayName: "Legs", facts: ["All sets completed"] }, maxTokens: 300, temperature: 0.4 },
    {
      post: warmup,
      body: { exercises: [{ name: "Squat", muscles: ["quads"], sets: "5 x 100 kg" }] },
      maxTokens: 700,
      temperature: 0.4,
    },
    { post: photo, body: { kind: "describe", text: "150 g rice" }, maxTokens: 4000, temperature: 0.2 },
    { post: onboard, body: { answers: { goal: "muscle" }, images: [] }, maxTokens: 12000, temperature: 0.2 },
  ];

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

  it("validates each route before calling Supabase or the provider", async () => {
    const fetchStub = sinon.stub(globalThis, "fetch");
    for (const route of routes) {
      expect((await route.post(request({}))).status).to.equal(400);
      expect((await route.post(request(route.body, false))).status).to.equal(401);
    }
    expect(fetchStub.called).to.equal(false);
  });

  it("keeps each route's token limit and temperature after authentication", async () => {
    const fetchStub = sinon.stub(globalThis, "fetch");
    for (const route of routes) {
      fetchStub.reset();
      fetchStub.onFirstCall().resolves(new Response("1"));
      fetchStub.onSecondCall().resolves(answer());
      const response = await route.post(request(route.body));
      expect(response.status).to.equal(200);
      expect(await response.json()).to.include({ text: "A helpful answer" });
      expect(fetchStub.firstCall.args[0]).to.include("/rpc/ai_usage_take");
      const sent = JSON.parse((fetchStub.secondCall.args[1] as RequestInit).body as string);
      expect(sent).to.include({ max_tokens: route.maxTokens, temperature: route.temperature });
      expect(sent.messages[0].content).to.be.a("string").and.not.equal("");
    }
  });

  it("returns global and per-user quota denials without calling the provider", async () => {
    const fetchStub = sinon.stub(globalThis, "fetch");
    for (const route of routes) {
      for (const response of [
        new Response(JSON.stringify({ code: "PT429", message: "Daily AI allowance reached" }), { status: 429 }),
        new Response("61"),
      ]) {
        fetchStub.reset();
        fetchStub.resolves(response);
        expect((await route.post(request(route.body))).status).to.equal(429);
        expect(fetchStub.calledOnce).to.equal(true);
      }
    }
  });

  it("uses the same safe provider error on every route", async () => {
    const fetchStub = sinon.stub(globalThis, "fetch");
    sinon.stub(console, "error");
    for (const route of routes) {
      fetchStub.reset();
      fetchStub.onFirstCall().resolves(new Response("1"));
      fetchStub
        .onSecondCall()
        .resolves(new Response('[{"error":{"message":"Private provider detail"}}]', { status: 400 }));
      const response = await route.post(request(route.body));
      expect(response.status).to.equal(502);
      expect(await response.json()).to.deep.equal({ error: aiUnavailableMessage });
    }
  });

  it("limits the report to 800 characters and preserves photo finish reasons", async () => {
    const fetchStub = sinon.stub(globalThis, "fetch");
    fetchStub.onFirstCall().resolves(new Response("1"));
    fetchStub.onSecondCall().resolves(answer(" " + "x".repeat(900) + " "));
    expect(await (await report(request(routes[0].body))).json()).to.deep.equal({ text: "x".repeat(800) });
    fetchStub.reset();
    fetchStub.onFirstCall().resolves(new Response("1"));
    fetchStub.onSecondCall().resolves(answer('{"items":[]}', "length"));
    expect(await (await photo(request({ kind: "meal", image }))).json()).to.deep.equal({
      text: '{"items":[]}',
      finishReason: "length",
    });
  });

  it("treats prototype properties as the default meal task", async () => {
    const fetchStub = sinon.stub(globalThis, "fetch");
    for (const kind of ["constructor", "__proto__", "toString"]) {
      expect((await photo(request({ kind, text: "rice" }))).status).to.equal(400);
      expect(fetchStub.called).to.equal(false);
      fetchStub.onFirstCall().resolves(new Response("1"));
      fetchStub.onSecondCall().resolves(answer('{"items":[]}'));
      expect((await photo(request({ kind, image }))).status).to.equal(200);
      const sent = JSON.parse((fetchStub.secondCall.args[1] as RequestInit).body as string);
      expect(sent.max_tokens).to.equal(4000);
      expect(sent.messages[0].content).to.include("nutrition of a meal from one photo");
      fetchStub.reset();
    }
  });
});
