import {
  Feed_empty,
  Feed_limit,
  Feed_parse,
  Feed_parseMeals,
  Feed_pendingOps,
  Feed_queue,
  Feed_sent,
  Feed_withServerMeals,
  Feed_withServerPosts,
  IFeedOp,
  IFeedReportTarget,
} from "../models/feed";
import { IWorkoutPostSummary } from "../models/workoutPost";
import {
  IMealPostDraft,
  MealPost_bucket,
  MealPost_jpegBytes,
  MealPost_photoPath,
  MealPost_photoUrlSeconds,
  MealPost_withPhotoUrls,
} from "../models/mealPost";
import { FeedModeration_reportError, IReportReason } from "../models/feedModeration";
import { JsonStore_create } from "./jsonStore";
import {
  CloudStore,
  ICloudResult,
  Supabase_origin,
  SupabaseClient_authed,
  SupabaseClient_json,
  SupabaseClient_readJson,
} from "./supabaseClient";

export const FeedStore = JsonStore_create("bebear_feed", Feed_parse, Feed_empty);

const ok: ICloudResult<undefined> = { ok: true, value: undefined };
const offline = "No connection";

// The photo goes up first, so a friend never sees a row whose photo is still missing.
// x-upsert and ignore-duplicates make a retry after a dropped answer land on the same object and row.
async function sendMeal(op: Extract<IFeedOp, { type: "meal" }>): Promise<ICloudResult<unknown>> {
  const photoPath = op.photo != null ? MealPost_photoPath(op.userId, op.meal.id) : undefined;
  const bytes = op.photo != null ? MealPost_jpegBytes(op.photo, atob) : undefined;
  if (photoPath != null && bytes != null) {
    const upload = await SupabaseClient_authed(`/storage/v1/object/${MealPost_bucket}/${photoPath}`, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg", "x-upsert": "true" },
      body: bytes,
    });
    if (!upload.ok) {
      return upload;
    }
  }
  const init = SupabaseClient_json({
    id: op.meal.id,
    description: op.meal.description,
    macros: op.meal.macros,
    photo_path: bytes != null ? photoPath : null,
  });
  return SupabaseClient_authed("/rest/v1/meal_posts?on_conflict=id", {
    ...init,
    headers: { ...(init.headers as Record<string, string>), Prefer: "resolution=ignore-duplicates,return=minimal" },
  });
}

