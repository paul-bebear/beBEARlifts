export const ReportEmail_subject = "beBEAR: a post was reported";

const maxNoteLength = 2000;
const maxPostText = 200;
const ignoredTypes = ["UPDATE", "DELETE"];

function text(value) {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function reportOf(record) {
  const id = record?.id;
  const reporterId = text(record?.reporter_id);
  const postId = record?.post_id ?? undefined;
  const mealPostId = text(record?.meal_post_id);
  if ((typeof id !== "number" && typeof id !== "string") || reporterId == null) {
    return undefined;
  }
  if ((postId == null) === (mealPostId == null)) {
    return undefined;
  }
  return {
    id,
    reporterId,
    postId: postId == null ? undefined : postId,
    mealPostId,
    reason: text(record.reason) ?? "unknown",
    note: text(record.note)?.slice(0, maxNoteLength),
    createdAt: text(record.created_at),
  };
}

// A Supabase webhook body is { type, table, schema, record, old_record }. Only an INSERT on post_reports sends mail.
export function ReportEmail_classify(body) {
  if (body == null || typeof body !== "object" || body.table !== "post_reports") {
    return { kind: "invalid" };
  }
  if (ignoredTypes.includes(body.type)) {
    return { kind: "ignore" };
  }
  if (body.type !== "INSERT" || body.record == null || typeof body.record !== "object") {
    return { kind: "invalid" };
  }
  const report = reportOf(body.record);
  return report == null ? { kind: "invalid" } : { kind: "report", report };
}

export function ReportEmail_parse(body) {
  const result = ReportEmail_classify(body);
  return result.kind === "report" ? result.report : null;
}

export function ReportEmail_postLookup(report) {
  return report.mealPostId != null
    ? { table: "meal_posts", id: report.mealPostId, select: "description,photo_path" }
    : { table: "workout_posts", id: report.postId, select: "summary" };
}

export function ReportEmail_postFromRows(report, rows) {
  const row = Array.isArray(rows) ? rows[0] : undefined;
  if (row == null || typeof row !== "object") {
    return null;
  }
  if (report.mealPostId != null) {
    const description = text(row.description);
    return description == null ? null : { kind: "meal", description, hasPhoto: text(row.photo_path) != null };
  }
  const dayName = text(row.summary?.dayName);
  return dayName == null ? null : { kind: "workout", dayName, programName: text(row.summary?.programName) };
}

function clip(value) {
  return value.length > maxPostText ? `${value.slice(0, maxPostText)}…` : value;
}

function postLine(post) {
  if (post == null) {
    return "Post: could not be read. It may be deleted.";
  }
  if (post.kind === "meal") {
    const label = post.hasPhoto ? "a meal photo" : "a meal post";
    return `Post: ${label}, "${clip(post.description)}"`;
  }
  const program = post.programName == null ? "" : ` from ${post.programName}`;
  return `Post: a workout, "${clip(post.dayName)}"${program}`;
}

export function ReportEmail_build(report, post) {
  const target = report.mealPostId != null ? `meal post ${report.mealPostId}` : `workout post ${report.postId}`;
  const lines = [
    `Report ${report.id}`,
    `Reporter: ${report.reporterId}`,
    `Reported: ${target}`,
    `Reason: ${report.reason}`,
    `Note: ${report.note ?? "none"}`,
    `Created: ${report.createdAt ?? "unknown"}`,
    postLine(post),
  ];
  return { subject: ReportEmail_subject, text: `${lines.join("\n")}\n` };
}
