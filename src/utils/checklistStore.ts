import { DailyChecklist_empty, DailyChecklist_parse } from "../models/dailyChecklist";
import { JsonStore_create } from "./jsonStore";

export const ChecklistStore = JsonStore_create("bebear_checklist", DailyChecklist_parse, DailyChecklist_empty);
