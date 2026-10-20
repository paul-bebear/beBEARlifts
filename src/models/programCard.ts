import type { IProgram, ISettings } from "../types";
import { Program_evaluate, Program_isEmpty } from "./program";

export interface IProgramCard {
  title: string;
  subtitle: string;
  hasErrors: boolean;
}

export function ProgramCard_hasErrors(program: IProgram | undefined, settings: ISettings): boolean {
  if (!program) {
    return false;
  }
  return Program_evaluate(program, settings).errors.length > 0;
}

export function ProgramCard_build(program: IProgram | undefined, settings: ISettings): IProgramCard {
  if (!program || Program_isEmpty(program)) {
    return { title: "No program yet", subtitle: "Tap to choose a program", hasErrors: false };
  }
  const hasErrors = ProgramCard_hasErrors(program, settings);
  return {
    title: program.name,
    subtitle: hasErrors ? "Has errors. Tap to fix them" : "Tap to edit your program",
    hasErrors,
  };
}
