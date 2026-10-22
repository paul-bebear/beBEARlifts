import { BearStoreData_empty, BearStoreData_parse } from "../models/bearStoreData";
import { JsonStore_create } from "./jsonStore";

export const BearStore = JsonStore_create("bebear_bear", BearStoreData_parse, BearStoreData_empty);
