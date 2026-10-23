export interface IProgressPhoto {
  id: number;
  timestamp: number;
  dataUrl: string;
}

export interface IProgressPhotoLog {
  version: 1;
  photos: IProgressPhoto[];
}

export const ProgressPhotos_maxSide = 1080;
export const ProgressPhotos_maxPhotos = 200;
// A 1080 px JPEG at quality 0.8 is 100 to 250 KB. The cap stops one bad file from filling IndexedDB.
const ProgressPhotos_maxDataUrlLength = 1024 * 1024;

const dataUrlPattern = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;

export function ProgressPhotos_empty(): IProgressPhotoLog {
  return { version: 1, photos: [] };
}

function ProgressPhotos_isValidDataUrl(value: unknown): value is string {
  return typeof value === "string" && value.length <= ProgressPhotos_maxDataUrlLength && dataUrlPattern.test(value);
}

function parsePhoto(raw: unknown): IProgressPhoto | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (typeof r.id !== "number" || typeof r.timestamp !== "number" || !ProgressPhotos_isValidDataUrl(r.dataUrl)) {
    return undefined;
  }
  return { id: r.id, timestamp: r.timestamp, dataUrl: r.dataUrl };
}

function sorted(photos: IProgressPhoto[]): IProgressPhoto[] {
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

export function ProgressPhotos_add(log: IProgressPhotoLog, dataUrl: string, now: number): IProgressPhotoLog {
  if (!ProgressPhotos_isValidDataUrl(dataUrl) || ProgressPhotos_isFull(log)) {
    return log;
  }
  const id = log.photos.some((p) => p.id === now) ? Math.max(...log.photos.map((p) => p.id)) + 1 : now;
  return { ...log, photos: sorted([{ id, timestamp: now, dataUrl }, ...log.photos]) };
}

export function ProgressPhotos_remove(log: IProgressPhotoLog, id: number): IProgressPhotoLog {
  return { ...log, photos: log.photos.filter((p) => p.id !== id) };
}

export function ProgressPhotos_removeTakenAt(log: IProgressPhotoLog, timestamp: number): IProgressPhotoLog {
  return { ...log, photos: log.photos.filter((p) => p.timestamp !== timestamp) };
}

export function ProgressPhotos_fitSize(
  width: number,
  height: number,
  maxSide: number = ProgressPhotos_maxSide
): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height, 1));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
