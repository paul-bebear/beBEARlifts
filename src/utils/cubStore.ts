import { CubNumber_empty, CubNumber_parse } from "../models/cubNumber";
import { JsonStore_create } from "./jsonStore";

export const CubStore = JsonStore_create("bebear_cub", CubNumber_parse, CubNumber_empty);
