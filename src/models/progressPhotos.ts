// On the iPhone the JPEG is a file named by id and the store keeps only the index (file: true).
// The web has no file system, so the store keeps the data URL.
export type IProgressPhoto = { id: number; timestamp: number } & ({ dataUrl: string } | { file: true });

export interface IProgressPhotoLog {
  version: 1;
  photos: IProgressPhoto[];
}

export interface IProgressPhotoIndexEntry {
  id: number;
  timestamp: number;
}

export interface IProgressPhotoMigration {
  files: Array<{ id: number; base64: string }>;
}

export interface IProgressPhotoSyncPlan {
  upload: number[];
  remove: number[];
}

export const ProgressPhotos_maxSide = 1080;
export const ProgressPhotos_maxPhotos = 200;
// A 1080 px JPEG at quality 0.8 is 100 to 250 KB. The cap stops one bad file from filling IndexedDB.
const ProgressPhotos_maxDataUrlLength = 1024 * 1024;
const dataUrlPrefix = "data:image/jpeg;base64,";

const dataUrlPattern = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;

export function ProgressPhotos_empty(): IProgressPhotoLog {
  return { version: 1, photos: [] };
}

function ProgressPhotos_isValidDataUrl(value: unknown): value is string {
  return typeof value === "string" && value.length <= ProgressPhotos_maxDataUrlLength && dataUrlPattern.test(value);
}

function isId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function parsePhoto(raw: unknown): IProgressPhoto | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (!isId(r.id) || typeof r.timestamp !== "number") {
    return undefined;
  }
  if (r.file === true) {
    return { id: r.id, timestamp: r.timestamp, file: true };
  }
  return ProgressPhotos_isValidDataUrl(r.dataUrl)
    ? { id: r.id, timestamp: r.timestamp, dataUrl: r.dataUrl }
    : undefined;
}

function sorted<T extends { timestamp: number }>(photos: T[]): T[] {
  return [...photos].sort((a, b) => b.timestamp - a.timestamp).slice(0, ProgressPhotos_maxPhotos);
}

export function ProgressPhotos_parse(raw: unknown): IProgressPhotoLog {
  const r = (raw ?? {}) as Record<string, unknown>;
  const photos = Array.isArray(r.photos) ? r.photos.map(parsePhoto).filter((p): p is IProgressPhoto => p != null) : [];
  return { version: 1, photos: sorted(photos) };
}

export function ProgressPhotos_isFull(log: IProgressPhotoLog): boolean {
  return log.photos.length >= ProgressPhotos_maxPhotos;
}

export const ProgressPhotos_fullMessage = `You have ${ProgressPhotos_maxPhotos} photos, the most this phone keeps. Delete one to add another.`;

export function ProgressPhotos_nextId(log: IProgressPhotoLog, now: number): number {
  return log.photos.some((p) => p.id === now) ? Math.max(...log.photos.map((p) => p.id)) + 1 : now;
}

export function ProgressPhotos_add(log: IProgressPhotoLog, dataUrl: string, now: number): IProgressPhotoLog {
  if (!ProgressPhotos_isValidDataUrl(dataUrl) || ProgressPhotos_isFull(log)) {
    return log;
  }
  return { ...log, photos: sorted([{ id: ProgressPhotos_nextId(log, now), timestamp: now, dataUrl }, ...log.photos]) };
}

export function ProgressPhotos_insert(log: IProgressPhotoLog, photo: IProgressPhoto): IProgressPhotoLog {
  const valid = "file" in photo || ProgressPhotos_isValidDataUrl(photo.dataUrl);
  if (!valid || ProgressPhotos_isFull(log) || log.photos.some((p) => p.id === photo.id)) {
    return log;
  }
  return { ...log, photos: sorted([photo, ...log.photos]) };
}

export function ProgressPhotos_remove(log: IProgressPhotoLog, id: number): IProgressPhotoLog {
  return { ...log, photos: log.photos.filter((p) => p.id !== id) };
}

