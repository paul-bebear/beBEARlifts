import { IHistoryRecord, IMuscle, ISettings } from "../types";
import { Exercise_get, Exercise_targetMuscles } from "./exercise";
import { SetClips_workoutId } from "./setClips";
import { JsonInText_extract } from "./jsonInText";

export interface IWarmupItem {
  name: string;
  detail: string;
  seconds?: number;
}

export interface IWarmupPlan {
  workoutId: number;
  source: "ai" | "rules";
  items: IWarmupItem[];
  done: boolean[];
  createdAt: number;
}

export interface IWarmupLog {
  version: 1;
  plans: IWarmupPlan[];
}

export interface IWarmupExercise {
  name: string;
  muscles: string[];
  sets: string;
}

// One year at 4 workouts a week.
export const WarmupPlan_maxPlans = 210;
const maxItems = 10;

export function WarmupPlan_exercises(
  progress: Pick<IHistoryRecord, "entries">,
  settings: ISettings
): IWarmupExercise[] {
  return progress.entries.map((entry) => {
    const exercise = Exercise_get(entry.exercise, settings.exercises);
    const first = entry.sets[0];
    const weight = first?.weight != null ? ` at ${first.weight.value} ${first.weight.unit}` : "";
    const reps = first?.reps != null ? ` of ${first.reps}` : "";
    return {
      name: exercise.name,
      muscles: Exercise_targetMuscles(entry.exercise, settings),
      sets: `${entry.sets.length} sets${reps}${weight}`,
    };
  });
}

const lowerMuscles: IMuscle[] = [
  "Quadriceps",
  "Gluteus Maximus",
  "Gluteus Medius",
  "Hamstrings",
  "Adductor Magnus",
  "Gastrocnemius",
  "Soleus",
];
const hingeMuscles: IMuscle[] = ["Hamstrings", "Erector Spinae"];
const pushMuscles: IMuscle[] = [
  "Pectoralis Major Sternal Head",
  "Pectoralis Major Clavicular Head",
  "Deltoid Anterior",
  "Deltoid Lateral",
  "Triceps Brachii",
];
const pullMuscles: IMuscle[] = [
  "Latissimus Dorsi",
  "Trapezius Middle Fibers",
  "Trapezius Lower Fibers",
  "Teres Major",
  "Deltoid Posterior",
  "Biceps Brachii",
];

function trains(exercises: IWarmupExercise[], group: IMuscle[]): boolean {
  return exercises.some((e) => e.muscles.some((m) => (group as string[]).includes(m)));
}

// The offline fallback: a fixed warmup per muscle group, picked from the day's exercises.
export function WarmupPlan_rules(exercises: IWarmupExercise[]): IWarmupItem[] {
  const items: IWarmupItem[] = [
    { name: "Easy cardio", detail: "Bike, rower or a brisk walk. Get warm, not tired.", seconds: 180 },
  ];
  if (trains(exercises, lowerMuscles)) {
    items.push({ name: "Leg swings", detail: "10 front to back and 10 side to side, each leg." });
    items.push({ name: "Bodyweight squats", detail: "10 slow reps, as deep as feels good." });
  }
  if (trains(exercises, hingeMuscles)) {
    items.push({ name: "Hip hinges", detail: "10 reps, hands on hips, push the hips back with a flat back." });
  }
  if (trains(exercises, lowerMuscles)) {
    items.push({ name: "Glute bridges", detail: "10 reps, squeeze for 2 seconds at the top." });
  }
  if (trains(exercises, pushMuscles)) {
    items.push({ name: "Arm circles", detail: "10 small to big circles each way." });
    items.push({ name: "Push-ups", detail: "8 easy reps. Do them on your knees if that is easier." });
  }
  if (trains(exercises, pullMuscles)) {
    items.push({
      name: "Band pull-aparts",
      detail: "15 reps with a light band. No band: 10 reverse flys with no weight.",
    });
    items.push({ name: "Dead hang", detail: "Hang from a pull-up bar, shoulders active.", seconds: 20 });
  }
  const first = exercises[0];
  if (first != null) {
    items.push({ name: "Ramp-up sets", detail: `Do the warmup sets the app shows for ${first.name}.` });
  }
  return items;
}

function text(value: unknown, max: number): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim().slice(0, max) : undefined;
}

// The model's reply is untrusted text, so only well-formed items survive.
export function WarmupPlan_parseAi(raw: string): IWarmupItem[] | undefined {
  const list = (JsonInText_extract(raw) as { items?: unknown } | undefined)?.items;
  if (!Array.isArray(list)) {
    return undefined;
  }
  const items = list.flatMap((item): IWarmupItem[] => {
    const r = (item ?? {}) as Record<string, unknown>;
    const name = text(r.name, 60);
    const detail = text(r.detail, 200);
    if (name == null || detail == null) {
      return [];
    }
    const seconds =
      typeof r.seconds === "number" && r.seconds >= 5 && r.seconds <= 900 ? Math.round(r.seconds) : undefined;
    return [seconds != null ? { name, detail, seconds } : { name, detail }];
  });
  return items.length >= 2 ? items.slice(0, maxItems) : undefined;
}

export function WarmupPlan_build(
  workoutId: number,
  source: IWarmupPlan["source"],
  items: IWarmupItem[],
  now: number
): IWarmupPlan {
  return { workoutId, source, items, done: items.map(() => false), createdAt: now };
}

export function WarmupPlan_toggle(plan: IWarmupPlan, index: number): IWarmupPlan {
  return { ...plan, done: plan.done.map((d, i) => (i === index ? !d : d)) };
}

export function WarmupPlan_doneCount(plan: IWarmupPlan): number {
  return plan.done.filter((d) => d).length;
}

export function WarmupPlan_empty(): IWarmupLog {
  return { version: 1, plans: [] };
}

export function WarmupPlan_find(log: IWarmupLog, workoutId: number): IWarmupPlan | undefined {
  return log.plans.find((p) => p.workoutId === workoutId);
}

export function WarmupPlan_put(log: IWarmupLog, plan: IWarmupPlan): IWarmupLog {
  const others = log.plans.filter((p) => p.workoutId !== plan.workoutId);
  return { ...log, plans: [plan, ...others].slice(0, WarmupPlan_maxPlans) };
}

function parsePlan(raw: unknown): IWarmupPlan | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (typeof r.workoutId !== "number" || typeof r.createdAt !== "number") {
    return undefined;
  }
  const items = WarmupPlan_parseAi(JSON.stringify({ items: r.items }));
  if (items == null) {
    return undefined;
  }
  const done = items.map((_, i) => Array.isArray(r.done) && r.done[i] === true);
  return {
    workoutId: SetClips_workoutId({ id: r.workoutId, startTime: r.createdAt }),
    source: r.source === "ai" ? "ai" : "rules",
    items,
    done,
    createdAt: r.createdAt,
  };
}

export function WarmupPlan_parseLog(raw: unknown): IWarmupLog {
  const r = (raw ?? {}) as Record<string, unknown>;
  const plans = Array.isArray(r.plans) ? r.plans.map(parsePlan).filter((p): p is IWarmupPlan => p != null) : [];
  return { version: 1, plans };
}
