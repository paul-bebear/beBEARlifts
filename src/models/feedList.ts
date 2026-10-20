import { IFeedCursor, IFeedPage, IFeedPost } from "./feedPost";

export interface IFeedListState {
  posts: IFeedPost[];
  next?: IFeedCursor;
  isEnd: boolean;
  status: "idle" | "loading" | "error";
  error?: string;
  requestId: number;
}

export function FeedList_empty(): IFeedListState {
  return { posts: [], isEnd: false, status: "idle", requestId: 0 };
}

export function FeedList_start(
  state: IFeedListState,
  mode: "refresh" | "more"
): { state: IFeedListState; cursor?: IFeedCursor; requestId?: number } {
  if (mode === "more" && (state.status === "loading" || state.isEnd || state.next == null)) {
    return { state };
  }
  const requestId = state.requestId + 1;
  const cursor = mode === "more" ? state.next : undefined;
  return { state: { ...state, status: "loading", error: undefined, requestId }, cursor, requestId };
}

export function FeedList_receive(
  state: IFeedListState,
  requestId: number,
  page: IFeedPage,
  mode: "refresh" | "more"
): IFeedListState {
  if (requestId !== state.requestId) {
    return state;
  }
  const kept = mode === "more" ? state.posts : [];
  const seen = new Set(kept.map((p) => p.id));
  const posts = [...kept, ...page.posts.filter((p) => !seen.has(p.id))];
  return { posts, next: page.next, isEnd: page.next == null, status: "idle", requestId };
}

export function FeedList_fail(state: IFeedListState, requestId: number, message: string): IFeedListState {
  return requestId !== state.requestId ? state : { ...state, status: "error", error: message };
}

export function FeedList_remove(state: IFeedListState, postId: string): IFeedListState {
  return { ...state, posts: state.posts.filter((p) => p.id !== postId) };
}
