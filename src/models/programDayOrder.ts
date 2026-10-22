import { SyntaxNode } from "@lezer/common";
import { IPlannerProgram, IProgram, ISettings } from "../types";
import { IEither } from "../utils/types";
import { ObjectUtils_isEqual } from "../utils/object";
import { parser as LiftoscriptParser } from "../liftoscript";
import { NodeName } from "../liftoscriptEvaluator";
import { IPlannerEvalResult } from "../pages/planner/plannerExerciseEvaluator";
import { IPlannerProgramExercise } from "../pages/planner/models/types";
import { PlannerProgram_evaluate } from "../pages/planner/models/plannerProgram";
import {
  PlannerProgramExercise_getProgressScript,
  PlannerProgramExercise_getUpdateScript,
} from "../pages/planner/models/plannerProgramExercise";
import { PlannerStructure_moveDayRow } from "../pages/planner/models/plannerStructure";
import { Program_cleanPlannerProgram } from "./program";

const dayVariables = ["day", "dayInWeek"];

export function ProgramDayOrder_rowCount(planner: IPlannerProgram): number {
  return planner.weeks.reduce((max, week) => Math.max(max, week.days.length), 0);
}

// The day row each new position holds, per week. A week that lacks a row keeps the days it has,
// compacted, which is how PlannerStructure_moveDayRows lays it out.
function oldIndexesPerWeek(planner: IPlannerProgram, fromIndex: number, toIndex: number): number[][] {
  const rows = ProgramDayOrder_rowCount(planner);
  const remaining = Array.from({ length: rows }, (_, i) => i).filter((i) => i !== fromIndex);
  const order = [...remaining.slice(0, toIndex), fromIndex, ...remaining.slice(toIndex)];
  return planner.weeks.map((week) => order.filter((oldIndex) => week.days[oldIndex] != null));
}

interface IDayNumberUse {
  readsOwnDay: boolean;
  addressesOtherDays: boolean;
}

function dayNumberUse(script: string): IDayNumberUse {
  const use: IDayNumberUse = { readsOwnDay: false, addressesOtherDays: false };
  const cursor = LiftoscriptParser.parse(script).cursor();
  do {
    if (cursor.node.type.name !== NodeName.VariableExpression) {
      continue;
    }
    const node: SyntaxNode = cursor.node;
    const keyword = node.getChild(NodeName.Keyword);
    if (keyword != null && dayVariables.indexOf(script.slice(keyword.from, keyword.to)) !== -1) {
      use.readsOwnDay = true;
    }
    // `weights[day:setvariation:set]` and `weights[week:day:setvariation:set]` name a day slot.
    const indexes = node.getChildren(NodeName.VariableIndex);
    if (indexes.length >= 3) {
      const dayIndex = indexes[indexes.length === 4 ? 1 : 0];
      if (dayIndex.getChild(NodeName.Wildcard) == null) {
        use.addressesOtherDays = true;
      }
    }
  } while (cursor.next());
  return use;
}

function scriptsOf(exercise: IPlannerProgramExercise): string[] {
  return [PlannerProgramExercise_getProgressScript(exercise), PlannerProgramExercise_getUpdateScript(exercise)].filter(
    (script): script is string => script != null
  );
}

// A script that reads `dayInWeek` or addresses `weights[2:*:*]` keeps its text through a move, so
// the reuse renumbering cannot fix it and the evaluated sets look the same. Only the next workout
// would show the change.
function dayNumberBlocker(
  planner: IPlannerProgram,
  evaluatedWeeks: IPlannerEvalResult[][],
  perWeek: number[][]
): string | undefined {
  for (let weekIndex = 0; weekIndex < evaluatedWeeks.length; weekIndex += 1) {
    const days = evaluatedWeeks[weekIndex];
    for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
      const evaluated = days[dayIndex];
      const moves = perWeek[weekIndex]?.indexOf(dayIndex) !== dayIndex;
      if (!evaluated.success) {
        continue;
      }
      for (const exercise of evaluated.data) {
        const uses = scriptsOf(exercise).map(dayNumberUse);
        if (uses.some((use) => use.addressesOtherDays || (moves && use.readsOwnDay))) {
          const dayName = planner.weeks[weekIndex]?.days[dayIndex]?.name ?? `Day ${dayIndex + 1}`;
          return `${exercise.fullName} in ${dayName} uses day numbers in its progression, so moving days would change what it does. Move days in the text editor instead.`;
        }
      }
    }
  }
  return undefined;
}

