import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import {
  Billing_entitlementRow,
  Billing_eventUserIds,
  Billing_isUserId,
  Billing_planAnswer,
  Billing_signInMessage,
  Billing_userFromAuth,
  Billing_webhookAuthorized,
} from "../api/_billing.mjs";
import { POST as syncPost } from "../api/billing/sync.mjs";
import { POST as webhookPost } from "../api/billing/revenuecat.mjs";

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const requestDate = "2026-10-24T12:00:00Z";
const later = "2026-11-24T12:00:00Z";
const earlier = "2026-10-01T12:00:00Z";

function subscriber(entitlement?: object, extra: object = {}): object {
  return {
    request_date: requestDate,
    subscriber: { entitlements: entitlement == null ? {} : { plus: entitlement }, ...extra },
  };
}

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const live = { allowSandbox: false };

function rowOf(body: object, options = live): NonNullable<ReturnType<typeof Billing_entitlementRow>["row"]> {
  const read = Billing_entitlementRow(200, body, options);
  if (!read.ok || read.row == null) {
    throw new Error("Expected a readable entitlement");
  }
  return read.row;
}

describe("api/_billing", () => {
  it("accepts only Supabase user ids", () => {
    expect(Billing_isUserId(userA)).to.equal(true);
    expect(Billing_isUserId("$RCAnonymousID:abc")).to.equal(false);
    expect(Billing_isUserId(undefined)).to.equal(false);
  });

  it("compares the webhook header with the secret", () => {
    expect(Billing_webhookAuthorized("Bearer s3cret", "Bearer s3cret")).to.equal(true);
    expect(Billing_webhookAuthorized("Bearer wrong!", "Bearer s3cret")).to.equal(false);
    expect(Billing_webhookAuthorized("Bearer s3cret", "")).to.equal(false);
    expect(Billing_webhookAuthorized(null, "Bearer s3cret")).to.equal(false);
  });

  it("collects every account a transfer touches, without anonymous ids or repeats", () => {
    const event = {
      type: "TRANSFER",
      app_user_id: "$RCAnonymousID:abc",
      transferred_from: [userA, "$RCAnonymousID:abc"],
      transferred_to: [userB, userB.toUpperCase()],
    };
    expect(Billing_eventUserIds(event)).to.deep.equal([userA, userB]);
    expect(Billing_eventUserIds({ app_user_id: userA, original_app_user_id: userA, aliases: [userB] })).to.deep.equal([
      userA,
      userB,
    ]);
    expect(Billing_eventUserIds(undefined)).to.deep.equal([]);
  });

  it("refuses an anonymous Supabase user", () => {
    expect(Billing_userFromAuth(200, { id: userA })).to.equal(userA);
    expect(Billing_userFromAuth(200, { id: userA, is_anonymous: true })).to.equal(undefined);
    expect(Billing_userFromAuth(401, { id: userA })).to.equal(undefined);
  });

  it("reads an active subscription and its end date", () => {
    const body = subscriber(
      { product_identifier: "bebear_plus_monthly", expires_date: later, grace_period_expires_date: null },
      { subscriptions: { bebear_plus_monthly: { is_sandbox: false } } }
    );
    expect(Billing_entitlementRow(200, body, live)).to.deep.equal({
      ok: true,
      row: {
        active: true,
        productId: "bebear_plus_monthly",
        expiresAt: "2026-11-24T12:00:00.000Z",
        sandbox: false,
        snapshotAt: "2026-10-24T12:00:00.000Z",
      },
    });
  });

  it("reads lifetime as active with no end date", () => {
    const body = subscriber(
      { product_identifier: "bebear_plus_lifetime", expires_date: null },
      { non_subscriptions: { bebear_plus_lifetime: [{ is_sandbox: false }] } }
    );
    expect(rowOf(body)).to.deep.include({ active: true, expiresAt: null });
  });

  it("keeps a subscription active through its billing grace period", () => {
    const body = subscriber({
      product_identifier: "bebear_plus_monthly",
      expires_date: earlier,
      grace_period_expires_date: later,
    });
    expect(rowOf(body)).to.deep.include({ active: true, expiresAt: "2026-11-24T12:00:00.000Z" });
  });

  it("reads an expired entitlement and a missing one as inactive", () => {
    expect(rowOf(subscriber({ product_identifier: "m", expires_date: earlier })).active).to.equal(false);
    expect(rowOf(subscriber())).to.deep.include({ active: false, productId: null, expiresAt: null });
  });

  it("keeps a cancelled subscription active until its end date", () => {
    const body = subscriber(
      { product_identifier: "bebear_plus_yearly", expires_date: later },
      { subscriptions: { bebear_plus_yearly: { unsubscribe_detected_at: earlier, is_sandbox: false } } }
    );
    expect(rowOf(body).active).to.equal(true);
  });

  it("honors a sandbox purchase only when sandbox is allowed", () => {
    const body = subscriber(
      { product_identifier: "bebear_plus_monthly", expires_date: later },
      { subscriptions: { bebear_plus_monthly: { is_sandbox: true } } }
    );
    expect(rowOf(body)).to.deep.include({ active: false, sandbox: true });
    expect(rowOf(body, { allowSandbox: true }).active).to.equal(true);
  });

  it("ends a sandbox lifetime purchase 7 days after the snapshot", () => {
    const body = subscriber(
      { product_identifier: "bebear_plus_lifetime", expires_date: null },
      { non_subscriptions: { bebear_plus_lifetime: [{ is_sandbox: true }] } }
    );
    expect(rowOf(body, { allowSandbox: true })).to.deep.include({
      active: true,
      sandbox: true,
      expiresAt: "2026-10-31T12:00:00.000Z",
    });
    expect(rowOf(body, live)).to.deep.include({ active: false, expiresAt: "2026-10-31T12:00:00.000Z" });
  });

  it("ends a sandbox subscription 7 days after the snapshot, not at its own end date", () => {
    const body = subscriber(
      { product_identifier: "bebear_plus_monthly", expires_date: later },
      { subscriptions: { bebear_plus_monthly: { is_sandbox: true } } }
    );
    expect(rowOf(body, { allowSandbox: true })).to.deep.include({
      active: true,
      sandbox: true,
      expiresAt: "2026-10-31T12:00:00.000Z",
    });
  });

  it("keeps a production lifetime purchase with no end date", () => {
    const body = subscriber(
      { product_identifier: "bebear_plus_lifetime", expires_date: null },
      { non_subscriptions: { bebear_plus_lifetime: [{ is_sandbox: false }] } }
    );
    expect(rowOf(body, { allowSandbox: true })).to.deep.include({ active: true, sandbox: false, expiresAt: null });
  });

  it("orders snapshots by milliseconds when RevenueCat sends them", () => {
    const first = rowOf({ ...subscriber(), request_date_ms: Date.parse(requestDate) + 100 });
    const second = rowOf({ ...subscriber(), request_date_ms: Date.parse(requestDate) + 900 });
    expect(first.snapshotAt).to.equal("2026-10-24T12:00:00.100Z");
    expect(second.snapshotAt > first.snapshotAt).to.equal(true);
  });

  it("reads the 201 answer RevenueCat sends when it creates the customer", () => {
    const read = Billing_entitlementRow(201, subscriber(), live);
    expect(read.ok && read.row?.active).to.equal(false);
  });

  it("writes nothing for an answer it cannot read", () => {
    expect(Billing_entitlementRow(500, subscriber(), live)).to.deep.equal({ ok: false });
    expect(Billing_entitlementRow(200, { subscriber: {} }, live)).to.deep.equal({ ok: false });
    expect(Billing_entitlementRow(200, undefined, live)).to.deep.equal({ ok: false });
    expect(
      Billing_entitlementRow(200, subscriber({ product_identifier: "m", expires_date: "not a date" }), live)
    ).to.deep.equal({ ok: false });
  });

  it("reads the plan answer from account_plan_effective", () => {
    expect(Billing_planAnswer({ plan: "plus", grant: "code", canManageSubscription: true })).to.deep.equal({
      plan: "plus",
      grant: "code",
      canManageSubscription: true,
    });
    expect(Billing_planAnswer({ plan: "free", grant: null })).to.deep.equal({
      plan: "free",
      grant: null,
      canManageSubscription: false,
    });
    expect(Billing_planAnswer({ plan: "plus", grant: null })).to.equal(undefined);
    expect(Billing_planAnswer({ plan: "gold" })).to.equal(undefined);
  });
});

