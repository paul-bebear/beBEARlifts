import { WeekSchedule_empty, WeekSchedule_parse } from "../models/weekSchedule";
import { JsonStore_create } from "./jsonStore";

export const WeekScheduleStore = JsonStore_create("bebear_schedule", WeekSchedule_parse, WeekSchedule_empty);
