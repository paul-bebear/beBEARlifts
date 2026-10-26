import { MusicLog_empty, MusicLog_parse } from "../models/musicLog";
import { JsonStore_create } from "./jsonStore";

const MusicStore_key = "bebear_music";

const store = JsonStore_create(MusicStore_key, MusicLog_parse, MusicLog_empty);

export const MusicStore_load = store.load;
export const MusicStore_loadStrict = store.loadStrict;
export const MusicStore_update = store.update;
export const useMusicLog = store.use;