// What an exercise does, without where it sits. `text`, `reuse` and `dayData` hold day numbers that
// a move rewrites on purpose, so they stay out.
function fingerprint(exercise: IPlannerProgramExercise): string {
  return JSON.stringify({
    key: exercise.key,
    fullName: exercise.fullName,
    notused: exercise.notused ?? false,
    order: exercise.order,
    repeat: exercise.repeat,
    tags: exercise.tags,
    equipment: exercise.equipment,
    superset: exercise.superset?.name,
    exerciseVariations: exercise.exerciseVariations,
    sets: exercise.evaluatedSetVariations,
    warmups: exercise.warmupSets,
    descriptions: exercise.descriptions?.values,
    globals: exercise.globals,
    progressType: exercise.progress?.type,
    progressState: exercise.progress?.state,
    scripts: scriptsOf(exercise),
  });
}

function dayFingerprint(evaluated: IPlannerEvalResult | undefined): string[] | undefined {
  if (evaluated == null || !evaluated.success) {
    return undefined;
  }
  return evaluated.data.map(fingerprint);
}

function changedDay(
  before: IPlannerEvalResult[][],
  after: IPlannerEvalResult[][],
  perWeek: number[][],
  planner: IPlannerProgram
): string | undefined {
  for (let weekIndex = 0; weekIndex < after.length; weekIndex += 1) {
    const days = after[weekIndex];
    for (let newIndex = 0; newIndex < days.length; newIndex += 1) {
      const oldIndex = perWeek[weekIndex][newIndex];
      const was = dayFingerprint(before[weekIndex]?.[oldIndex]);
      const is = dayFingerprint(days[newIndex]);
      if (was != null && (is == null || !ObjectUtils_isEqual(was, is))) {
        return planner.weeks[weekIndex]?.days[oldIndex]?.name ?? `Day ${oldIndex + 1}`;
      }
    }
  }
  return undefined;
}

// Moves one day to a new position in every week. PlannerStructure_moveDayRow renumbers the
// `...Squat[2]` and `// ...Squat[1:2]` references and refuses an edit that breaks a day. This adds
// the two checks a reorder needs on top: no script reads the day number, and every day evaluates to
// the same exercises it did before.
export function ProgramDayOrder_move(
  planner: IPlannerProgram,
  fromIndex: number,
  toIndex: number,
  settings: ISettings
): IEither<IPlannerProgram, string> {
  const rows = ProgramDayOrder_rowCount(planner);
  if (fromIndex < 0 || fromIndex >= rows || toIndex < 0 || toIndex >= rows) {
    return { success: false, error: "There is no day there." };
  }
  if (fromIndex === toIndex) {
    return { success: true, data: planner };
  }
  const perWeek = oldIndexesPerWeek(planner, fromIndex, toIndex);
  const before = PlannerProgram_evaluate(planner, settings).evaluatedWeeks;
  const blocker = dayNumberBlocker(planner, before, perWeek);
  if (blocker != null) {
    return { success: false, error: blocker };
  }
  const moved = PlannerStructure_moveDayRow(planner, fromIndex, toIndex, settings);
  if (!moved.success) {
    return moved;
  }
  const after = PlannerProgram_evaluate(moved.data, settings).evaluatedWeeks;
  const changed = changedDay(before, after, perWeek, planner);
  if (changed != null) {
    return {
      success: false,
      error: `Moving this day would change what ${changed} does. Move days in the text editor instead.`,
    };
  }
  return { success: true, data: moved.data };
}

export interface IProgramDayOrderSave {
  draft: IProgram;
  // Present when the editor held no unsaved edits, so writing the move to storage saves only the
  // move. With unsaved edits the move joins them in the draft and waits for the Save button.
  saved?: IProgram;
}

export function ProgramDayOrder_hasUnsavedEdits(saved: IProgram, draft: IProgram): boolean {
  if (saved.planner == null || draft.planner == null) {
    return false;
  }
  return !ObjectUtils_isEqual(Program_cleanPlannerProgram(saved).planner!, Program_cleanPlannerProgram(draft).planner!);
}

export function ProgramDayOrder_apply(
  saved: IProgram,
  draft: IProgram,
  fromIndex: number,
  toIndex: number,
  settings: ISettings
): IEither<IProgramDayOrderSave, string> {
  if (draft.planner == null) {
    return { success: false, error: "This program has no days to move." };
  }
  const moved = ProgramDayOrder_move(draft.planner, fromIndex, toIndex, settings);
  if (!moved.success) {
    return moved;
  }
  const isClean = saved.planner != null && !ProgramDayOrder_hasUnsavedEdits(saved, draft);
  return {
    success: true,
    data: {
      draft: { ...draft, planner: moved.data },
      saved: isClean ? Program_cleanPlannerProgram({ ...saved, planner: moved.data }) : undefined,
    },
  };
}
