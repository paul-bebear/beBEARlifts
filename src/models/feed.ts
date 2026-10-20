import { IFriendsState, IProfile } from "./friends";
import { IWorkoutPostSummary, WorkoutPost_parse } from "./workoutPost";

export interface IFeedPost {
  userId: string;
  workoutId: number;
  postedAt: number;
  summary: IWorkoutPostSummary;
}

export type IFeedOp =
  | { type: "post"; userId: string; workoutId: number; queuedAt: number; summary: IWorkoutPostSummary }
  | { type: "remove"; userId: string; workoutId: number; queuedAt: number };

export interface IFeedState {
  version: 1;
  userId?: string;
  posts: IFeedPost[];
  loadedAt?: number;
  shareByDefault?: boolean;
  outbox: IFeedOp[];
}

export interface IFeedItem {
  post: IFeedPost;
  author: IProfile;
  isMine: boolean;
}

export type IFeedShareStatus = "shared" | "sending" | "notShared";

export const Feed_limit = 50;

export function Feed_empty(): IFeedState {
  return { version: 1, posts: [], outbox: [] };
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && isFinite(value) ? value : undefined;
}

function parsePost(raw: unknown): IFeedPost | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  const userId = typeof (r.user_id ?? r.userId) === "string" ? String(r.user_id ?? r.userId) : undefined;
  const workoutId = num(r.workout_id ?? r.workoutId);
  const postedAt = typeof r.posted_at === "string" ? Date.parse(r.posted_at) : (num(r.postedAt) ?? Number.NaN);
  const summary = WorkoutPost_parse(r.summary);
  return userId != null && workoutId != null && isFinite(postedAt) && summary != null
    ? { userId, workoutId, postedAt, summary }
    : undefined;
}

function sortPosts(posts: IFeedPost[]): IFeedPost[] {
  return [...posts].sort((a, b) => b.postedAt - a.postedAt).slice(0, Feed_limit);
}

function parseOp(raw: unknown): IFeedOp | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  const workoutId = num(r.workoutId);
  const queuedAt = num(r.queuedAt);
  const userId = typeof r.userId === "string" ? r.userId : undefined;
  if (workoutId == null || queuedAt == null || userId == null) {
    return undefined;
  }
  if (r.type === "remove") {
    return { type: "remove", userId, workoutId, queuedAt };
  }
  const summary = WorkoutPost_parse(r.summary);
  return r.type === "post" && summary != null ? { type: "post", userId, workoutId, queuedAt, summary } : undefined;
}

export function Feed_parse(raw: unknown): IFeedState {
  const r = (raw ?? {}) as Record<string, unknown>;
  const state = Feed_empty();
  if (typeof r.userId === "string") {
    state.userId = r.userId;
    state.posts = sortPosts((Array.isArray(r.posts) ? r.posts : []).map(parsePost).filter((p) => p != null));
    state.loadedAt = num(r.loadedAt);
  }
  if (typeof r.shareByDefault === "boolean") {
    state.shareByDefault = r.shareByDefault;
  }
  state.outbox = (Array.isArray(r.outbox) ? r.outbox : []).map(parseOp).filter((o) => o != null);
  return state;
}

export function Feed_withServerPosts(state: IFeedState, userId: string, rows: unknown, now: number): IFeedState {
  const posts = (Array.isArray(rows) ? rows : []).map(parsePost).filter((p) => p != null);
  return { ...state, userId, posts: sortPosts(posts), loadedAt: now };
}

// One pending change per workout. A later toggle replaces an earlier one that has not been sent yet.
export function Feed_queue(state: IFeedState, op: IFeedOp): IFeedState {
  const others = state.outbox.filter((o) => !(o.userId === op.userId && o.workoutId === op.workoutId));
  return { ...state, outbox: [...others, op] };
}

// An op waits for the account that queued it, so a sign-in switch never posts under the other account.
export function Feed_nextOp(state: IFeedState, userId: string): IFeedOp | undefined {
  return state.outbox.find((o) => o.userId === userId);
}

export function Feed_setShareByDefault(state: IFeedState, share: boolean): IFeedState {
  return { ...state, shareByDefault: share };
}

// The cached feed changes at once, so the user's own post shows or goes even before a refresh.
export function Feed_sent(state: IFeedState, op: IFeedOp, now: number): IFeedState {
  const { userId, workoutId } = op;
  const outbox = state.outbox.filter(
    (o) => !(o.userId === userId && o.workoutId === workoutId && o.queuedAt === op.queuedAt)
  );
  const others = state.posts.filter((p) => !(p.userId === userId && p.workoutId === workoutId));
  const posts =
    op.type === "post" ? sortPosts([{ userId, workoutId, postedAt: now, summary: op.summary }, ...others]) : others;
  return state.userId == null || state.userId === userId ? { ...state, userId, outbox, posts } : { ...state, outbox };
}

export function Feed_shouldShareOnFinish(state: IFeedState, userId: string, workoutId: number): boolean {
  return state.shareByDefault === true && Feed_shareStatus(state, userId, workoutId) === "notShared";
}

export function Feed_shareStatus(state: IFeedState, userId: string, workoutId: number): IFeedShareStatus {
  const pending = state.outbox.find((o) => o.userId === userId && o.workoutId === workoutId);
  if (pending != null) {
    return pending.type === "post" ? "sending" : "notShared";
  }
  return state.userId === userId && state.posts.some((p) => p.userId === userId && p.workoutId === workoutId)
    ? "shared"
    : "notShared";
}

// Posts from someone no longer a friend can stay in the cache until the next refresh. The feed hides them at once.
export function Feed_items(state: IFeedState, friends: IFriendsState): IFeedItem[] {
  if (state.userId == null || state.userId !== friends.userId) {
    return [];
  }
  const authors = new Map<string, IProfile>();
  for (const link of friends.links) {
    if (link.status === "accepted") {
      authors.set(link.other.userId, link.other);
    }
  }
  const result: IFeedItem[] = [];
  for (const post of state.posts) {
    const isMine = post.userId === state.userId;
    const author = isMine ? friends.me : authors.get(post.userId);
    if (author != null) {
      result.push({ post, author, isMine });
    }
  }
  return result;
}

export function Feed_ago(then: number, now: number): string {
  const minutes = Math.max(0, Math.floor((now - then) / 60000));
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} h ago`;
  }
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}
