import { IEvaluatedProgram, Program_getDayData } from "./program";
import { IPlannerProgramExercise, IPlannerProgramExerciseEvaluatedSet } from "../pages/planner/models/types";
import { IWeekSlots, WeekSchedule_weekdayNames } from "./weekSchedule";

export interface IProgramPlanCard {
  dayIndex: number;
  name: string;
  lines: string[];
  isNext: boolean;
}

function repsText(set: IPlannerProgramExerciseEvaluatedSet): string {
  if (set.setTimer != null && set.setTimer > 0) {
    return set.setTimer % 60 === 0 ? `${set.setTimer / 60} min` : `${set.setTimer}s`;
  }
  const max = set.maxrep ?? 0;
  const reps = set.minrep != null && set.minrep !== max ? `${set.minrep}-${max}` : `${max}`;
  return `${reps}${set.isAmrap ? "+" : ""}`;
}

// "3×8-12" for one kind of set, "1×5+, 3×8" when the sets differ.
export function ProgramPlanCards_setsText(sets: IPlannerProgramExerciseEvaluatedSet[]): string {
  const groups: { count: number; reps: string }[] = [];
  for (const set of sets) {
    const reps = repsText(set);
    const last = groups[groups.length - 1];
    if (last != null && last.reps === reps) {
      last.count += 1;
    } else {
      groups.push({ count: 1, reps });
    }
  }
  return groups.map((group) => `${group.count}×${group.reps}`).join(", ");
}

export function ProgramPlanCards_exerciseLine(exercise: IPlannerProgramExercise): string {
  const variation = exercise.evaluatedSetVariations.find((v) => v.isCurrent) ?? exercise.evaluatedSetVariations[0];
  const sets = ProgramPlanCards_setsText(variation?.sets ?? []);
  // `name` drops the equipment, and "Lateral Raise" alone does not say cable or dumbbell.
  const name =
    exercise.label != null ? exercise.fullName.slice(exercise.fullName.indexOf(":") + 1).trim() : exercise.fullName;
  return sets === "" ? name : `${name} ${sets}`;
}

// The week the next workout falls in, so a multi-week program opens on the week the user is in.
export function ProgramPlanCards_currentWeekIndex(program: IEvaluatedProgram): number {
  const week = Program_getDayData(program, program.nextDay).week;
  return Math.max(0, Math.min(program.weeks.length - 1, (week ?? 1) - 1));
}

export function ProgramPlanCards_build(
  program: IEvaluatedProgram,
  weekIndex: number,
  nextDay: number = program.nextDay
): IProgramPlanCard[] {
  const week = program.weeks[weekIndex];
  if (week == null) {
    return [];
  }
  const next = Program_getDayData(program, nextDay);
  return week.days.map((day, dayIndex) => ({
    dayIndex,
    name: day.name,
    lines: day.exercises.filter((exercise) => !exercise.notused).map(ProgramPlanCards_exerciseLine),
    isNext: next.week === weekIndex + 1 && next.dayInWeek === dayIndex + 1,
  }));
}

export interface IProgramPlanRow {
  weekday: number;
  weekdayName: string;
  isToday: boolean;
  card?: IProgramPlanCard;
}

export interface IProgramPlanWeek {
  rows: IProgramPlanRow[];
  unplaced: IProgramPlanCard[];
}

// A program with more than 7 days a week has days no weekday can hold; they list after Sunday.
export function ProgramPlanCards_weekRows(
  cards: IProgramPlanCard[],
  slots: IWeekSlots,
  todayWeekday: number
): IProgramPlanWeek {
  const rows = WeekSchedule_weekdayNames.map((weekdayName, weekday) => {
    const dayIndex = slots[weekday];
    const card = dayIndex != null ? cards[dayIndex] : undefined;
    return { weekday, weekdayName, isToday: weekday === todayWeekday, card };
  });
  const placed = new Set(slots);
  return { rows, unplaced: cards.filter((card) => !placed.has(card.dayIndex)) };
}
