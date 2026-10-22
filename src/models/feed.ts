import { IFriendsState, IProfile } from "./friends";
import { IMealPost, IMealPostDraft, MealPost_parse, MealPost_parseDraft, MealPost_photoPath } from "./mealPost";
import { IPostBear, IWorkoutPostSummary, WorkoutPost_parse } from "./workoutPost";

export interface IFeedPost {
  id?: number;
  userId: string;
  workoutId: number;
  postedAt: number;
  summary: IWorkoutPostSummary;
}

export type IFeedOp =
  | { type: "post"; userId: string; workoutId: number; queuedAt: number; summary: IWorkoutPostSummary }
  | { type: "remove"; userId: string; workoutId: number; queuedAt: number }
  | { type: "meal"; userId: string; queuedAt: number; meal: IMealPostDraft; photo?: string };

export interface IFeedState {
  version: 1;
  userId?: string;
  posts: IFeedPost[];
  meals: IMealPost[];
  loadedAt?: number;
  outbox: IFeedOp[];
}

interface IFeedItemBase {
  author: IProfile;
  isMine: boolean;
  bear?: IPostBear;
}

export type IFeedItem =
  | (IFeedItemBase & { kind: "workout"; post: IFeedPost })
  | (IFeedItemBase & { kind: "meal"; post: IMealPost });

export type IFeedReportTarget = { kind: "workout"; id: number } | { kind: "meal"; id: string };

export type IFeedShareStatus = "shared" | "sending" | "notShared";

export type IFeedScreenView = "feed" | "people";

export const Feed_limit = 50;
const Feed_staleMs = 10 * 60000;

const jpegDataUrl = /^data:image\/jpeg;base64,/;

export function Feed_empty(): IFeedState {
  return { version: 1, posts: [], meals: [], outbox: [] };
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
    ? { id: num(r.id), userId, workoutId, postedAt, summary }
    : undefined;
}

function newestFirst<T extends { postedAt: number }>(posts: T[]): T[] {
  return [...posts].sort((a, b) => b.postedAt - a.postedAt).slice(0, Feed_limit);
}

export function Feed_parseMeals(rows: unknown): IMealPost[] {
  return newestFirst((Array.isArray(rows) ? rows : []).map(MealPost_parse).filter((p) => p != null));
}

function parseOp(raw: unknown): IFeedOp | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  const queuedAt = num(r.queuedAt);
  const userId = typeof r.userId === "string" ? r.userId : undefined;
  if (queuedAt == null || userId == null) {
    return undefined;
  }
  if (r.type === "meal") {
    const meal = MealPost_parseDraft(r.meal);
    const photo = typeof r.photo === "string" && jpegDataUrl.test(r.photo) ? r.photo : undefined;
    return meal != null ? { type: "meal", userId, queuedAt, meal, ...(photo != null ? { photo } : {}) } : undefined;
  }
  const workoutId = num(r.workoutId);
  if (workoutId == null) {
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
    state.posts = newestFirst((Array.isArray(r.posts) ? r.posts : []).map(parsePost).filter((p) => p != null));
    state.meals = Feed_parseMeals(r.meals);
    state.loadedAt = num(r.loadedAt);
  }
  state.outbox = (Array.isArray(r.outbox) ? r.outbox : []).map(parseOp).filter((o) => o != null);
  return state;
}

export function Feed_withServerPosts(state: IFeedState, userId: string, rows: unknown, now: number): IFeedState {
  const posts = (Array.isArray(rows) ? rows : []).map(parsePost).filter((p) => p != null);
  const meals = state.userId === userId ? state.meals : [];
  return { ...state, userId, posts: newestFirst(posts), meals, loadedAt: now };
}

export function Feed_withServerMeals(state: IFeedState, userId: string, meals: IMealPost[]): IFeedState {
  return state.userId === userId ? { ...state, meals: newestFirst(meals) } : state;
}

function opKey(op: IFeedOp): string {
  return op.type === "meal" ? `meal:${op.meal.id}` : `workout:${op.workoutId}`;
}

// One pending change per workout. A later toggle replaces an earlier one that has not been sent yet.
export function Feed_queue(state: IFeedState, op: IFeedOp): IFeedState {
  const others = state.outbox.filter((o) => !(o.userId === op.userId && opKey(o) === opKey(op)));
  return { ...state, outbox: [...others, op] };
}

