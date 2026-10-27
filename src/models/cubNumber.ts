export interface ICubState {
  version: 1;
  userId?: string;
  number?: number;
  fetchedAt?: number;
}

export interface ICubShareText {
  title: string;
  handle?: string;
}

const refetchMs = 24 * 3600 * 1000;

function cubNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

export function CubNumber_empty(): ICubState {
  return { version: 1 };
}

export function CubNumber_parse(raw: unknown): ICubState {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (typeof r.userId !== "string") {
    return CubNumber_empty();
  }
  const fetchedAt = typeof r.fetchedAt === "number" && isFinite(r.fetchedAt) ? r.fetchedAt : undefined;
  return { version: 1, userId: r.userId, number: cubNumber(r.number), fetchedAt };
}

export function CubNumber_parseNumber(value: unknown): number | undefined {
  return cubNumber(value);
}

export function CubNumber_label(number: number): string {
  return `Cub ${number}`;
}

export function CubNumber_mine(state: ICubState, session: { userId: string } | undefined): number | undefined {
  return session != null && state.userId === session.userId ? state.number : undefined;
}

export function CubNumber_plate(state: ICubState, session: { userId: string } | undefined): string {
  const number = CubNumber_mine(state, session);
  return number == null ? "?" : `${number}`;
}

export function CubNumber_needsFetch(state: ICubState, session: { userId: string } | undefined, now: number): boolean {
  if (session == null) {
    return false;
  }
  return (
    state.userId !== session.userId ||
    state.number == null ||
    state.fetchedAt == null ||
    now - state.fetchedAt > refetchMs
  );
}

// The friends policy lets a signed-in user read friends' rows too, so the answer is matched by user id.
// An answer without the user's row keeps no number, and the plate reads "?" until the next fetch.
export function CubNumber_fromRows(raw: unknown, userId: string, now: number): ICubState {
  const rows = Array.isArray(raw) ? raw : [];
  const row = rows.find((item) => ((item ?? {}) as Record<string, unknown>).user_id === userId) as
    | Record<string, unknown>
    | undefined;
  const number = cubNumber(row?.number);
  return number == null ? { version: 1, userId } : { version: 1, userId, number, fetchedAt: now };
}

export function CubNumber_shareText(number: number, handle: string | undefined): ICubShareText {
  return { title: `I'm ${CubNumber_label(number)} on beBEAR`, handle: handle == null ? undefined : `@${handle}` };
}
