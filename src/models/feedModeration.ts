import { IFeedItem, IFeedPost } from "./feed";

export const FeedModeration_reasons = ["spam", "abuse", "other"] as const;
export type IReportReason = (typeof FeedModeration_reasons)[number];
export type IPostMenuItem = "Report post" | "Block user" | "Remove post";

export interface IBlockedUser {
  userId: string;
  displayName: string;
}

export interface IBlocksState {
  version: 1;
  userId?: string;
  users: IBlockedUser[];
}

export function FeedModeration_empty(): IBlocksState {
  return { version: 1, users: [] };
}

export function FeedModeration_parse(raw: unknown): IBlocksState {
  const r = (raw ?? {}) as Partial<IBlocksState>;
  return r.version === 1 && typeof r.userId === "string"
    ? {
        version: 1,
        userId: r.userId,
        users: (Array.isArray(r.users) ? r.users : []).filter(
          (u) => u != null && typeof u.userId === "string" && typeof u.displayName === "string"
        ),
      }
    : FeedModeration_empty();
}

export function FeedModeration_users(state: IBlocksState, userId?: string): IBlockedUser[] {
  return userId != null && state.userId === userId ? state.users : [];
}

export function FeedModeration_fromServer(userId: string, raw: unknown): IBlocksState {
  const users = (Array.isArray(raw) ? raw : []).flatMap((r) =>
    typeof r?.blocked_id === "string"
      ? [
          {
            userId: r.blocked_id,
            displayName: typeof r.blocked?.display_name === "string" ? r.blocked.display_name : r.blocked_id,
          },
        ]
      : []
  );
  return { version: 1, userId, users };
}

export function FeedModeration_filter<T extends Pick<IFeedPost, "userId">>(posts: T[], blocked: IBlockedUser[]): T[] {
  const ids = new Set(blocked.map((u) => u.userId));
  return posts.filter((post) => !ids.has(post.userId));
}

export function FeedModeration_items(items: IFeedItem[], blocked: IBlockedUser[]): IFeedItem[] {
  const blockedIds = new Set(blocked.map((u) => u.userId));
  return items.filter((i) => !blockedIds.has(i.post.userId));
}

// An own workout post goes away through the share switch on the workout, so only an own meal gets Remove.
export function FeedModeration_menu(item: Pick<IFeedItem, "isMine" | "kind">): IPostMenuItem[] {
  if (item.isMine) {
    return item.kind === "meal" ? ["Remove post"] : [];
  }
  return ["Report post", "Block user"];
}

export function FeedModeration_reportError(reason: string, note: string): string | undefined {
  return !FeedModeration_reasons.some((r) => r === reason)
    ? "Choose a report reason."
    : note.trim().length > 2000
      ? "Use at most 2000 characters in a report."
      : undefined;
}

// Postgres names the unique index in its error text. The user needs to know only that the report exists.
export function FeedModeration_alreadyReportedText(error: string): string {
  return /post_reports_reporter|duplicate key/i.test(error) ? "You already reported this post" : error;
}

export function FeedModeration_reportOutcome(result: { ok: true } | { ok: false; error: string }): {
  message: string;
  keepOpen: boolean;
} {
  return {
    message: result.ok ? "Thanks, we'll review it" : FeedModeration_alreadyReportedText(result.error),
    keepOpen: !result.ok,
  };
}
