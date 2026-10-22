import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import {
  AiAuth_bearerToken,
  AiAuth_capValue,
  AiAuth_caps,
  AiAuth_check,
  AiAuth_decide,
  AiAuth_decideUsage,
  AiAuth_signInMessage,
} from "../api/_auth.mjs";

const caps = { day: 3, week: 10, plusDay: 30, plusWeek: 150, lifetime: 3 };

function post(headers: Record<string, string> = {}): Request {
  return new Request("https://lifts.paulbebear.com/api/ai/warmup", { method: "POST", headers });
}

function answer(fields: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ plan: "free", day: 0, week: 0, lifetime: 0, refUsed: false, ...fields }));
}

describe("AiAuth", () => {
  const savedEnv = { ...process.env };
  afterEach(() => {
    sinon.restore();
    process.env = { ...savedEnv };
  });

  it("reads only a well-formed bearer header", () => {
    expect(AiAuth_bearerToken("Bearer abc.def")).to.equal("abc.def");
    expect(AiAuth_bearerToken("bearer abc")).to.equal("abc");
    expect(AiAuth_bearerToken("Basic abc")).to.equal(undefined);
    expect(AiAuth_bearerToken("Bearer ")).to.equal(undefined);
    expect(AiAuth_bearerToken(null)).to.equal(undefined);
  });

  it("uses the fallback unless the variable is a positive whole number", () => {
    expect(AiAuth_capValue(undefined, 3)).to.equal(3);
    expect(AiAuth_capValue("abc", 3)).to.equal(3);
    expect(AiAuth_capValue("0", 3)).to.equal(3);
    expect(AiAuth_capValue("2.5", 3)).to.equal(3);
    expect(AiAuth_capValue("20", 3)).to.equal(20);
  });

  it("defaults to 3 a day, 10 a week, 30 and 150 for beBEAR+, and 3 setups", () => {
    expect(AiAuth_caps({})).to.deep.equal(caps);
    expect(
      AiAuth_caps({ AI_DAILY_CAP: "5", AI_WEEKLY_CAP: "20", AI_PLUS_DAILY_CAP: "40", AI_PLUS_WEEKLY_CAP: "200" })
    ).to.deep.equal({ day: 5, week: 20, plusDay: 40, plusWeek: 200, lifetime: 3 });
  });

  it("allows the 3rd capped call of the day and refuses the 4th with the counts", () => {
    expect(AiAuth_decideUsage({ plan: "free", day: 2, week: 2 }, "capped", caps)).to.deep.equal({ ok: true });
    expect(AiAuth_decideUsage({ plan: "free", day: 3, week: 3, weekFreesIn: 7 }, "capped", caps)).to.deep.equal({
      ok: false,
      status: 429,
      body: {
        error: "Your 3 AI uses for today are used. More tomorrow.",
        reason: "day",
        plan: "free",
        used: { day: 3, week: 3 },
        caps: { day: 3, week: 10 },
        weekFreesIn: 7,
      },
    });
  });

  it("refuses the 11th capped call of the week even on a fresh day", () => {
    const decision = AiAuth_decideUsage({ plan: "free", day: 0, week: 10, weekFreesIn: 2 }, "capped", caps);
    expect(decision).to.deep.include({ ok: false, status: 429 });
    expect(decision.body).to.include({
      reason: "week",
      error: "Your 10 AI uses for this week are used. More in 2 days.",
    });
    expect(AiAuth_decideUsage({ plan: "free", day: 3, week: 10, weekFreesIn: 1 }, "capped", caps).body?.error).to.equal(
      "Your 10 AI uses for this week are used. More tomorrow."
    );
  });

  it("gives beBEAR+ accounts 30 a day and 150 a week", () => {
    expect(AiAuth_decideUsage({ plan: "plus", day: 29, week: 149 }, "capped", caps)).to.deep.equal({ ok: true });
    expect(AiAuth_decideUsage({ plan: "plus", day: 30, week: 30 }, "capped", caps).body).to.deep.include({
      plan: "plus",
      caps: { day: 30, week: 150 },
    });
  });

  it("allows 3 onboarding runs for life and one report per workout", () => {
    expect(AiAuth_decideUsage({ plan: "free", lifetime: 2 }, "onboard", caps)).to.deep.equal({ ok: true });
    expect(AiAuth_decideUsage({ plan: "free", lifetime: 3 }, "onboard", caps).body).to.deep.include({
      reason: "onboard",
      used: { lifetime: 3 },
      caps: { lifetime: 3 },
    });
    expect(AiAuth_decideUsage({ plan: "free", refUsed: false, day: 9 }, "report", caps)).to.deep.equal({ ok: true });
    expect(AiAuth_decideUsage({ plan: "free", refUsed: true }, "report", caps)).to.deep.include({ status: 429 });
  });

  it("asks for sign-in on 401 and 403, and reports other failures as 503", () => {
    expect(AiAuth_decide(401, undefined, "capped", caps)).to.deep.equal({
      ok: false,
      status: 401,
      body: { error: AiAuth_signInMessage },
    });
    expect(AiAuth_decide(403, undefined, "capped", caps)).to.include({ status: 401 });
    expect(AiAuth_decide(429, undefined, "capped", caps).body).to.include({ reason: "global" });
    expect(AiAuth_decide(500, undefined, "capped", caps)).to.include({ status: 503 });
    expect(AiAuth_decide(200, 5, "capped", caps)).to.include({ status: 503 });
    expect(AiAuth_decide(200, { plan: "free", day: "2", week: 2 }, "capped", caps)).to.include({ status: 503 });
  });

  it("refuses a request with no token without calling Supabase", async () => {
    const fetchStub = sinon.stub(globalThis, "fetch");
    const denied = await AiAuth_check(post());
    expect(denied?.status).to.equal(401);
    expect(await denied?.json()).to.deep.equal({ error: AiAuth_signInMessage });
    expect(fetchStub.called).to.equal(false);
  });

  it("sends the kind, the workout id and the Vercel caps with the user's own token", async () => {
    process.env.AI_DAILY_CAP = "4";
    const fetchStub = sinon.stub(globalThis, "fetch").resolves(answer({ refUsed: false }));
    expect(await AiAuth_check(post({ Authorization: "Bearer user-jwt" }), undefined, "report", "1700")).to.equal(
      undefined
    );
    const [url, init] = fetchStub.firstCall.args as [string, RequestInit];
    expect(url).to.equal("https://qvqwvuuwfueccrmzwyct.supabase.co/rest/v1/rpc/ai_usage_take");
    expect((init.headers as Record<string, string>).Authorization).to.equal("Bearer user-jwt");
    expect(JSON.parse(init.body as string)).to.deep.equal({
      p_kind: "report",
      p_ref: "1700",
      p_caps: { day: 4, week: 10, plusDay: 30, plusWeek: 150, lifetime: 3 },
    });
  });

  it("counts as capped when the route names no kind", async () => {
    const fetchStub = sinon.stub(globalThis, "fetch").resolves(answer({ day: 1, week: 1 }));
    expect(await AiAuth_check(post({ Authorization: "Bearer t" }))).to.equal(undefined);
    expect(JSON.parse(fetchStub.firstCall.args[1]?.body as string)).to.include({ p_kind: "capped", p_ref: null });
  });

  it("refuses an expired token, and answers 429 with the counts for a user over the cap", async () => {
    const fetchStub = sinon.stub(globalThis, "fetch");
    fetchStub.onFirstCall().resolves(new Response(JSON.stringify({ message: "JWT expired" }), { status: 401 }));
    fetchStub.onSecondCall().resolves(answer({ day: 3, week: 5 }));
    expect((await AiAuth_check(post({ Authorization: "Bearer old" })))?.status).to.equal(401);
    const busy = await AiAuth_check(post({ Authorization: "Bearer busy" }), undefined, "capped");
    expect(busy?.status).to.equal(429);
    expect(await busy?.json()).to.deep.include({
      reason: "day",
      used: { day: 3, week: 5 },
      caps: { day: 3, week: 10 },
    });
  });

  it("answers 503 when Supabase cannot be reached", async () => {
    sinon.stub(globalThis, "fetch").rejects(new TypeError("fetch failed"));
    expect((await AiAuth_check(post({ Authorization: "Bearer t" })))?.status).to.equal(503);
  });
});
