import { IBearPlace } from "./bearPlace";
import { IBearPick, IBearSlot, BearPlanSlots_pick, BearPlanSlots_table } from "./bearPlanSlots";

export type IBearGoal = "size" | "strength" | "both";

export interface IBearPlanParams {
  days: 3 | 4 | 5;
  goal: IBearGoal;
  places: IBearPlace[];
  agile: boolean;
  youth: boolean;
}

type IBearTemplate = "main" | "mainYouth" | "build" | "iso" | "bw" | "run" | "mobility" | "jump";

interface IBearDay {
  name: string;
  slots: IBearSlot[];
  fill: IBearSlot[];
  finish?: "cardio" | "mobility";
}

interface IBearEntry {
  pick: IBearPick;
  template: IBearTemplate;
}

const minExercisesPerDay = 6;

const weeks: Record<IBearPlanParams["days"], IBearDay[]> = {
  3: [
    {
      name: "Full Body A",
      slots: ["squat", "horizontalPush", "horizontalPull", "rdl", "lateral"],
      fill: ["curl", "core", "crunch"],
      finish: "cardio",
    },
    {
      name: "Full Body B",
      slots: ["hinge", "verticalPush", "verticalPull", "lunge", "triceps", "calf"],
      fill: ["core", "crunch", "backExt"],
    },
    {
      name: "Full Body C",
      slots: ["squat2", "inclinePush", "cableRow", "glute", "curl2"],
      fill: ["rearDelt", "core", "crunch"],
      finish: "mobility",
    },
  ],
  4: [
    {
      name: "Upper A",
      slots: ["horizontalPush", "horizontalPull", "verticalPush", "verticalPull", "lateral", "curl", "triceps"],
      fill: ["core", "crunch"],
    },
    { name: "Lower A", slots: ["squat", "rdl", "lunge", "legCurl", "calf", "core"], fill: ["crunch", "backExt"] },
    {
      name: "Upper B",
      slots: ["inclinePush", "pullUp", "cableRow", "chestFly", "rearDelt", "curl2", "triceps2"],
      fill: ["core", "crunch"],
    },
    { name: "Lower B", slots: ["hinge", "bss", "glute", "quad", "abductor", "calf"], fill: ["core", "crunch"] },
  ],
  5: [
    {
      name: "Upper",
      slots: ["horizontalPush", "horizontalPull", "verticalPush", "verticalPull", "chestFly", "lateral"],
      fill: ["core", "crunch"],
    },
    { name: "Lower 1", slots: ["squat", "rdl", "lunge", "quad", "calf", "core"], fill: ["crunch", "backExt"] },
    {
      name: "Push",
      slots: ["inclinePush", "horizontalPush", "chestFly", "lateral", "triceps", "triceps2"],
      fill: ["verticalPush", "core", "crunch"],
    },
    {
      name: "Pull",
      slots: ["pullUp", "cableRow", "rearDelt", "curl", "curl2", "facePull"],
      fill: ["horizontalPull", "core", "backExt", "crunch"],
    },
    { name: "Lower 2", slots: ["hinge", "bss", "glute", "legCurl", "abductor", "calf"], fill: ["core", "crunch"] },
  ],
};

const finishSlots: Record<NonNullable<IBearDay["finish"]>, IBearSlot[]> = {
  cardio: ["cardio"],
  mobility: ["hipOpener", "thoracic", "hamstringReach"],
};

const agilitySlots: IBearSlot[] = ["jumpSquat", "lateralJump", "jumpRope"];

const templateOrder: IBearTemplate[] = ["main", "mainYouth", "build", "iso", "bw", "run", "mobility", "jump"];

const templateLines: Record<IBearTemplate, string> = {
  main: "main / used: none / 2x5, 1x5+ / 150s / progress: lp(5lb)",
  mainYouth: "mainYouth / used: none / 3x6 / 150s / progress: dp(2.5lb, 6, 8)",
  build: "build / used: none / 3x8 / 90s / progress: dp(5lb, 8, 12)",
  iso: "iso / used: none / 2x12 / 60s / progress: dp(2.5lb, 12, 15)",
  bw: [
    "bw / used: none / 3x6 / 0lb / 60s / warmup: none / progress: custom() {~",
    "  if (completedReps >= reps && reps[1] < 12) {",
    "    reps += 1",
    "  }",
    "~}",
  ].join("\n"),
  run: "run / used: none / 1x1 0lb 600s|0s / warmup: none",
  mobility: "mobility / used: none / 2x1 0lb 45s|15s / warmup: none",
  jump: "jump / used: none / 3x8 / 0lb / 60s / warmup: none",
};

