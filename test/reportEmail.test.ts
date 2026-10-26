import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import {
  ReportEmail_build,
  ReportEmail_parse,
  ReportEmail_postFromRows,
  ReportEmail_postLookup,
  ReportEmail_subject,
} from "../api/_reportEmail.mjs";
import { POST as reportPost, GET as reportGet } from "../api/moderation/report.mjs";

const reporter = "11111111-1111-4111-8111-111111111111";
const mealId = "33333333-3333-4333-8333-333333333333";

function insert(record: object = {}): object {
  return {
    type: "INSERT",
    table: "post_reports",
    schema: "public",
    record: {
      id: 7,
      reporter_id: reporter,
      post_id: 42,
      meal_post_id: null,
      reason: "spam",
      note: "Selling pills",
      created_at: "2026-10-27T09:30:00Z",
      ...record,
    },
    old_record: null,
  };
}

describe("ReportEmail", () => {
  it("reads a workout post report from an insert", () => {
    expect(ReportEmail_parse(insert())).to.deep.equal({
      id: 7,
      reporterId: reporter,
      postId: 42,
      mealPostId: undefined,
      reason: "spam",
      note: "Selling pills",
      createdAt: "2026-10-27T09:30:00Z",
    });
  });

  it("reads a meal post report", () => {
    const report = ReportEmail_parse(insert({ post_id: null, meal_post_id: mealId, note: null }));
    expect(report?.mealPostId).to.equal(mealId);
    expect(report?.postId).to.equal(undefined);
    expect(report?.note).to.equal(undefined);
  });

  it("returns null for an update, a wrong table and a malformed record", () => {
    expect(ReportEmail_parse({ ...insert(), type: "UPDATE" })).to.equal(null);
    expect(ReportEmail_parse({ ...insert(), table: "user_blocks" })).to.equal(null);
    expect(ReportEmail_parse({ ...insert(), record: null })).to.equal(null);
    expect(ReportEmail_parse(insert({ reporter_id: undefined }))).to.equal(null);
    expect(ReportEmail_parse(insert({ meal_post_id: mealId }))).to.equal(null);
    expect(ReportEmail_parse("nope")).to.equal(null);
    expect(ReportEmail_parse(undefined)).to.equal(null);
  });

  it("picks the table to read the post from", () => {
    const workout = ReportEmail_parse(insert());
    const meal = ReportEmail_parse(insert({ post_id: null, meal_post_id: mealId }));
    expect(ReportEmail_postLookup(workout)).to.deep.equal({ table: "workout_posts", id: 42, select: "summary" });
    expect(ReportEmail_postLookup(meal)).to.deep.equal({
      table: "meal_posts",
      id: mealId,
      select: "description,photo_path",
    });
  });

  it("reads the post out of the rows", () => {
    const workout = ReportEmail_parse(insert());
    const meal = ReportEmail_parse(insert({ post_id: null, meal_post_id: mealId }));
    expect(ReportEmail_postFromRows(workout, [{ summary: { dayName: "Push A", programName: "PPL" } }])).to.deep.equal({
      kind: "workout",
      dayName: "Push A",
      programName: "PPL",
    });
    expect(ReportEmail_postFromRows(meal, [{ description: "Chicken rice", photo_path: "a/b.jpg" }])).to.deep.equal({
      kind: "meal",
      description: "Chicken rice",
      hasPhoto: true,
    });
    expect(ReportEmail_postFromRows(workout, [])).to.equal(null);
    expect(ReportEmail_postFromRows(meal, undefined)).to.equal(null);
  });

  it("builds the email text with the report fields and the post line", () => {
    const report = ReportEmail_parse(insert());
    const built = ReportEmail_build(report!, { kind: "workout", dayName: "Push A", programName: "PPL" });
    expect(built.subject).to.equal(ReportEmail_subject);
    expect(built.subject).to.equal("beBEAR: a post was reported");
    expect(built.text).to.equal(
      [
        "Report 7",
        `Reporter: ${reporter}`,
        "Reported: workout post 42",
        "Reason: spam",
        "Note: Selling pills",
        "Created: 2026-10-27T09:30:00Z",
        'Post: a workout, "Push A" from PPL',
        "",
      ].join("\n")
    );
  });

  it("says a meal post is a photo, and says when the post could not be read", () => {
    const report = ReportEmail_parse(insert({ post_id: null, meal_post_id: mealId, note: null }))!;
    const withPhoto = ReportEmail_build(report, { kind: "meal", description: "Chicken rice", hasPhoto: true });
    expect(withPhoto.text).to.contain(`Reported: meal post ${mealId}`);
    expect(withPhoto.text).to.contain("Note: none");
    expect(withPhoto.text).to.contain('Post: a meal photo, "Chicken rice"');
    expect(ReportEmail_build(report, null).text).to.contain("Post: could not be read. It may be deleted.");
  });
});