describe("api/billing routes", () => {
  let fetchStub: sinon.SinonStub;
  const keys = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "REVENUECAT_SECRET_KEY",
    "REVENUECAT_WEBHOOK_AUTH",
    "BILLING_ALLOW_SANDBOX",
  ] as const;
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_test";
    process.env.REVENUECAT_SECRET_KEY = "sk_test";
    process.env.REVENUECAT_WEBHOOK_AUTH = "Bearer hook";
    delete process.env.BILLING_ALLOW_SANDBOX;
    fetchStub = sinon.stub(globalThis, "fetch");
  });
  afterEach(() => {
    sinon.restore();
    for (const key of keys) {
      if (saved[key] == null) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  });

  function stubRefresh(userId: string, plan: object): void {
    const customer = subscriber(
      { product_identifier: "bebear_plus_monthly", expires_date: later },
      { subscriptions: { bebear_plus_monthly: { is_sandbox: false } } }
    );
    fetchStub
      .withArgs(`https://api.revenuecat.com/v1/subscribers/${userId}`)
      .callsFake(() => Promise.resolve(reply(customer)));
    fetchStub.withArgs(sinon.match(/rpc\/store_entitlement_put$/)).callsFake(() => Promise.resolve(reply(true)));
    fetchStub.withArgs(sinon.match(/rpc\/account_plan_effective$/)).callsFake(() => Promise.resolve(reply(plan)));
  }

  function syncRequest(headers: Record<string, string> = { authorization: "Bearer user-jwt" }): Request {
    return new Request("https://lifts.paulbebear.com/api/billing/sync", { method: "POST", headers });
  }

  it("sync refreshes the signed-in user and answers the plan", async () => {
    fetchStub.withArgs(sinon.match(/auth\/v1\/user$/)).resolves(reply({ id: userA }));
    stubRefresh(userA, { plan: "plus", grant: "subscription", canManageSubscription: true });
    const response = await syncPost(syncRequest());
    expect(response.status).to.equal(200);
    expect(await response.json()).to.deep.equal({ plan: "plus", grant: "subscription", canManageSubscription: true });
    const put = fetchStub.getCalls().find((c) => String(c.args[0]).endsWith("store_entitlement_put"));
    expect(JSON.parse(put?.args[1].body)).to.deep.include({ p_user: userA, p_active: true });
  });

  it("sync refuses a missing token and an anonymous user", async () => {
    expect((await syncPost(syncRequest({}))).status).to.equal(401);
    fetchStub.withArgs(sinon.match(/auth\/v1\/user$/)).resolves(reply({ id: userA, is_anonymous: true }));
    const anonymous = await syncPost(syncRequest());
    expect(anonymous.status).to.equal(401);
    expect(await anonymous.json()).to.deep.equal({ error: Billing_signInMessage });
  });

  it("sync writes nothing when RevenueCat fails", async () => {
    fetchStub.withArgs(sinon.match(/auth\/v1\/user$/)).resolves(reply({ id: userA }));
    fetchStub.withArgs(sinon.match(/api\.revenuecat\.com/)).resolves(reply({}, 503));
    expect((await syncPost(syncRequest())).status).to.equal(502);
    expect(fetchStub.getCalls().some((c) => String(c.args[0]).includes("/rpc/"))).to.equal(false);
  });

  it("sync needs the service key", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect((await syncPost(syncRequest())).status).to.equal(500);
  });

  it("sync answers code grants without calling RevenueCat when it has no RevenueCat key", async () => {
    delete process.env.REVENUECAT_SECRET_KEY;
    fetchStub.withArgs(sinon.match(/auth\/v1\/user$/)).resolves(reply({ id: userA }));
    fetchStub
      .withArgs(sinon.match(/rpc\/account_plan_effective$/))
      .resolves(reply({ plan: "plus", grant: "code", canManageSubscription: false }));
    const response = await syncPost(syncRequest());
    expect(await response.json()).to.deep.equal({ plan: "plus", grant: "code", canManageSubscription: false });
    expect(fetchStub.getCalls().some((c) => String(c.args[0]).includes("revenuecat"))).to.equal(false);
  });

  function hook(body: unknown, authorization = "Bearer hook"): Request {
    return new Request("https://lifts.paulbebear.com/api/billing/revenuecat", {
      method: "POST",
      headers: { authorization, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("the webhook refreshes both accounts of a transfer", async () => {
    stubRefresh(userA, { plan: "free", grant: null });
    stubRefresh(userB, { plan: "plus", grant: "subscription" });
    const response = await webhookPost(
      hook({ event: { type: "TRANSFER", transferred_from: [userA], transferred_to: [userB] } })
    );
    expect(response.status).to.equal(200);
    expect(await response.json()).to.deep.equal({ refreshed: 2 });
  });

  it("the webhook refuses a wrong header and asks for a retry on a failed refresh", async () => {
    expect((await webhookPost(hook({ event: { app_user_id: userA } }, "Bearer nope"))).status).to.equal(401);
    fetchStub.withArgs(sinon.match(/api\.revenuecat\.com/)).resolves(reply({}, 500));
    expect((await webhookPost(hook({ event: { app_user_id: userA } }))).status).to.equal(503);
  });
});
