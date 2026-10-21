import { MusicLog_empty, MusicLog_parse } from "../models/musicLog";
import { JsonStore_create } from "./jsonStore";

export const MusicStore_key = "bebear_music";

const store = JsonStore_create(MusicStore_key, MusicLog_parse, MusicLog_empty);

export const MusicStore_load = store.load;
export const MusicStore_get = store.get;
export const MusicStore_update = store.update;
export const MusicStore_subscribe = store.subscribe;
export const useMusicLog = store.use;