async function send(op: IFeedOp): Promise<ICloudResult<unknown>> {
  if (op.type === "meal") {
    return sendMeal(op);
  }
  if (op.type === "remove") {
    return SupabaseClient_authed(`/rest/v1/workout_posts?workout_id=eq.${op.workoutId}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
  }
  const init = SupabaseClient_json({ workout_id: op.workoutId, summary: op.summary });
  return SupabaseClient_authed("/rest/v1/workout_posts?on_conflict=user_id,workout_id", {
    ...init,
    headers: { ...(init.headers as Record<string, string>), Prefer: "resolution=merge-duplicates,return=minimal" },
  });
}

async function flushOnce(): Promise<ICloudResult<undefined>> {
  const userId = (await CloudStore.load()).session?.userId;
  if (userId == null) {
    return ok;
  }
  let failed: ICloudResult<undefined> = ok;
  for (const op of Feed_pendingOps(await FeedStore.load(), userId)) {
    const result = await send(op);
    if (!result.ok && result.error === offline) {
      return result;
    }
    // A meal op the server refuses, for example before the meal_posts migration, stays queued
    // without holding back the workout ops behind it.
    if (!result.ok) {
      failed = failed.ok ? result : failed;
      continue;
    }
    await FeedStore.update((state) => Feed_sent(state, op, Date.now()));
  }
  return failed;
}

let flushing: Promise<ICloudResult<undefined>> | undefined;

// The finish screen and the Friends tab can both start a flush. One at a time keeps a post from going out twice.
export function FeedClient_flush(): Promise<ICloudResult<undefined>> {
  if (flushing == null) {
    flushing = flushOnce().finally(() => {
      flushing = undefined;
    });
  }
  return flushing;
}

export async function FeedClient_refresh(): Promise<ICloudResult<undefined>> {
  const flushed = await FeedClient_flush();
  if (!flushed.ok && flushed.error === offline) {
    return flushed;
  }
  const result = await SupabaseClient_authed(
    `/rest/v1/workout_posts?select=id,user_id,workout_id,posted_at,summary&order=posted_at.desc&limit=${Feed_limit}`,
    { method: "GET" }
  );
  if (!result.ok) {
    return result;
  }
  const rows = await SupabaseClient_readJson(result.value.response);
  await FeedStore.update((state) => Feed_withServerPosts(state, result.value.userId, rows, Date.now()));
  await refreshMeals();
  return ok;
}

// Meals load after workouts and fail quietly, so the workout feed keeps working before the meal_posts migration.
async function refreshMeals(): Promise<void> {
  const result = await SupabaseClient_authed(
    `/rest/v1/meal_posts?select=id,user_id,posted_at,description,macros,photo_path&order=posted_at.desc&limit=${Feed_limit}`,
    { method: "GET" }
  );
  if (!result.ok) {
    return;
  }
  const meals = Feed_parseMeals(await SupabaseClient_readJson(result.value.response));
  const paths = meals.flatMap((m) => (m.photoPath != null ? [m.photoPath] : []));
  let signed: unknown = [];
  if (paths.length > 0) {
    const sign = await SupabaseClient_authed(
      `/storage/v1/object/sign/${MealPost_bucket}`,
      SupabaseClient_json({ expiresIn: MealPost_photoUrlSeconds, paths })
    );
    signed = sign.ok ? await SupabaseClient_readJson(sign.value.response) : [];
  }
  const withUrls = MealPost_withPhotoUrls(meals, Supabase_origin, signed);
  await FeedStore.update((state) => Feed_withServerMeals(state, result.value.userId, withUrls));
}

export async function FeedClient_setShared(
  workoutId: number,
  summary: IWorkoutPostSummary | undefined
): Promise<ICloudResult<undefined>> {
  const userId = (await CloudStore.load()).session?.userId;
  if (userId == null) {
    return { ok: false, error: "Not signed in" };
  }
  const queuedAt = Date.now();
  const op: IFeedOp =
    summary != null
      ? { type: "post", userId, workoutId, queuedAt, summary }
      : { type: "remove", userId, workoutId, queuedAt };
  await FeedStore.update((state) => Feed_queue(state, op));
  return FeedClient_flush();
}

// The caller does not wait for the upload. The op sits in the outbox until a flush gets it out.
export async function FeedClient_shareMeal(meal: IMealPostDraft, photo: string | undefined): Promise<void> {
  const userId = (await CloudStore.load()).session?.userId;
  if (userId == null) {
    return;
  }
  const op: IFeedOp = { type: "meal", userId, queuedAt: Date.now(), meal, ...(photo != null ? { photo } : {}) };
  await FeedStore.update((state) => Feed_queue(state, op));
  FeedClient_flush().catch(() => undefined);
}

export async function FeedClient_report(
  target: IFeedReportTarget | undefined,
  reason: IReportReason,
  note: string
): Promise<ICloudResult<undefined>> {
  const error = FeedModeration_reportError(reason, note);
  if (error != null || target == null) {
    return { ok: false, error: error ?? "Refresh the feed before reporting this post." };
  }
  const post = target.kind === "meal" ? { meal_post_id: target.id } : { post_id: target.id };
  const init = SupabaseClient_json({ ...post, reason, note: note.trim() || null });
  const result = await SupabaseClient_authed("/rest/v1/post_reports", {
    ...init,
    headers: { ...(init.headers as Record<string, string>), Prefer: "return=minimal" },
  });
  return result.ok ? ok : result;
}
