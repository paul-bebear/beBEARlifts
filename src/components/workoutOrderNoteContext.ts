import { createContext } from "react";

// Entry id to the note from ExerciseOrderFatigue_notes.
export const WorkoutOrderNoteContext = createContext<Record<string, string>>({});
