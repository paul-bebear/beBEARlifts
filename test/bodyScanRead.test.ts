import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import {
  BodyScanRead_capture,
  BodyScanRead_merge,
  BodyScanRead_parse,
  BodyScanRead_signIn,
  BodyScanRead_unreadable,
  IBodyScanReadDependencies,
} from "../src/models/bodyScanRead";
import { BodyScans_fromForm } from "../src/models/bodyScans";
import { AiCaps_refusalText } from "../src/models/aiCaps";
import { FoodApi_readBodyScan } from "../src/utils/foodApi";
import { CloudStore } from "../src/utils/supabaseClient";
import { AiConsentStore } from "../src/utils/aiConsentClient";
import { AiConsent_decide } from "../src/models/aiConsent";

const full = {
  weight: 82.4,
  bodyFatPct: 18.5,
  muscleMass: 63.7,
  waterPct: 55.2,
  boneMass: 3.2,
  visceralFat: 6,
  bmrKcal: 1850,
  metabolicAge: 31,
  unit: "kg" as const,
};
const image = "data:image/jpeg;base64,YWJj";

function dependencies(): IBodyScanReadDependencies {
  return {
    authenticate: sinon.stub().resolves({ ok: true }),
    signedOutError: "Not signed in",
    allow: sinon.stub().resolves(true),
    pick: sinon.stub().resolves({ kind: "photo", dataUrl: image }),
    read: sinon.stub().resolves({ ok: true, value: full }),
  };
}

