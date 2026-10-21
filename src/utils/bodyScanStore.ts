import { BodyScans_empty, BodyScans_parse } from "../models/bodyScans";
import { JsonStore_create } from "./jsonStore";

export const BodyScanStore_key = "bebear_bodyscans";

const store = JsonStore_create(BodyScanStore_key, BodyScans_parse, BodyScans_empty);

export const BodyScanStore_load = store.load;
export const BodyScanStore_update = store.update;
export const useBodyScans = store.use;
