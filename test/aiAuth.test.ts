import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import {
  AiAuth_bearerToken,
  AiAuth_check,
  AiAuth_dailyCap,
  AiAuth_decide,
  AiAuth_signInMessage,
} from "../api/_auth.mjs";

function post(headers: Record<string, string> = {}): Request {
  return new Request("https://lifts.paulbebear.com/api/ai/warmup", { method: "POST", headers });
}

describe("AiAuth", () => {
  afterEach(() => sinon.restore());

  it("reads only a well-formed bearer header", () => {
    expect(AiAuth_bearerToken("Bearer abc.def")).to.equal("abc.def");
    expect(AiAuth_bearerToken("bearer abc")).to.equal("abc");
    expect(AiAuth_bearerToken("Basic abc")).to.equal(undefined);
    expect(AiAuth_bearerToken("Bearer ")).to.equal(undefined);
    expect(AiAuth_bearerToken(null)).to.equal(undefined);
  });

  it("uses 60 calls a day unless AI_DAILY_CAP is a positive whole number", () => {
    expect(AiAuth_dailyCap(undefined)).to.equal(60);
    expect(AiAuth_dailyCap("abc")).to.equal(60);
    expect(AiAuth_dailyCap("0")).to.equal(60);
    expect(AiAuth_dailyCap("20")).to.equal(20);
  });

  it("allows the 60th call of the day and refuses the 61st", () => {
    expect(AiAuth_decide(200, 60, 60)).to.deep.equal({ ok: true });
    expect(AiAuth_decide(200, 61, 60)).to.include({ ok: false, status: 429 });
  });

  it("asks for sign-in on 401 and 403, and reports other failures as 503", () => {
    expect(AiAuth_decide(401, undefined, 60)).to.deep.equal({ ok: false, status: 401, error: AiAuth_signInMessage });
    expect(AiAuth_decide(403, undefined, 60)).to.include({ status: 401 });
    expect(AiAuth_decide(500, undefined, 60)).to.include({ status: 503 });
    expect(AiAuth_decide(200, "5", 60)).to.include({ status: 503 });
  });

  it("refuses a request with no token without calling Supabase", async () => {
    const fetchStub = sinon.stub(globalThis, "fetch");
    const denied = await AiAuth_check(post());
    expect(denied?.status).to.equal(401);
    expect(await denied?.json()).to.deep.equal({ error: AiAuth_signInMessage });
    expect(fetchStub.called).to.equal(false);
  });

  it("counts the call with the user's own token and lets it through under the cap", async () => {
    const fetchStub = sinon.stub(globalThis, "fetch").resolves(new Response("3"));
    expect(await AiAuth_check(post({ Authorization: "Bearer user-jwt" }))).to.equal(undefined);
    const [url, init] = fetchStub.firstCall.args as [string, RequestInit];
    expect(url).to.equal("https://qvqwvuuwfueccrmzwyct.supabase.co/rest/v1/rpc/ai_usage_take");
    expect((init.headers as Record<string, string>).Authorization).to.equal("Bearer user-jwt");
  });

  it("refuses an expired token and a user over the cap", async () => {
    const fetchStub = sinon.stub(globalThis, "fetch");
    fetchStub.onFirstCall().resolves(new Response(JSON.stringify({ message: "JWT expired" }), { status: 401 }));
    fetchStub.onSecondCall().resolves(new Response("61"));
    expect((await AiAuth_check(post({ Authorization: "Bearer old" })))?.status).to.equal(401);
    expect((await AiAuth_check(post({ Authorization: "Bearer busy" })))?.status).to.equal(429);
  });

  it("answers 503 when Supabase cannot be reached", async () => {
    sinon.stub(globalThis, "fetch").rejects(new TypeError("fetch failed"));
    expect((await AiAuth_check(post({ Authorization: "Bearer t" })))?.status).to.equal(503);
  });
});