describe("BodyScanRead", () => {
  afterEach(() => sinon.restore());

  it("reads every field on a full printout, including fenced JSON", () => {
    expect(BodyScanRead_parse(JSON.stringify(full))).to.deep.equal(full);
    expect(BodyScanRead_parse(`\`\`\`json\n${JSON.stringify(full)}\n\`\`\``)).to.deep.equal(full);
  });

  it("leaves missing fields out of a partial printout", () => {
    expect(BodyScanRead_parse('{"bodyFatPct":18.5,"metabolicAge":31}')).to.deep.equal({
      bodyFatPct: 18.5,
      metabolicAge: 31,
    });
    expect(BodyScanRead_parse('{"weight":82.4,"unit":"kg"}')).to.deep.equal({ weight: 82.4, unit: "kg" });
  });

  it("converts printed kg water to percent using the printed weight", () => {
    expect(BodyScanRead_parse('{"weight":80,"waterKg":44.16,"unit":"kg"}')).to.deep.equal({
      weight: 80,
      waterPct: 55.2,
      unit: "kg",
    });
  });

  it("omits kg water when weight or its unit is unreadable", () => {
    expect(BodyScanRead_parse('{"waterKg":44,"bodyFatPct":18,"unit":"kg"}')).to.deep.equal({
      bodyFatPct: 18,
      unit: "kg",
    });
    expect(BodyScanRead_parse('{"waterKg":44,"weight":80}')).to.equal(undefined);
    expect(BodyScanRead_parse('{"weight":80,"waterKg":90,"unit":"kg"}')).to.deep.equal({ weight: 80, unit: "kg" });
    expect(BodyScanRead_parse('{"waterKg":44,"waterPct":44,"bodyFatPct":18}')).to.deep.equal({ bodyFatPct: 18 });
  });

  it("reads pounds and uses pounds weight when converting kg water", () => {
    expect(BodyScanRead_parse('{"weight":176.3696,"muscleMass":140,"unit":"lb"}')).to.deep.equal({
      weight: 176.3696,
      muscleMass: 140,
      unit: "lb",
    });
    expect(BodyScanRead_parse('{"weight":176.3696,"waterKg":44,"unit":"lb"}')?.waterPct).to.equal(55);
  });

  it("does not assign a guessed unit to mass measurements", () => {
    expect(BodyScanRead_parse('{"weight":80,"muscleMass":60,"unit":"stone","bodyFatPct":18}')).to.deep.equal({
      bodyFatPct: 18,
    });
  });

  it("rejects junk, non-numbers, impossible percentages, and an empty result", () => {
    for (const text of [
      "a meal",
      "{}",
      "null",
      "[]",
      '[{"weight":80,"unit":"kg"}]',
      '{"unit":"kg"}',
      '{"weight":"80","unit":"kg"}',
      '{"weight":-80,"bodyFatPct":101,"waterPct":0,"bmrKcal":null,"muscleMass":1e999,"unit":"kg"}',
      '{"weight":80,',
    ]) {
      expect(BodyScanRead_parse(text), text).to.equal(undefined);
    }
  });

  it("merges only readable values and leaves the existing form untouched", () => {
    const form = { muscleMass: "60", waterPct: "54", weight: "75" };
    const result = BodyScanRead_merge(form, { weight: 80, unit: "kg" }, "kg");
    expect(result).to.deep.equal({ muscleMass: "60", waterPct: "54", weight: "80" });
    expect(form.weight).to.equal("75");
    expect(BodyScanRead_merge({}, { weight: 82.45, unit: "kg" }, "kg")).to.deep.equal({ weight: "82.45" });
  });

  it("converts all printed masses to the form's unit without changing percentages or counts", () => {
    expect(BodyScanRead_merge({}, full, "lb")).to.deep.equal({
      weight: "181.7",
      bodyFatPct: "18.5",
      muscleMass: "140.4",
      waterPct: "55.2",
      boneMass: "7.1",
      visceralFat: "6",
      bmrKcal: "1850",
      metabolicAge: "31",
    });
    const form = BodyScanRead_merge({}, { weight: 176.3696, unit: "lb" }, "kg");
    expect(form).to.deep.equal({ weight: "80" });
    expect(BodyScans_fromForm({ ...form, weight: "81" }, "kg", 123)).to.deep.equal({
      kind: "ok",
      scan: { weight: 81, id: 123, timestamp: 123, unit: "kg" },
    });
  });

  it("checks auth and consent before opening a picker or reading an image", async () => {
    const deps = dependencies();
    const result = await BodyScanRead_capture(deps);
    expect(result).to.deep.equal({ kind: "read", value: full });
    sinon.assert.callOrder(
      deps.authenticate as sinon.SinonStub,
      deps.allow as sinon.SinonStub,
      deps.pick as sinon.SinonStub,
      deps.read as sinon.SinonStub
    );
    sinon.assert.calledWithExactly(deps.read as sinon.SinonStub, image);
  });

  it("blocks signed-out scans before consent or photo access", async () => {
    const deps = dependencies();
    (deps.authenticate as sinon.SinonStub).resolves({ ok: false, error: "Not signed in" });
    expect(await BodyScanRead_capture(deps)).to.deep.equal({ kind: "error", error: BodyScanRead_signIn });
    for (const fn of [deps.allow, deps.pick, deps.read]) {
      sinon.assert.notCalled(fn as sinon.SinonStub);
    }
  });

  it("preserves connection errors while refreshing sign-in", async () => {
    const deps = dependencies();
    (deps.authenticate as sinon.SinonStub).resolves({ ok: false, error: "No connection" });
    expect(await BodyScanRead_capture(deps)).to.deep.equal({ kind: "error", error: "No connection" });
    sinon.assert.notCalled(deps.pick as sinon.SinonStub);
  });

  it("leaves the form alone when consent or photo selection is cancelled", async () => {
    const deps = dependencies();
    (deps.allow as sinon.SinonStub).resolves(false);
    expect(await BodyScanRead_capture(deps)).to.deep.equal({ kind: "cancelled" });
    sinon.assert.notCalled(deps.pick as sinon.SinonStub);
    (deps.allow as sinon.SinonStub).resolves(true);
    (deps.pick as sinon.SinonStub).resolves({ kind: "cancelled" });
    expect(await BodyScanRead_capture(deps)).to.deep.equal({ kind: "cancelled" });
    sinon.assert.notCalled(deps.read as sinon.SinonStub);
  });

  it("keeps cap and permission messages and handles unreadable photos", async () => {
    const deps = dependencies();
    const cap = "Your 3 AI uses for today are used. More tomorrow.";
    (deps.read as sinon.SinonStub).resolves({ ok: false, error: cap });
    expect(await BodyScanRead_capture(deps)).to.deep.equal({ kind: "error", error: cap });
    (deps.pick as sinon.SinonStub).resolves({ kind: "error", error: "Allow camera access" });
    expect(await BodyScanRead_capture(deps)).to.deep.equal({ kind: "error", error: "Allow camera access" });
    (deps.pick as sinon.SinonStub).rejects(new Error("image decode failed"));
    expect(await BodyScanRead_capture(deps)).to.deep.equal({ kind: "error", error: BodyScanRead_unreadable });
  });
});

