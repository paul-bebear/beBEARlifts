import { UnknownValue_text } from "./unknownValue";

export interface IProfile {
  userId: string;
  handle: string;
  displayName: string;
}

export type IFriendStatus = "pending" | "accepted";

export interface IFriendLink {
  other: IProfile;
  status: IFriendStatus;
  incoming: boolean;
  createdAt: string;
}

export interface IFriendsState {
  version: 1;
  userId?: string;
  me?: IProfile;
  links: IFriendLink[];
}

export interface IFriendsLists {
  friends: IFriendLink[];
  incoming: IFriendLink[];
  outgoing: IFriendLink[];
}

export const Friends_handlePattern = /^[a-z0-9_]{3,20}$/;
const maxDisplayName = 40;

export function Friends_empty(): IFriendsState {
  return { version: 1, links: [] };
}

export function Friends_normalizeHandle(text: string): string {
  return text.trim().replace(/^@/, "").toLowerCase();
}

export function Friends_handleError(text: string): string | undefined {
  const handle = Friends_normalizeHandle(text);
  if (handle.length < 3 || handle.length > 20) {
    return "A handle has 3 to 20 characters.";
  }
  return Friends_handlePattern.test(handle) ? undefined : "Use only letters, numbers and _ in a handle.";
}

export function Friends_displayNameError(text: string): string | undefined {
  return text.trim().length > maxDisplayName ? `A name has at most ${maxDisplayName} characters.` : undefined;
}

// Postgres names the unique index in its error text. The user needs to know only that someone has the handle.
export function Friends_errorText(error: string): string {
  return /profiles_handle_key|duplicate key/i.test(error) ? "Someone already has that handle." : error;
}

export type IAddSheetKind = "signedOut" | "loading" | "needsHandle" | "ready";

export function Friends_addSheetState(
  userId: string | undefined,
  hasLoaded: boolean,
  me: IProfile | undefined
): { kind: IAddSheetKind; buttonLabel: string } {
  if (userId == null) {
    return { kind: "signedOut", buttonLabel: "Sign in" };
  }
  if (!hasLoaded) {
    return { kind: "loading", buttonLabel: "See friends and requests" };
  }
  return me == null
    ? { kind: "needsHandle", buttonLabel: "Pick a handle" }
    : { kind: "ready", buttonLabel: "See friends and requests" };
}

function parseProfile(raw: unknown): IProfile | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  const userId = UnknownValue_text(r.user_id ?? r.userId);
  const handle = UnknownValue_text(r.handle);
  const displayName = UnknownValue_text(r.display_name ?? r.displayName) ?? handle;
  return userId != null && handle != null && displayName != null ? { userId, handle, displayName } : undefined;
}

// Rows come from two REST reads. Row-level policies already limit both to the signed-in user and the people they share a row with.
export function Friends_fromServer(userId: string, profilesRaw: unknown, friendshipsRaw: unknown): IFriendsState {
  const profiles = (Array.isArray(profilesRaw) ? profilesRaw : []).map(parseProfile);
  const byId = new Map<string, IProfile>();
  for (const profile of profiles) {
    if (profile != null) {
      byId.set(profile.userId, profile);
    }
  }
  const links: IFriendLink[] = [];
  for (const raw of Array.isArray(friendshipsRaw) ? friendshipsRaw : []) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const requester = UnknownValue_text(r.requester);
    const addressee = UnknownValue_text(r.addressee);
    const status = r.status === "accepted" || r.status === "pending" ? r.status : undefined;
    const incoming = addressee === userId;
    const other = byId.get((incoming ? requester : addressee) ?? "");
    if (status != null && other != null && (incoming || requester === userId)) {
      links.push({ other, status, incoming, createdAt: UnknownValue_text(r.created_at) ?? "" });
    }
  }
  return { version: 1, userId, me: byId.get(userId), links };
}

export function Friends_parse(raw: unknown): IFriendsState {
  const r = (raw ?? {}) as Record<string, unknown>;
  const userId = UnknownValue_text(r.userId);
  if (userId == null) {
    return Friends_empty();
  }
  const links: IFriendLink[] = [];
  for (const item of Array.isArray(r.links) ? r.links : []) {
    const l = (item ?? {}) as Record<string, unknown>;
    const other = parseProfile(l.other);
    if (other != null && (l.status === "pending" || l.status === "accepted")) {
      links.push({
        other,
        status: l.status,
        incoming: l.incoming === true,
        createdAt: UnknownValue_text(l.createdAt) ?? "",
      });
    }
  }
  return { version: 1, userId, me: parseProfile(r.me), links };
}

// A cached list from another account must not show after a sign-in switch.
export function Friends_forUser(state: IFriendsState, userId: string | undefined): IFriendsState {
  return userId != null && state.userId === userId ? state : Friends_empty();
}

function byName(a: IFriendLink, b: IFriendLink): number {
  return a.other.displayName.localeCompare(b.other.displayName);
}

export function Friends_lists(state: IFriendsState): IFriendsLists {
  return {
    friends: state.links.filter((l) => l.status === "accepted").sort(byName),
    incoming: state.links.filter((l) => l.status === "pending" && l.incoming).sort(byName),
    outgoing: state.links.filter((l) => l.status === "pending" && !l.incoming).sort(byName),
  };
}
