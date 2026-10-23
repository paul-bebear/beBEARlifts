import type { IWeight } from "../types";
import {
  FoodLog_dayKey,
  FoodLog_dayTotals,
  FoodLog_mealForHour,
  FoodLog_setGoals,
  FoodLog_setProfile,
  IFoodEntry,
  IFoodGoals,
  IFoodLog,
  INutrients,
} from "./foodLog";
import {
  FoodTargets_factor,
  FoodTargets_fromCalories,
  FoodTargets_maintenance,
  IFoodActivity,
  IFoodBody,
  IFoodTargetsResult,
} from "./foodTargets";
import { ProgramGoal_body } from "./programGoal";
import { ISeason, Season_for, Season_lastDay, Season_names } from "./season";

export interface ISeasonFood {
  key: string;
  name: string;
  detail: string;
  nutrients: INutrients;
}

export type ISeasonNudge =
  | { kind: "change"; text: string; season: ISeason; goals?: IFoodGoals }
  | { kind: "hungry"; text: string; foods: ISeasonFood[] };

export interface ISeasonNudgeInput {
  foodLog: IFoodLog;
  latestWeight?: IWeight;
  now: Date;
}

// Rounded USDA FoodData Central values: whole milk, rolled oats, peanut butter at 16 g per tbsp,
// a 118 g banana, dry roasted mixed nuts, and 56 g of whole wheat bread.
export const SeasonNudge_foods: ISeasonFood[] = [
  {
    key: "shake",
    name: "Bear shake",
    detail: "500 ml whole milk, 60 g oats, 2 tbsp peanut butter, a banana",
    nutrients: { calories: 840, protein: 33, carbs: 99, fat: 37 },
  },
  {
    key: "nuts",
    name: "Mixed nuts",
    detail: "100 g",
    nutrients: { calories: 590, protein: 17, carbs: 25, fat: 51 },
  },
  {
    key: "sandwich",
    name: "Peanut butter sandwich",
    detail: "2 slices of bread, 2 tbsp peanut butter",
    nutrients: { calories: 330, protein: 14, carbs: 31, fat: 18 },
  },
];

const hungryHour = 18;
const hungryShare = 0.7;
const maxFoods = 3;

function withThousands(n: number): string {
  return `${Math.round(n)}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function SeasonNudge_kcalTarget(goals: IFoodGoals): number {
  return goals.calories.min;
}

// The profile keeps only a birth year, so year minus birth year can be one more than the real age.
// The under-18 rules use the younger age, so a 17 year old never gets an adult bulk or a lean deficit.
function seasonTargets(body: IFoodBody, activity: IFoodActivity, season: ISeason): IFoodTargetsResult {
  const maintenance = FoodTargets_maintenance(body, activity);
  const { factor, isDeficitBlocked } = FoodTargets_factor({ ...body, age: body.age - 1 }, season);
  return { ...FoodTargets_fromCalories(body, maintenance, maintenance * factor), isDeficitBlocked };
}

function seasonChange(input: ISeasonNudgeInput): ISeasonNudge | undefined {
  const profile = input.foodLog.profile;
  const south = !!profile.south;
  const season = Season_for(input.now, south);
  if (profile.lastSeason === season) {
    return undefined;
  }
  const body = ProgramGoal_body(profile, input.latestWeight, input.now.getFullYear());
  const result = body == null ? undefined : seasonTargets(body, profile.activity, season);
  const lines = [
    profile.lastSeason == null ? undefined : `${Season_names[profile.lastSeason]} season is over.`,
    `${Season_names[season]} season until ${Season_lastDay(season, south)}.`,
    result == null ? "Open food targets to get your new numbers." : `New target: ${withThousands(result.target)} kcal.`,
    result?.isDeficitBlocked ? "Under 18 or with a BMI under 20, it stays at maintenance." : undefined,
  ];
  return { kind: "change", season, goals: result?.goals, text: lines.filter((l) => l != null).join(" ") };
}

function hungry(input: ISeasonNudgeInput): ISeasonNudge | undefined {
  const { foodLog, now } = input;
  if (Season_for(now, !!foodLog.profile.south) !== "bulk" || now.getHours() < hungryHour) {
    return undefined;
  }
  const target = SeasonNudge_kcalTarget(foodLog.goals);
  const eaten = FoodLog_dayTotals(foodLog, FoodLog_dayKey(now)).calories;
  if (target <= 0 || eaten >= target * hungryShare) {
    return undefined;
  }
  const left = Math.round((target - eaten) / 10) * 10;
  const foods = [...SeasonNudge_foods]
    .sort((a, b) => Math.abs(a.nutrients.calories - left) - Math.abs(b.nutrients.calories - left))
    .slice(0, maxFoods);
  return { kind: "hungry", text: `Your bear is still hungry. ${withThousands(left)} kcal left.`, foods };
}

export function SeasonNudge_for(input: ISeasonNudgeInput): ISeasonNudge | undefined {
  if (!input.foodLog.profile.seasons) {
    return undefined;
  }
  return seasonChange(input) ?? hungry(input);
}

export function SeasonNudge_accept(log: IFoodLog, season: ISeason, goals: IFoodGoals | undefined): IFoodLog {
  const next = FoodLog_setProfile(log, { ...log.profile, lastSeason: season });
  return goals == null ? next : FoodLog_setGoals(next, goals);
}

export function SeasonNudge_entry(food: ISeasonFood, now: Date, id: string): IFoodEntry {
  return {
    id,
    day: FoodLog_dayKey(now),
    meal: FoodLog_mealForHour(now.getHours()),
    name: food.name,
    source: "manual",
    nutrients: food.nutrients,
    createdAt: now.getTime(),
  };
}
