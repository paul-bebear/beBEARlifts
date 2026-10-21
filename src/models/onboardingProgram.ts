import { IProgram, ISettings } from "../types";
import { IOnboardingAnswer } from "./onboardingAnswer";
import { PlannerMode_commitFullText } from "../pages/planner/models/plannerMode";
import { PlannerProgram_switchToUnit } from "../pages/planner/models/plannerProgram";
import { ImportFromLiftosaur_convertLiftosaurCsvToHistoryRecords } from "../utils/importFromLiftosaur";

export function OnboardingProgram_prepare(
  answer: IOnboardingAnswer,
  programs: IProgram[],
  settings: ISettings,
  id: string,
  now: number
): { program: IProgram; days: number } {
  let program: IProgram;
  if (answer.builtin != null) {
    const builtin = programs.find((p) => p.id === answer.builtin);
    if (builtin == null) {
      throw new Error("Programs are still loading. Try again when the download finishes.");
    }
    program = {
      ...builtin,
      id,
      clonedAt: now,
      planner: builtin.planner == null ? undefined : PlannerProgram_switchToUnit(builtin.planner, settings),
    };
  } else {
    const committed = PlannerMode_commitFullText(answer.liftoscript ?? "", settings);
    if (committed.error != null) {
      throw new Error(committed.error.message);
    }
    const weeks = committed.weeks;
    if (
      weeks == null ||
      weeks.length === 0 ||
      weeks.some((w) => w.days.length === 0) ||
      !weeks.some((w) => w.days.some((d) => d.exerciseText.trim() !== ""))
    ) {
      throw new Error("The program has no exercises.");
    }
    program = {
      vtype: "program",
      id,
      name: "My training plan",
      url: "",
      author: "",
      shortDescription: "",
      description: "",
      nextDay: 1,
      weeks: [],
      isMultiweek: weeks.length > 1,
      days: [{ id: `${id}-day`, name: "Day 1", exercises: [] }],
      exercises: [],
      tags: [],
      clonedAt: now,
      planner: { vtype: "planner", name: "My training plan", weeks },
    };
  }
  if (answer.historyCsv?.trim()) {
    const imported = ImportFromLiftosaur_convertLiftosaurCsvToHistoryRecords(answer.historyCsv, settings);
    if (imported.historyRecords.length === 0 || imported.errors.length > 0) {
      throw new Error("Some history rows could not be read. Please correct the history CSV.");
    }
  }
  const days = program.planner?.weeks[0]?.days.length ?? program.days.length;
  return { program, days };
}
