import { ProgressPhotos_empty, ProgressPhotos_parse } from "../models/progressPhotos";
import { JsonStore_create, JsonStore_persistSilently } from "./jsonStore";

export const ProgressPhotoStore = JsonStore_create(
  "bebear_progress_photos",
  ProgressPhotos_parse,
  ProgressPhotos_empty,
  JsonStore_persistSilently
);
