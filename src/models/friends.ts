export interface IFriendshipKey {
  user_a: string;
  user_b: string;
}

export interface IFriendPerson {
  userId: string;
  username: string;
  key: IFriendshipKey;
}

export interface IFriendLists {
  incoming: IFriendPerson[];
  outgoing: IFriendPerson[];
  accepted: IFriendPerson[];
}

const usernamePattern = /^[a-z0-9_]{3,20}$/;

export function Friends_normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export function Friends_usernameError(username: string): string | undefined {
  if (username.length < 3 || username.length > 20) {
    return "Use 3 to 20 characters.";
  }
  return usernamePattern.test(username) ? undefined : "Use only letters, numbers and _.";
}

export function Friends_pair(me: string, other: string): IFriendshipKey {
  return me < other ? { user_a: me, user_b: other } : { user_a: other, user_b: me };
}

function usernameOf(raw: unknown): string | undefined {
  const username = (raw as Record<string, unknown> | null | undefined)?.username;
  return typeof username === "string" ? username : undefined;
}

export function Friends_parseRows(raw: unknown, me: string): IFriendLists {
  const lists: IFriendLists = { incoming: [], outgoing: [], accepted: [] };
  if (!Array.isArray(raw)) {
    return lists;
  }
  for (const item of raw) {
    const r = (item ?? {}) as Record<string, unknown>;
    const { user_a, user_b, requested_by, status } = r;
    if (typeof user_a !== "string" || typeof user_b !== "string" || (user_a !== me && user_b !== me)) {
      continue;
    }
    const isA = user_a === me;
    const userId = isA ? user_b : user_a;
    const username = usernameOf(isA ? r.b : r.a);
    if (username == null) {
      continue;
    }
    const person: IFriendPerson = { userId, username, key: { user_a, user_b } };
    if (status === "accepted") {
      lists.accepted.push(person);
    } else if (status === "pending") {
      (requested_by === me ? lists.outgoing : lists.incoming).push(person);
    }
  }
  for (const group of [lists.incoming, lists.outgoing, lists.accepted]) {
    group.sort((x, y) => x.username.localeCompare(y.username));
  }
  return lists;
}

export function Friends_requestAction(
  lists: IFriendLists,
  otherId: string,
  me: string
): "request" | "accept" | "already" | "self" {
  if (otherId === me) {
    return "self";
  }
  if (lists.incoming.some((p) => p.userId === otherId)) {
    return "accept";
  }
  const isKnown = [...lists.outgoing, ...lists.accepted].some((p) => p.userId === otherId);
  return isKnown ? "already" : "request";
}

export function Friends_feedAuthorIds(lists: IFriendLists, me: string): string[] {
  return [me, ...lists.accepted.map((p) => p.userId)];
}
