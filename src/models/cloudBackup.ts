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
  // The cloud has no workout or food the phone lacks, but another device wrote it after this phone's last upload.
  otherDevice?: true;
}

export interface ICloudState {
  version: 1;
  session?: ICloudSession;
  lastBackupAt?: number;
  // exportedAt of the cloud file this phone last wrote or restored. A different one means another phone wrote it.
  syncedExportedAt?: string;
  backedUpWorkouts?: string;
  backedUpStores?: string;
  // The account whose data this phone holds. It survives sign-out, so the next account is asked before an upload.
  ownerUserId?: string;
  uploadDeclinedFor?: string;
  uploadedPhotos?: number[];
  restoreOffer?: ICloudRestoreOffer;
  pending?: IOAuthPending;
  signInError?: string;
}

export interface ICloudStoresInput {
  food: Array<{ createdAt: number }>;
  notes: Array<{ updatedAt: number }>;
  runs: Array<{ endedAt: number }>;
  scans: Array<{ timestamp: number }>;
  checkIns: string[];
  photos: Array<{ timestamp: number }>;
}

export type ICloudOwnerCheck = { kind: "upload" } | { kind: "skip" } | { kind: "ask"; question: string };

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
  if (str(r.backedUpStores) != null) {
    state.backedUpStores = r.backedUpStores as string;
  }
  if (str(r.ownerUserId) != null) {
    state.ownerUserId = r.ownerUserId as string;
  }
  if (str(r.uploadDeclinedFor) != null) {
    state.uploadDeclinedFor = r.uploadDeclinedFor as string;
  }
  if (Array.isArray(r.uploadedPhotos)) {
    state.uploadedPhotos = r.uploadedPhotos.filter((id): id is number => typeof id === "number");
  }
  const offer = (r.restoreOffer ?? undefined) as Record<string, unknown> | undefined;
  const cloud = summary(offer?.cloud);
  const phone = summary(offer?.phone);
  if (cloud != null && phone != null) {
    state.restoreOffer = offer?.otherDevice === true ? { cloud, phone, otherDevice: true } : { cloud, phone };
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

function newest<T>(items: T[], time: (item: T) => number): number {
  return items.reduce((max, item) => Math.max(max, time(item)), 0);
}

// Counts catch a delete and the newest time catches an add or an edit, without reading every entry's content.
export function CloudBackup_storesMark(stores: ICloudStoresInput): string {
  const days = [...stores.checkIns].sort();
  return [
    `food:${stores.food.length}:${newest(stores.food, (e) => e.createdAt)}`,
    `notes:${stores.notes.length}:${newest(stores.notes, (n) => n.updatedAt)}`,
    `runs:${stores.runs.length}:${newest(stores.runs, (r) => r.endedAt)}`,
    `scans:${stores.scans.length}:${newest(stores.scans, (s) => s.timestamp)}`,
    `checkIns:${days.length}:${days[days.length - 1] ?? ""}`,
    `photos:${stores.photos.length}:${newest(stores.photos, (p) => p.timestamp)}`,
  ].join("|");
}

function hasData(history: IWorkoutLike[], stores: ICloudStoresInput): boolean {
  return (
    history.length > 0 ||
    stores.food.length > 0 ||
    stores.notes.length > 0 ||
    stores.runs.length > 0 ||
    stores.scans.length > 0 ||
    stores.checkIns.length > 0 ||
    stores.photos.length > 0
  );
}

// A fresh install holds nothing, and backing it up would replace the real backup with an empty one.
export function CloudBackup_isAutoDue(state: ICloudState, history: IWorkoutLike[], stores: ICloudStoresInput): boolean {
  if (state.session == null || state.restoreOffer != null || !hasData(history, stores)) {
    return false;
  }
  if (state.uploadDeclinedFor != null && state.uploadDeclinedFor === state.session.userId) {
    return false;
  }
  const latest = history[0];
  return (
    state.lastBackupAt == null ||
    (latest != null && state.lastBackupAt < (latest.endTime ?? latest.startTime)) ||
    state.backedUpWorkouts !== CloudBackup_workoutsMark(history) ||
    state.backedUpStores !== CloudBackup_storesMark(stores)
  );
}

// An automatic backup stays quiet after a "No". "Back up now" asks again.
export function CloudBackup_ownerCheck(state: ICloudState, manual: boolean): ICloudOwnerCheck {
  const session = state.session;
  if (session == null || state.ownerUserId == null || state.ownerUserId === session.userId) {
    return { kind: "upload" };
  }
  if (!manual && state.uploadDeclinedFor === session.userId) {
    return { kind: "skip" };
  }
  return { kind: "ask", question: CloudBackup_ownerQuestion(session.email) };
}

export function CloudBackup_ownerQuestion(email: string): string {
  return (
    `Upload this phone's data to ${email}?\n\n` +
    "This phone holds data from another account that signed in here before. " +
    "Choose Cancel if it is not yours, then sign out."
  );
}

export function CloudBackup_ownerAnswer(state: ICloudState, upload: boolean): ICloudState {
  const userId = state.session?.userId;
  if (userId == null) {
    return state;
  }
  return upload
    ? { ...state, ownerUserId: userId, uploadDeclinedFor: undefined }
    : { ...state, uploadDeclinedFor: userId };
}

// uploadedPhotos lists the owner's cloud photos, so a photo deleted while signed out still leaves the cloud later.
export function CloudBackup_afterSignOut(state: ICloudState): ICloudState {
  if (state.ownerUserId == null) {
    return CloudBackup_empty();
  }
  return { ...CloudBackup_empty(), ownerUserId: state.ownerUserId, uploadedPhotos: state.uploadedPhotos };
}

export function CloudBackup_afterSignIn(state: ICloudState, session: ICloudSession): ICloudState {
  if (state.session?.userId === session.userId) {
    return { ...state, session };
  }
  const { uploadedPhotos, ...kept } = CloudBackup_afterSignOut(state);
  return kept.ownerUserId === session.userId ? { ...kept, uploadedPhotos, session } : { ...kept, session };
}

export function CloudBackup_canSyncPhotos(state: ICloudState): boolean {
  return state.session != null && state.restoreOffer == null && state.ownerUserId === state.session.userId;
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
