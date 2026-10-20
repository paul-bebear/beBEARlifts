import { SetClips_empty, SetClips_parse } from "../models/setClips";
import { JsonStore_create } from "./jsonStore";

export const SetClipStore = JsonStore_create("bebear_clips", SetClips_parse, SetClips_empty);