const labelOfTemplate: Record<IBearTemplate, string> = {
  main: "heavy",
  mainYouth: "heavy",
  build: "volume",
  iso: "light",
  bw: "reps",
  run: "easy",
  mobility: "stretch",
  jump: "jump",
};

function loadedTemplate(params: IBearPlanParams, slot: IBearSlot, compoundIndex: number): IBearTemplate {
  if (BearPlanSlots_table[slot].kind === "isolation") {
    return "iso";
  }
  const heavyCount = params.goal === "strength" ? 2 : params.goal === "both" ? 1 : 0;
  if (compoundIndex < heavyCount) {
    return params.youth ? "mainYouth" : "main";
  }
  return "build";
}

function templateOf(params: IBearPlanParams, slot: IBearSlot, pick: IBearPick, compoundIndex: number): IBearTemplate {
  const kind = BearPlanSlots_table[slot].kind;
  if (kind === "cardio") {
    return "run";
  } else if (kind === "mobility") {
    return "mobility";
  } else if (kind === "agility") {
    return "jump";
  } else if (pick.equipment === "bodyweight") {
    return "bw";
  }
  return loadedTemplate(params, slot, compoundIndex);
}

function dayEntries(params: IBearPlanParams, day: IBearDay): IBearEntry[] {
  const entries: IBearEntry[] = [];
  let compoundIndex = 0;
  const add = (slot: IBearSlot): void => {
    const pick = BearPlanSlots_pick(slot, params.places);
    if (pick == null || entries.some((e) => e.pick.name === pick.name)) {
      return;
    }
    const template = templateOf(params, slot, pick, compoundIndex);
    if (template === "main" || template === "mainYouth" || template === "build") {
      compoundIndex += 1;
    }
    entries.push({ pick, template });
  };
  const finish = day.finish == null ? [] : finishSlots[day.finish];
  const tail =
    params.agile && day.finish === "mobility" ? agilitySlots : [...(params.agile ? agilitySlots : []), ...finish];
  day.slots.forEach(add);
  for (const slot of day.fill) {
    if (entries.length + tail.length >= minExercisesPerDay) {
      break;
    }
    add(slot);
  }
  tail.forEach(add);
  return entries;
}

function labelsByTemplate(days: IBearEntry[][]): Map<string, IBearTemplate> {
  const first = new Map<string, IBearTemplate>();
  for (const entry of days.flat()) {
    if (!first.has(entry.pick.name)) {
      first.set(entry.pick.name, entry.template);
    }
  }
  return first;
}

function progressOverride(entry: IBearEntry): string | undefined {
  if (entry.pick.step == null) {
    return undefined;
  }
  const step = entry.pick.step;
  switch (entry.template) {
    case "main":
      return `lp(${step}lb)`;
    case "mainYouth":
      return `dp(${step / 2}lb, 6, 8)`;
    case "build":
      return `dp(${step}lb, 8, 12)`;
    default:
      return undefined;
  }
}

function exerciseLines(entry: IBearEntry, firstTemplate: IBearTemplate | undefined): string[] {
  const { pick, template } = entry;
  const label = firstTemplate != null && firstTemplate !== template ? `${labelOfTemplate[template]}: ` : "";
  const sections = [`${label}${pick.name}`, `...${template}`];
  if (pick.sets != null) {
    sections.push(pick.sets);
  }
  if (pick.equipment !== "bodyweight") {
    sections.push(`${pick.lb}lb`);
  }
  const progress = progressOverride(entry);
  if (progress != null) {
    sections.push(`progress: ${progress}`);
  }
  return [...(pick.note != null ? [`// ${pick.note}`] : []), sections.join(" / ")];
}

export function BearPlan_text(params: IBearPlanParams): string {
  const days = weeks[params.days];
  const entries = days.map((day) => dayEntries(params, day));
  const used = new Set(entries.flat().map((e) => e.template));
  const firstTemplates = labelsByTemplate(entries);
  const lines = ["# Week 1"];
  days.forEach((day, index) => {
    lines.push(`## ${day.name}`);
    if (index === 0) {
      lines.push(...templateOrder.filter((t) => used.has(t)).map((t) => templateLines[t]), "");
    }
    for (const entry of entries[index]) {
      lines.push(...exerciseLines(entry, firstTemplates.get(entry.pick.name)));
    }
    lines.push("");
  });
  return lines.join("\n");
}