describe("Body scan photo client", () => {
  let fetchStub: sinon.SinonStub;
  const now = Date.UTC(2026, 9, 22, 9);

  beforeEach(() => {
    sinon.stub(AiConsentStore, "load").resolves(AiConsent_decide(true, now));
    sinon.stub(CloudStore, "load").resolves({
      version: 1,
      session: { email: "a@example.com", userId: "u", accessToken: "a", refreshToken: "r", expiresAt: now + 3600000 },
    });
    sinon.stub(Date, "now").returns(now);
    fetchStub = sinon.stub(globalThis, "fetch");
  });
  afterEach(() => sinon.restore());

  it("posts bodyscan and parses the form values", async () => {
    fetchStub.resolves(new Response(JSON.stringify({ text: JSON.stringify(full), finishReason: "stop" })));
    expect(await FoodApi_readBodyScan(image)).to.deep.equal({ ok: true, value: full });
    expect(fetchStub.firstCall.args[0]).to.equal("/api/food/photo");
    expect(JSON.parse(fetchStub.firstCall.args[1].body)).to.deep.equal({ kind: "bodyscan", image });
    expect(fetchStub.firstCall.args[1].headers.Authorization).to.equal("Bearer a");
  });

  it("gives the sharper-photo message when the answer has no readable numbers", async () => {
    fetchStub.resolves(new Response(JSON.stringify({ text: "{}" })));
    expect(await FoodApi_readBodyScan(image)).to.deep.equal({ ok: false, error: BodyScanRead_unreadable });
  });

  it("uses the body scan sign-in message locally and for a server 401", async () => {
    (CloudStore.load as sinon.SinonStub).resolves({ version: 1 });
    expect(await FoodApi_readBodyScan(image)).to.deep.equal({ ok: false, error: BodyScanRead_signIn });
    sinon.assert.notCalled(fetchStub);
    (CloudStore.load as sinon.SinonStub).resolves({
      version: 1,
      session: { email: "a@example.com", userId: "u", accessToken: "a", refreshToken: "r", expiresAt: now + 3600000 },
    });
    fetchStub.resolves(new Response("{}", { status: 401 }));
    expect(await FoodApi_readBodyScan(image)).to.deep.equal({ ok: false, error: BodyScanRead_signIn });
  });

  it("preserves the shared cap message and sends no photo when AI consent is off", async () => {
    const cap = { reason: "week", used: { day: 0, week: 10 }, caps: { day: 3, week: 10 }, weekFreesIn: 2 };
    fetchStub.resolves(new Response(JSON.stringify(cap), { status: 429 }));
    expect(await FoodApi_readBodyScan(image)).to.deep.equal({ ok: false, error: AiCaps_refusalText(cap) });
    fetchStub.resetHistory();
    (AiConsentStore.load as sinon.SinonStub).resolves(AiConsent_decide(false, now));
    expect((await FoodApi_readBodyScan(image)).ok).to.equal(false);
    sinon.assert.notCalled(fetchStub);
  });
});
