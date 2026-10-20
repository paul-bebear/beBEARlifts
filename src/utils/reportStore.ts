import {
  WorkoutReport_empty,
  WorkoutReport_facts,
  WorkoutReport_parseLog,
  IWorkoutReport,
} from "../models/workoutReport";
import { JsonStore_create } from "./jsonStore";

export const ReportStore = JsonStore_create("bebear_reports", WorkoutReport_parseLog, WorkoutReport_empty);

export async function ReportApi_summary(report: IWorkoutReport): Promise<string | undefined> {
  try {
    const response = await fetch("/api/ai/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayName: report.dayName, facts: WorkoutReport_facts(report) }),
    });
    const body = (await response.json()) as { text?: unknown };
    return response.ok && typeof body.text === "string" && body.text !== "" ? body.text : undefined;
  } catch {
    return undefined;
  }
}
