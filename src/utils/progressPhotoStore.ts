import { ProgressPhotos_empty, ProgressPhotos_parse } from "../models/progressPhotos";
import { IndexedDBUtils_setMany } from "./indexeddb";
import { JsonStore_create } from "./jsonStore";

// IndexedDBUtils_set swallows a failed write on web. A full disk must reach the screen, which rolls the photo back.
function persist(key: string, value?: string): Promise<void> {
  return IndexedDBUtils_setMany([[key, value]]);
}

export const ProgressPhotoStore = JsonStore_create(
  "bebear_progress_photos",
  ProgressPhotos_parse,
  ProgressPhotos_empty,
  persist
);
