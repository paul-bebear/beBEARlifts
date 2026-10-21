import { ProgramGoal_empty, ProgramGoal_parse } from "../models/programGoal";
import { JsonStore_create } from "./jsonStore";

export const ProgramGoalStore = JsonStore_create("bebear_goal", ProgramGoal_parse, ProgramGoal_empty);
