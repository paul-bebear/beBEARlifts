export interface ICloudSession {
  email: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface ICloudState {
  version: 1;
  session?: ICloudSession;
  lastBackupAt?: number;
}

const refreshMarginMs = 60 * 1000;

export function CloudBackup_empty(): ICloudState {
  return { version: 1 };
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

// Supabase Auth answers /verify and /token with the same shape: tokens, a lifetime in seconds, and the user.
export function CloudBackup_sessionFromAuth(raw: unknown, now: number): ICloudSession | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  const user = (r.user ?? {}) as Record<string, unknown>;
  const accessToken = str(r.access_token);
  const refreshToken = str(r.refresh_token);
  const userId = str(user.id);
  const email = str(user.email);
  const expiresIn = typeof r.expires_in === "number" ? r.expires_in : undefined;
  if (accessToken == null || refreshToken == null || userId == null || email == null || expiresIn == null) {
    return undefined;
  }
  return { email, userId, accessToken, refreshToken, expiresAt: now + expiresIn * 1000 };
}

export function CloudBackup_parse(raw: unknown): ICloudState {
  const r = (raw ?? {}) as Record<string, unknown>;
  const state: ICloudState = { version: 1 };
  const s = (r.session ?? {}) as Record<string, unknown>;
  if (
    str(s.email) != null &&
    str(s.userId) != null &&
    str(s.accessToken) != null &&
    str(s.refreshToken) != null &&
    typeof s.expiresAt === "number"
  ) {
    state.session = s as unknown as ICloudSession;
  }
  if (typeof r.lastBackupAt === "number") {
    state.lastBackupAt = r.lastBackupAt;
  }
  return state;
}

export function CloudBackup_needsRefresh(session: ICloudSession, now: number): boolean {
  return session.expiresAt - now < refreshMarginMs;
}

// A fresh install has no workouts, and backing it up would replace the real backup with an empty one.
export function CloudBackup_isAutoDue(state: ICloudState, lastWorkoutAt: number | undefined): boolean {
  if (state.session == null || lastWorkoutAt == null) {
    return false;
  }
  return state.lastBackupAt == null || state.lastBackupAt < lastWorkoutAt;
}

// latest.json is what a restore reads. The weekday copy keeps 7 days back in case a bad backup replaces it.
export function CloudBackup_paths(userId: string, now: number): { latest: string; daily: string } {
  return { latest: `${userId}/latest.json`, daily: `${userId}/day-${new Date(now).getDay()}.json` };
}

export function CloudBackup_isEmail(text: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());
}

export function CloudBackup_isCode(text: string): boolean {
  return /^\d{6,10}$/.test(text.trim());
}
