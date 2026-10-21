import index from "../../programdata/index.json";
import basicBeginner from "../../programdata/programs/builtin/basicBeginner.json";
import fierce5 from "../../programdata/programs/builtin/fierce-5.json";
import recommended from "../../programdata/programs/builtin/recommended-routine.json";
import gzclp from "../../programdata/programs/builtin/gzclp.json";
import phul from "../../programdata/programs/builtin/phul.json";
import planet from "../../programdata/programs/builtin/planet-fitness-hypertrophy.json";
import bbb from "../../programdata/programs/builtin/the531bbb.json";
import tsa from "../../programdata/programs/builtin/tsa-9-week-intermediate.json";
import phat from "../../programdata/programs/builtin/phat.json";
import dumbbells from "../../programdata/programs/builtin/dbPpl.json";
import ppl from "../../programdata/programs/builtin/coolcicada-ppl.json";
import { IProgram, IPlannerProgram, IPlannerProgramWeek } from "../types";

const details: [string, { planner: { vtype: string; name: string; weeks: IPlannerProgramWeek[] } }][] = [
  ["basicBeginner", basicBeginner],
  ["fierce-5", fierce5],
  ["recommended-routine", recommended],
  ["gzclp", gzclp],
  ["phul", phul],
  ["planet-fitness-hypertrophy", planet],
  ["the531bbb", bbb],
  ["tsa-9-week-intermediate", tsa],
  ["phat", phat],
  ["dbPpl", dumbbells],
  ["coolcicada-ppl", ppl],
];

export function OnboardingCatalog_programs(): IProgram[] {
  return details.map(([id, detail]) => OnboardingCatalog_build(id, detail.planner as IPlannerProgram));
}

export function OnboardingCatalog_build(id: string, planner: IPlannerProgram): IProgram {
  const entry = index.find((e) => e.id === id);
  if (entry == null) {
    throw new Error("Unknown built-in program.");
  }
  return {
    vtype: "program",
    id: entry.id,
    name: entry.name,
    author: entry.author,
    url: entry.url,
    shortDescription: entry.shortDescription,
    description: entry.description ?? "",
    tags: [],
    nextDay: 1,
    weeks: [],
    days: [],
    exercises: [],
    isMultiweek: entry.isMultiweek,
    planner,
  };
}

export function OnboardingCatalog_ids(): string[] {
  return index.map((entry) => entry.id);
}

export function OnboardingCatalog_days(id: string): number | undefined {
  return index.find((entry) => entry.id === id)?.frequency;
}