export function ProgressPhotos_removeTakenAt(log: IProgressPhotoLog, timestamp: number): IProgressPhotoLog {
  return { ...log, photos: log.photos.filter((p) => p.timestamp !== timestamp) };
}

export function ProgressPhotos_base64(dataUrl: string): string | undefined {
  return ProgressPhotos_isValidDataUrl(dataUrl) ? dataUrl.slice(dataUrlPrefix.length) : undefined;
}

export function ProgressPhotos_dataUrl(base64: string): string | undefined {
  const dataUrl = `${dataUrlPrefix}${base64}`;
  return ProgressPhotos_isValidDataUrl(dataUrl) ? dataUrl : undefined;
}

export function ProgressPhotos_fileName(id: number): string {
  return `${id}.jpg`;
}

export function ProgressPhotos_uri(photo: IProgressPhoto, dir: string | undefined): string | undefined {
  if ("dataUrl" in photo) {
    return photo.dataUrl;
  }
  return dir != null ? `file://${dir}/${ProgressPhotos_fileName(photo.id)}` : undefined;
}

// Build 124 kept every photo as a data URL in one MMKV value. Each one becomes a file once.
export function ProgressPhotos_migration(log: IProgressPhotoLog): IProgressPhotoMigration {
  const files: IProgressPhotoMigration["files"] = [];
  for (const photo of log.photos) {
    const base64 = "dataUrl" in photo ? ProgressPhotos_base64(photo.dataUrl) : undefined;
    if (base64 != null) {
      files.push({ id: photo.id, base64 });
    }
  }
  return { files };
}

// Only photos whose file was written lose their data URL, so a failed write leaves that photo as it was.
export function ProgressPhotos_markFiles(log: IProgressPhotoLog, written: number[]): IProgressPhotoLog {
  if (written.length === 0) {
    return log;
  }
  const done = new Set(written);
  return {
    ...log,
    photos: log.photos.map((p) => (done.has(p.id) ? { id: p.id, timestamp: p.timestamp, file: true as const } : p)),
  };
}

export function ProgressPhotos_index(log: IProgressPhotoLog): IProgressPhotoIndexEntry[] {
  return log.photos.map((p) => ({ id: p.id, timestamp: p.timestamp }));
}

export function ProgressPhotos_parseIndex(raw: unknown): IProgressPhotoIndexEntry[] {
  const list = Array.isArray(raw) ? raw : [];
  const entries = list
    .map((item) => (item ?? {}) as Record<string, unknown>)
    .filter((r) => isId(r.id) && typeof r.timestamp === "number")
    .map((r) => ({ id: r.id as number, timestamp: r.timestamp as number }));
  return sorted(entries);
}

export function ProgressPhotos_cloudPath(userId: string, id: number): string {
  return `${userId}/photos/${ProgressPhotos_fileName(id)}`;
}

// A photo deleted on the phone is deleted from the cloud too, so the backup never keeps what the user removed.
export function ProgressPhotos_syncPlan(log: IProgressPhotoLog, uploaded: number[]): IProgressPhotoSyncPlan {
  const local = new Set(log.photos.map((p) => p.id));
  const sent = new Set(uploaded);
  return {
    upload: log.photos.filter((p) => !sent.has(p.id)).map((p) => p.id),
    remove: uploaded.filter((id) => !local.has(id)),
  };
}

export function ProgressPhotos_missing(
  log: IProgressPhotoLog,
  index: IProgressPhotoIndexEntry[]
): IProgressPhotoIndexEntry[] {
  const local = new Set(log.photos.map((p) => p.id));
  const room = Math.max(0, ProgressPhotos_maxPhotos - log.photos.length);
  return index.filter((entry) => !local.has(entry.id)).slice(0, room);
}

export function ProgressPhotos_fitSize(
  width: number,
  height: number,
  maxSide: number = ProgressPhotos_maxSide
): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height, 1));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
