import {
  WorkoutReport_empty,
  WorkoutReport_facts,
  WorkoutReport_parseLog,
  IWorkoutReport,
} from "../models/workoutReport";
import { JsonStore_create } from "./jsonStore";
import { AiRequest_post, AiRequest_text } from "./aiRequest";

export const ReportStore = JsonStore_create("bebear_reports", WorkoutReport_parseLog, WorkoutReport_empty);

export type IReportSummaryResult = { ok: true; text: string } | { ok: false; error: string };

export async function ReportApi_summary(report: IWorkoutReport): Promise<IReportSummaryResult> {
  const result = await AiRequest_post("/api/ai/report", {
    workoutId: report.workoutId,
    dayName: report.dayName,
    facts: WorkoutReport_facts(report),
  });
  if (!result.ok) {
    return result;
  }
  const text = AiRequest_text(result.body);
  return text != null && text !== "" ? { ok: true, text } : { ok: false, error: "The AI sent an empty note." };
}