describe("api/moderation/report", () => {
  let fetchStub: sinon.SinonStub;
  const keys = [
    "REPORT_WEBHOOK_AUTH",
    "RESEND_API_KEY",
    "REPORT_EMAIL_FROM",
    "REPORT_EMAIL_TO",
    "SUPABASE_SERVICE_ROLE_KEY",
  ] as const;
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  beforeEach(() => {
    process.env.REPORT_WEBHOOK_AUTH = "Bearer hook";
    process.env.RESEND_API_KEY = "re_test";
    process.env.REPORT_EMAIL_FROM = "beBEAR <reports@paulbebear.com>";
    process.env.REPORT_EMAIL_TO = "support@paulbebear.com";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_test";
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

  function hook(body: unknown, authorization = "Bearer hook"): Request {
    return new Request("https://lifts.paulbebear.com/api/moderation/report", {
      method: "POST",
      headers: { authorization, "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  function stubPost(): void {
    fetchStub
      .withArgs(sinon.match(/rest\/v1\/workout_posts/))
      .resolves(new Response(JSON.stringify([{ summary: { dayName: "Push A" } }]), { status: 200 }));
  }

  it("sends one email for an insert and answers 200", async () => {
    stubPost();
    fetchStub.withArgs("https://api.resend.com/emails").resolves(new Response("{}", { status: 200 }));
    const response = await reportPost(hook(insert()));
    expect(response.status).to.equal(200);
    const send = fetchStub.getCalls().filter((c) => c.args[0] === "https://api.resend.com/emails");
    expect(send).to.have.length(1);
    const init = send[0].args[1];
    expect(init.headers.Authorization).to.equal("Bearer re_test");
    const mail = JSON.parse(init.body);
    expect(mail.from).to.equal("beBEAR <reports@paulbebear.com>");
    expect(mail.to).to.deep.equal(["support@paulbebear.com"]);
    expect(mail.subject).to.equal("beBEAR: a post was reported");
    expect(mail.text).to.contain('Post: a workout, "Push A"');
  });

  it("still sends the email when the post cannot be read", async () => {
    fetchStub.withArgs(sinon.match(/rest\/v1\//)).resolves(new Response("{}", { status: 500 }));
    fetchStub.withArgs("https://api.resend.com/emails").resolves(new Response("{}", { status: 200 }));
    expect((await reportPost(hook(insert()))).status).to.equal(200);
    const send = fetchStub.getCalls().find((c) => c.args[0] === "https://api.resend.com/emails")!;
    expect(JSON.parse(send.args[1].body).text).to.contain("Post: could not be read");
  });

  it("ignores an update with 200 and sends nothing", async () => {
    const response = await reportPost(hook({ ...(insert() as object), type: "UPDATE" }));
    expect(response.status).to.equal(200);
    expect(fetchStub.called).to.equal(false);
  });

  it("refuses a wrong header with 401 and a bad body with 400", async () => {
    expect((await reportPost(hook(insert(), "Bearer nope"))).status).to.equal(401);
    delete process.env.REPORT_WEBHOOK_AUTH;
    expect((await reportPost(hook(insert()))).status).to.equal(401);
    process.env.REPORT_WEBHOOK_AUTH = "Bearer hook";
    expect((await reportPost(hook("not json"))).status).to.equal(400);
    expect((await reportPost(hook({ type: "INSERT", table: "post_reports" }))).status).to.equal(400);
    expect((await reportPost(hook({ ...(insert() as object), table: "profiles" }))).status).to.equal(400);
    expect(fetchStub.called).to.equal(false);
  });

  it("answers 405 on other methods", async () => {
    expect(reportGet().status).to.equal(405);
  });

  it("answers 503 when Resend fails or the settings are missing", async () => {
    stubPost();
    fetchStub.withArgs("https://api.resend.com/emails").resolves(new Response("{}", { status: 422 }));
    expect((await reportPost(hook(insert()))).status).to.equal(503);
    fetchStub.withArgs("https://api.resend.com/emails").rejects(new Error("network"));
    expect((await reportPost(hook(insert()))).status).to.equal(503);
    delete process.env.RESEND_API_KEY;
    expect((await reportPost(hook(insert()))).status).to.equal(503);
  });
});
