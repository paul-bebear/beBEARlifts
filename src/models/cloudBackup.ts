import { IOAuthPending, OAuthFlow_parsePending } from "./oauthFlow";

export interface ICloudSession {
  email: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface ICloudBackupSummary {
  exportedAt?: string;
  workouts: number;
  foodDays: number;
}

export interface ICloudRestoreOffer {
  cloud: ICloudBackupSummary;
  phone: ICloudBackupSummary;
}

export interface ICloudState {
  version: 1;
  session?: ICloudSession;
  lastBackupAt?: number;
  // exportedAt of the cloud file this phone last wrote or restored. A different one means another phone wrote it.
  syncedExportedAt?: string;
  backedUpWorkouts?: string;
  restoreOffer?: ICloudRestoreOffer;
  pending?: IOAuthPending;
  signInError?: string;
}

export type ICloudCopy = "latest" | "replaced" | `day-${number}`;

export interface ICloudCopyChoice {
  copy: ICloudCopy;
  label: string;
}

type IWorkoutLike = { id: number; startTime: number; endTime?: number };

const refreshMarginMs = 60 * 1000;
const catchUpGapMs = 30 * 1000;
const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
  if (str(r.syncedExportedAt) != null) {
    state.syncedExportedAt = r.syncedExportedAt as string;
  }
  if (str(r.backedUpWorkouts) != null) {
    state.backedUpWorkouts = r.backedUpWorkouts as string;
  }
  const offer = (r.restoreOffer ?? undefined) as Record<string, unknown> | undefined;
  const cloud = summary(offer?.cloud);
  const phone = summary(offer?.phone);
  if (cloud != null && phone != null) {
    state.restoreOffer = { cloud, phone };
  }
  const pending = OAuthFlow_parsePending(r.pending);
  if (pending != null) {
    state.pending = pending;
  }
  if (str(r.signInError) != null) {
    state.signInError = r.signInError as string;
  }
  return state;
}

function summary(raw: unknown): ICloudBackupSummary | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (typeof r.workouts !== "number" || typeof r.foodDays !== "number") {
    return undefined;
  }
  return { exportedAt: str(r.exportedAt), workouts: r.workouts, foodDays: r.foodDays };
}

export function CloudBackup_needsRefresh(session: ICloudSession, now: number): boolean {
  return session.expiresAt - now < refreshMarginMs;
}

// The count and the newest id, so a change shows even when the phone's clock was wrong at the last upload.
export function CloudBackup_workoutsMark(history: IWorkoutLike[]): string {
  return `${history.length}:${history[0]?.id ?? ""}`;
}

// A fresh install has no workouts, and backing it up would replace the real backup with an empty one.
export function CloudBackup_isAutoDue(state: ICloudState, history: IWorkoutLike[]): boolean {
  const latest = history[0];
  if (state.session == null || latest == null || state.restoreOffer != null) {
    return false;
  }
  return (
    state.lastBackupAt == null ||
    state.lastBackupAt < (latest.endTime ?? latest.startTime) ||
    state.backedUpWorkouts !== CloudBackup_workoutsMark(history)
  );
}

// latest.json is what a restore reads. The weekday copy keeps 7 days back in case a bad backup replaces it.
export function CloudBackup_paths(userId: string, now: number): { latest: string; daily: string } {
  return {
    latest: CloudBackup_path(userId, "latest"),
    daily: CloudBackup_path(userId, `day-${new Date(now).getDay()}`),
  };
}

export function CloudBackup_path(userId: string, copy: ICloudCopy): string {
  return `${userId}/${copy}.json`;
}

export function CloudBackup_olderCopies(now: number): ICloudCopyChoice[] {
  const today = new Date(now).getDay();
  const days = [0, 1, 2, 3, 4, 5, 6].map((back): ICloudCopyChoice => {
    const day = (today - back + 7) % 7;
    const name = weekdays[day];
    return { copy: `day-${day}`, label: back === 0 ? `Today's copy (${name})` : `${name}'s copy` };
  });
  return [...days, { copy: "replaced", label: "Copy saved before “Keep this phone's data”" }];
}

// The finish screen, the launch and every return to the app each ask for a catch-up within seconds of each other.
export function CloudBackup_isCatchUpDue(lastAt: number | undefined, now: number): boolean {
  return lastAt == null || now - lastAt >= catchUpGapMs;
}

export function CloudBackup_isEmail(text: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());
}

export function CloudBackup_isCode(text: string): boolean {
  return /^\d{6,10}$/.test(text.trim());
}