// An op waits for the account that queued it, so a sign-in switch never posts under the other account.
export function Feed_pendingOps(state: IFeedState, userId: string): IFeedOp[] {
  return state.outbox.filter((o) => o.userId === userId);
}

// The cached feed changes at once, so the user's own post shows or goes even before a refresh.
export function Feed_sent(state: IFeedState, op: IFeedOp, now: number): IFeedState {
  const { userId } = op;
  const outbox = state.outbox.filter(
    (o) => !(o.userId === userId && opKey(o) === opKey(op) && o.queuedAt === op.queuedAt)
  );
  if (state.userId != null && state.userId !== userId) {
    return { ...state, outbox };
  }
  if (op.type === "meal") {
    const mine: IMealPost = {
      ...op.meal,
      userId,
      postedAt: now,
      ...(op.photo != null ? { photoPath: MealPost_photoPath(userId, op.meal.id) } : {}),
    };
    const meals = newestFirst([mine, ...state.meals.filter((m) => m.id !== op.meal.id)]);
    return { ...state, userId, outbox, meals };
  }
  const { workoutId } = op;
  const others = state.posts.filter((p) => !(p.userId === userId && p.workoutId === workoutId));
  const posts =
    op.type === "post" ? newestFirst([{ userId, workoutId, postedAt: now, summary: op.summary }, ...others]) : others;
  return { ...state, userId, outbox, posts };
}

export function Feed_shareStatus(state: IFeedState, userId: string, workoutId: number): IFeedShareStatus {
  const pending = state.outbox.find((o) => o.userId === userId && o.type !== "meal" && o.workoutId === workoutId);
  if (pending != null) {
    return pending.type === "post" ? "sending" : "notShared";
  }
  return state.userId === userId && state.posts.some((p) => p.userId === userId && p.workoutId === workoutId)
    ? "shared"
    : "notShared";
}

// Posts from someone no longer a friend can stay in the cache until the next refresh. The feed hides them at once.
// A meal row carries no bear, so it borrows the bear from the author's newest workout post.
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
  const bears = new Map<string, IPostBear>();
  for (const post of state.posts) {
    if (post.summary.bear != null && !bears.has(post.userId)) {
      bears.set(post.userId, post.summary.bear);
    }
  }
  const authorOf = (userId: string): IProfile | undefined =>
    userId === state.userId ? friends.me : authors.get(userId);
  const result: IFeedItem[] = [];
  for (const post of state.posts) {
    const author = authorOf(post.userId);
    if (author != null) {
      const isMine = post.userId === state.userId;
      const bear = post.summary.bear ?? bears.get(post.userId);
      result.push({ kind: "workout", post, author, isMine, bear });
    }
  }
  for (const post of state.meals) {
    const author = authorOf(post.userId);
    if (author != null) {
      const isMine = post.userId === state.userId;
      result.push({ kind: "meal", post, author, isMine, bear: bears.get(post.userId) });
    }
  }
  return result.sort((a, b) => b.post.postedAt - a.post.postedAt);
}

export function Feed_itemKey(item: IFeedItem): string {
  return item.kind === "meal" ? `meal-${item.post.id}` : `${item.post.userId}-${item.post.workoutId}`;
}

export function Feed_reportTarget(item: IFeedItem): IFeedReportTarget | undefined {
  if (item.kind === "meal") {
    return { kind: "meal", id: item.post.id };
  }
  return item.post.id != null ? { kind: "workout", id: item.post.id } : undefined;
}

// The TV reads the cache and asks for a refresh at most every 10 minutes, so visiting My bear stays offline-friendly.
export function Feed_needsRefresh(state: IFeedState, userId: string | undefined, now: number): boolean {
  return userId != null && (state.userId !== userId || state.loadedAt == null || now - state.loadedAt > Feed_staleMs);
}

// With no friends yet, the screen opens on the friends part, so "Add a friend" is the first thing (U28).
export function Feed_screenView(chosen: IFeedScreenView | undefined, friendCount: number): IFeedScreenView {
  return chosen ?? (friendCount === 0 ? "people" : "feed");
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
