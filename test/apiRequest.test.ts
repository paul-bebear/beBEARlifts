import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { ApiRequest_errorText, ApiRequest_fetch, ApiRequest_send } from "../src/utils/apiRequest";

const neverAnswers = (_url: unknown, init?: RequestInit): Promise<Response> =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  });

describe("ApiRequest", () => {
  let fetchStub: sinon.SinonStub;

  beforeEach(() => {
    fetchStub = sinon.stub(globalThis, "fetch");
  });
  afterEach(() => sinon.restore());

  it("posts JSON with the bearer token to the API path", async () => {
    fetchStub.resolves(new Response("{}"));
    await ApiRequest_fetch("/api/ai/report", { method: "POST", token: "jwt", json: { a: 1 } });
    const [url, init] = fetchStub.firstCall.args;
    expect(url).to.equal("/api/ai/report");
    expect(init.method).to.equal("POST");
    expect(init.headers).to.deep.equal({ "Content-Type": "application/json", Authorization: "Bearer jwt" });
    expect(JSON.parse(init.body)).to.deep.equal({ a: 1 });
  });

  it("sends no body and no content type when there is no JSON", async () => {
    fetchStub.resolves(new Response("{}"));
    await ApiRequest_fetch("/api/account/delete", { method: "POST", token: "jwt" });
    const init = fetchStub.firstCall.args[1];
    expect(init.headers).to.deep.equal({ Authorization: "Bearer jwt" });
    expect(init.body).to.equal(undefined);
  });

  it("returns the status and the parsed body", async () => {
    fetchStub.resolves(new Response(JSON.stringify({ error: "busy" }), { status: 429 }));
    expect(await ApiRequest_send("/api/food/search", {})).to.deep.equal({
      kind: "reply",
      status: 429,
      ok: false,
      body: { error: "busy" },
      bodyTimedOut: false,
    });
  });

  it("returns an undefined body when the answer is not JSON", async () => {
    fetchStub.resolves(new Response("<html>", { status: 502 }));
    const result = await ApiRequest_send("/api/food/search", {}, 1000);
    expect(result).to.deep.equal({ kind: "reply", status: 502, ok: false, body: undefined, bodyTimedOut: false });
  });

  it("reports offline when fetch throws", async () => {
    fetchStub.rejects(new TypeError("Failed to fetch"));
    expect(await ApiRequest_send("/api/food/search", {}, 1000)).to.deep.equal({ kind: "offline" });
    expect(await ApiRequest_send("/api/food/search", {})).to.deep.equal({ kind: "offline" });
  });

  it("aborts after the time limit and reports a timeout", async () => {
    const clock = sinon.useFakeTimers();
    fetchStub.callsFake(neverAnswers);
    const pending = ApiRequest_send("/api/food/search", {}, 500);
    await clock.tickAsync(500);
    expect(await pending).to.deep.equal({ kind: "timeout" });
  });

  it("passes no abort signal when there is no time limit", async () => {
    fetchStub.resolves(new Response("{}"));
    await ApiRequest_send("/api/account/delete", { method: "POST", token: "jwt" });
    expect(fetchStub.firstCall.args[1].signal).to.equal(undefined);
  });

  it("uses the server's error text, or names the status", () => {
    expect(ApiRequest_errorText(429, { error: "USDA is busy." })).to.equal("USDA is busy.");
    expect(ApiRequest_errorText(500, { error: 7 })).to.equal("The server returned 500.");
    expect(ApiRequest_errorText(404, undefined)).to.equal("The server returned 404.");
  });
});
