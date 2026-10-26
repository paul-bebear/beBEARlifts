import { IHistoryRecord } from "../types";

export interface IGymExitQuestion {
  id: "racked" | "cooledDown";
  text: string;
}

export interface IGymExitSheet {
  title: string;
  questions: IGymExitQuestion[];
  finishLabel: string;
}

const questions: IGymExitQuestion[] = [
  { id: "racked", text: "Racked your weights?" },
  { id: "cooledDown", text: "Cooled down?" },
];

export function GymExit_sheet(progress: IHistoryRecord): IGymExitSheet {
  const sets = progress.entries.flatMap((entry) => entry.sets);
  const done = sets.filter((set) => set.isCompleted === true || (set.completedReps ?? 0) > 0).length;
  return {
    title: sets.length === 0 ? "No sets logged yet" : `${done} of ${sets.length} sets done`,
    questions,
    finishLabel: "Finish workout",
  };
}
