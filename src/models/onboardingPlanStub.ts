// Stands in for O1's bearPlace.ts, bearPlan.ts and bearPlanRecommend.ts until that batch lands. Same names, same shapes.
import { IEquipment } from "../types";

export type IBearPlacePick = "gym" | "dumbbells" | "street" | "none";
export type IBearPlace = "gym" | "dumbbells" | "street" | "floor";
export type IBearGoal = "size" | "strength" | "both";

export interface IBearPlanParams {
  days: 3 | 4 | 5;
  goal: IBearGoal;
  places: IBearPlace[];
  agile: boolean;
  youth: boolean;
}

export interface IBearPlanInput {
  picks: IBearPlacePick[];
  goal: IBearGoal;
  agile: boolean;
  experience: "new" | "months" | "years";
  age?: number;
}

export interface IBearPlanCard {
  params: IBearPlanParams;
  name: string;
  days: 3 | 4 | 5;
  minutes: number;
  summary: string;
  recommended: boolean;
}

const placeOrder: IBearPlace[] = ["gym", "dumbbells", "street", "floor"];

const placeEquipment: Record<IBearPlace, IEquipment[]> = {
  gym: ["barbell", "dumbbell", "cable", "leverageMachine", "smith", "ezbar", "trapbar", "kettlebell", "bodyweight"],
  dumbbells: ["dumbbell", "bodyweight"],
  street: ["bodyweight"],
  floor: ["bodyweight"],
};

export function BearPlace_resolve(picks: IBearPlacePick[]): IBearPlace[] {
  const places = new Set<IBearPlace>(picks.map((p) => (p === "none" ? "floor" : p)));
  places.add("floor");
  return placeOrder.filter((p) => places.has(p));
}

export function BearPlace_equipmentKeys(places: IBearPlace[]): IEquipment[] {
  return Array.from(new Set(places.flatMap((p) => placeEquipment[p])));
}

const fixedPlan = `# Week 1
## Full Body A
Squat, Bodyweight / 3x8-12 / progress: dp(0lb, 8, 12)
Push Up / 3x6-12 / progress: dp(0lb, 6, 12)
Inverted Row / 3x6-12 / progress: dp(0lb, 6, 12)
Lunge, Bodyweight / 3x8-12 / progress: dp(0lb, 8, 12)
Glute Bridge / 3x10-15 / progress: dp(0lb, 10, 15)
Dead Bug / 3x8-12

## Full Body B
Squat, Bodyweight / 3x8-12 / progress: dp(0lb, 8, 12)
Pike Push Up / 3x6-12 / progress: dp(0lb, 6, 12)
Inverted Row / 3x6-12 / progress: dp(0lb, 6, 12)
Glute Bridge / 3x10-15 / progress: dp(0lb, 10, 15)
Superman / 3x10-15 / progress: dp(0lb, 10, 15)
Dead Bug / 3x8-12

## Full Body C
Lunge, Bodyweight / 3x8-12 / progress: dp(0lb, 8, 12)
Push Up / 3x6-12 / progress: dp(0lb, 6, 12)
Inverted Row / 3x6-12 / progress: dp(0lb, 6, 12)
Squat, Bodyweight / 3x8-12 / progress: dp(0lb, 8, 12)
Glute Bridge / 3x10-15 / progress: dp(0lb, 10, 15)
Superman / 3x10-15 / progress: dp(0lb, 10, 15)
`;

export function BearPlan_text(_params: IBearPlanParams): string {
  return fixedPlan;
}

const cardsByDays: Record<3 | 4 | 5, Pick<IBearPlanCard, "name" | "summary">> = {
  3: { name: "beBEAR 3-Day Full Body", summary: "Full body three times, with a short run and a mobility day." },
  4: { name: "beBEAR 4-Day Upper/Lower", summary: "Upper body, then legs, twice a week." },
  5: { name: "beBEAR 5-Day Push/Pull/Legs", summary: "Push, pull, legs, then upper and lower." },
};

const recommendedDays: Record<IBearPlanInput["experience"], 3 | 4 | 5> = { new: 3, months: 4, years: 5 };

export function BearPlan_recommend(input: IBearPlanInput): IBearPlanCard[] {
  const youth = input.age != null && input.age < 18;
  const best = recommendedDays[input.experience];
  const order = ([3, 4, 5] as const).slice().sort((a, b) => (a === best ? -1 : b === best ? 1 : a - b));
  return order.map((days) => ({
    params: { days, goal: input.goal, places: BearPlace_resolve(input.picks), agile: input.agile, youth },
    days,
    minutes: 45,
    recommended: days === best,
    ...cardsByDays[days],
  }));
}
