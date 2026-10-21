import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { AiRequest_offlineMessage, AiRequest_post, AiRequest_signInMessage } from "../src/utils/aiRequest";
import { CloudStore } from "../src/utils/supabaseClient";
import { ICloudState } from "../src/models/cloudBackup";
import { WarmupApi_generate } from "../src/utils/warmupApi";
import { ReportApi_summary } from "../src/utils/reportStore";
import { FoodApi_describe } from "../src/utils/foodApi";
import { FoodApi_estimatePhoto, FoodApi_readLabel } from "../src/utils/foodApi";
import { AiConsent_decide } from "../src/models/aiConsent";
import { AiConsentStore, AiConsent_disabledMessage } from "../src/utils/aiConsentClient";

const now = Date.UTC(2026, 9, 21, 9);
const signedIn: ICloudState = {
  version: 1,
  session: { email: "paul@example.com", userId: "u1", accessToken: "a", refreshToken: "r", expiresAt: now + 3600000 },
};

describe("AiRequest", () => {
  let state: ICloudState;
  let fetchStub: sinon.SinonStub;

  beforeEach(() => {
    sinon.stub(AiConsentStore, "load").resolves(AiConsent_decide(true, now));
    state = signedIn;
    sinon.stub(Date, "now").returns(now);
    sinon.stub(CloudStore, "load").callsFake(async () => state);
    sinon.stub(CloudStore, "update").callsFake(async (update) => {
      state = update(state);
    });
    fetchStub = sinon.stub(globalThis, "fetch");
  });
  afterEach(() => sinon.restore());

  it("asks a signed-out user to sign in and never calls the server", async () => {
    state = { version: 1 };
    expect(await AiRequest_post("/api/ai/warmup", {})).to.deep.equal({ ok: false, error: AiRequest_signInMessage });
    expect(fetchStub.called).to.equal(false);
  });

  it("sends no AI data or auth refresh when permission is declined", async () => {
    (AiConsentStore.load as sinon.SinonStub).resolves(AiConsent_decide(false, now));
    const denied = { ok: false, error: AiConsent_disabledMessage };
    expect(await FoodApi_describe("eggs")).to.deep.equal(denied);
    expect(await FoodApi_estimatePhoto("data:image/jpeg;base64,private")).to.deep.equal(denied);
    expect(await FoodApi_readLabel("private")).to.deep.equal(denied);
    expect(await WarmupApi_generate([])).to.deep.equal(denied);
    expect(
      await ReportApi_summary({ workoutId: 1, timestamp: now, dayName: "D", items: [], answers: {} })
    ).to.deep.equal(denied);
    expect(await AiRequest_post("/api/ai/onboard", { images: ["private"] })).to.deep.equal(denied);
    expect(fetchStub.called).to.equal(false);
  });

  it("rechecks consent after obtaining auth", async () => {
    (AiConsentStore.load as sinon.SinonStub).onSecondCall().resolves(AiConsent_decide(false, now));
    const result = await AiRequest_post("/api/ai/report", {});
    expect(result).to.deep.equal({ ok: false, error: AiConsent_disabledMessage });
    expect(fetchStub.called).to.equal(false);
  });

  it("sends the access token as a bearer header", async () => {
    fetchStub.resolves(new Response(JSON.stringify({ text: "hi" })));
    expect(await AiRequest_post("/api/ai/report", { facts: ["x"] })).to.deep.equal({ ok: true, body: { text: "hi" } });
    const [path, init] = fetchStub.firstCall.args;
    expect(path).to.equal("/api/ai/report");
    expect(init.headers.Authorization).to.equal("Bearer a");
    expect(JSON.parse(init.body)).to.deep.equal({ facts: ["x"] });
  });

  it("refreshes an expiring session before the call", async () => {
    state = { version: 1, session: { ...signedIn.session!, expiresAt: now + 1000 } };
    fetchStub.onFirstCall().resolves(
      new Response(
        JSON.stringify({
          access_token: "fresh",
          refresh_token: "r2",
          expires_in: 3600,
          user: { id: "u1", email: "paul@example.com" },
        })
      )
    );
    fetchStub.onSecondCall().resolves(new Response(JSON.stringify({ text: "ok" })));
    await AiRequest_post("/api/ai/warmup", {});
    expect(fetchStub.secondCall.args[1].headers.Authorization).to.equal("Bearer fresh");
  });

  it("turns a 401 into the sign-in message", async () => {
    fetchStub.resolves(new Response(JSON.stringify({ error: "whatever" }), { status: 401 }));
    expect(await AiRequest_post("/api/ai/warmup", {})).to.deep.equal({ ok: false, error: AiRequest_signInMessage });
  });

  it("keeps the server's text for the daily cap", async () => {
    const error = "You used all 60 AI calls for today. The count starts again at midnight UTC.";
    fetchStub.resolves(new Response(JSON.stringify({ error }), { status: 429 }));
    expect(await AiRequest_post("/api/food/photo", {})).to.deep.equal({ ok: false, error });
  });

  it("reports no connection when fetch throws", async () => {
    fetchStub.rejects(new TypeError("Failed to fetch"));
    expect(await AiRequest_post("/api/ai/report", {})).to.deep.equal({ ok: false, error: AiRequest_offlineMessage });
  });

  it("gives every AI caller the sign-in message when signed out, so the warmup card uses its rules", async () => {
    state = { version: 1 };
    const signIn = { ok: false, error: AiRequest_signInMessage };
    expect(await WarmupApi_generate([])).to.deep.equal(signIn);
    const report = { workoutId: 1, timestamp: now, dayName: "Day 1", items: [], answers: {} };
    expect(await ReportApi_summary(report)).to.deep.equal(signIn);
    expect(await FoodApi_describe("2 eggs")).to.deep.equal(signIn);
    expect(fetchStub.called).to.equal(false);
  });
});
