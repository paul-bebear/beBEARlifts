import {
  Feed_empty,
  Feed_limit,
  Feed_nextOp,
  Feed_parse,
  Feed_queue,
  Feed_sent,
  Feed_setShareByDefault,
  Feed_shouldShareOnFinish,
  Feed_withServerPosts,
  IFeedOp,
} from "../models/feed";
import { IWorkoutPostSummary } from "../models/workoutPost";
import { FeedModeration_reportError, IReportReason } from "../models/feedModeration";
import { JsonStore_create } from "./jsonStore";
import {
  CloudStore,
  ICloudResult,
  SupabaseClient_authed,
  SupabaseClient_json,
  SupabaseClient_readJson,
} from "./supabaseClient";

export const FeedStore = JsonStore_create("bebear_feed", Feed_parse, Feed_empty);

const ok: ICloudResult<undefined> = { ok: true, value: undefined };

async function send(op: IFeedOp): Promise<ICloudResult<unknown>> {
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
  const pending = (await FeedStore.load()).outbox.length;
  for (let i = 0; i < pending; i += 1) {
    const op = Feed_nextOp(await FeedStore.load(), userId);
    if (op == null) {
      return ok;
    }
    const result = await send(op);
    if (!result.ok) {
      return result;
    }
    await FeedStore.update((state) => Feed_sent(state, op, Date.now()));
  }
  return ok;
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
  if (!flushed.ok) {
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
  return ok;
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
  await FeedStore.update((state) => Feed_queue(Feed_setShareByDefault(state, summary != null), op));
  return FeedClient_flush();
}

export async function FeedClient_report(
  postId: number | undefined,
  reason: IReportReason,
  note: string
): Promise<ICloudResult<undefined>> {
  const error = FeedModeration_reportError(reason, note);
  if (error != null || postId == null) {
    return { ok: false, error: error ?? "Refresh the feed before reporting this post." };
  }
  const init = SupabaseClient_json({ post_id: postId, reason, note: note.trim() || null });
  const result = await SupabaseClient_authed("/rest/v1/post_reports", {
    ...init,
    headers: { ...(init.headers as Record<string, string>), Prefer: "return=minimal" },
  });
  return result.ok ? ok : result;
}

export async function FeedClient_shareOnFinish(
  workoutId: number,
  build: () => Promise<IWorkoutPostSummary>
): Promise<ICloudResult<undefined>> {
  const userId = (await CloudStore.load()).session?.userId;
  if (userId == null || !Feed_shouldShareOnFinish(await FeedStore.load(), userId, workoutId)) {
    return FeedClient_flush();
  }
  return FeedClient_setShared(workoutId, await build());
}
