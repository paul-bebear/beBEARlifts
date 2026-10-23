import { useMemo } from "react";
import { useTrackedState } from "../navigation/TrackedStateContext";
import { FoodLog_dayKey } from "../models/foodLog";
import { History_getPersonalRecords } from "../models/history";
import { IJournalDay, JournalDay_build } from "../models/journalDay";
import { IJournalExportSources } from "../models/journalExport";
import { useFoodLog } from "./foodLogStore";
import { useMusicLog } from "./musicStore";
import { NotesStore } from "./notesStore";

export function useJournalSources(): IJournalExportSources {
  const state = useTrackedState();
  const { history, settings, stats } = state.storage;
  const food = useFoodLog();
  const music = useMusicLog();
  const notes = NotesStore.use();
  const prs = useMemo(() => History_getPersonalRecords(history), [history]);
  return {
    today: FoodLog_dayKey(new Date()),
    history,
    settings,
    prs,
    food,
    music,
    weights: stats.weight.weight ?? [],
    notes,
  };
}

export function useJournalDay(day: string): IJournalDay {
  const sources = useJournalSources();
  return JournalDay_build({ ...sources, day });
}
