import {
  FoodTargets_bodyError,
  FoodTargets_heightCm,
  FoodTargets_limits,
  FoodTargets_minPlanAge,
  FoodTargets_result,
  FoodTargets_toProfile,
  FoodTargets_weightKg,
  IFoodActivity,
  IFoodGoalKind,
  IFoodHeightUnit,
  IFoodProfile,
  IFoodTargetsForm,
} from "./foodTargets";
import { IFoodGoals } from "./foodLog";
import { IEquipment, IEquipmentData, IWeight } from "../types";
import { IProgramGoal, IProgramGoalKind } from "./programGoal";
import { Equipment_isBuiltIn, Equipment_mergeEquipment } from "./equipment";
import { Settings_defaultEquipment } from "./settings";
import { IBearPlacePick } from "./bearPlace";
import { IBearGoal } from "./bearPlan";
import { IBearPlanInput } from "./bearPlanRecommend";
import { NumberText_parse } from "./numberText";

export interface IOnboardingAnswers {
  places: IBearPlacePick[];
  goal: IBearGoal;
  agile: boolean;
  experience: "new" | "months" | "years";
  days?: IBearPlanInput["days"];
  activity?: IFoodActivity;
  foodGoal?: IFoodGoalKind;
  heightUnit: IFoodHeightUnit;
  height: string;
  heightFt: string;
  heightIn: string;
  weight: string;
  unit: "kg" | "lb";
  age: string;
  sex?: "male" | "female";
  plan: string;
}

const youthAge = 18;

// Only these regions still weigh people in pounds and measure them in feet and inches.
const imperialRegions = ["US", "LR", "MM"];

export function OnboardingAnswers_empty(locale: string = "en-US"): IOnboardingAnswers {
  const region = locale.split(/[-_]/)[1]?.toUpperCase();
  const imperial = region == null || imperialRegions.includes(region);
  return {
    places: [],
    goal: "size",
    agile: false,
    experience: "new",
    heightUnit: imperial ? "ftin" : "cm",
    height: "",
    heightFt: "",
    heightIn: "",
    weight: "",
    unit: imperial ? "lb" : "kg",
    age: "",
    sex: undefined,
    plan: "",
  };
}

export function OnboardingAnswers_togglePlace(places: IBearPlacePick[], pick: IBearPlacePick): IBearPlacePick[] {
  return places.includes(pick) ? places.filter((p) => p !== pick) : [...places, pick];
}

function OnboardingAnswers_age(answers: IOnboardingAnswers): number | undefined {
  const age = NumberText_parse(answers.age);
  return age == null || age < FoodTargets_minPlanAge || age > FoodTargets_limits.age[1] ? undefined : Math.round(age);
}

type IToggleKey = "activity" | "foodGoal" | "days" | "sex";

export function OnboardingAnswers_toggle<K extends IToggleKey>(
  answers: IOnboardingAnswers,
  key: K,
  value: NonNullable<IOnboardingAnswers[K]>
): Partial<IOnboardingAnswers> {
  return { [key]: answers[key] === value ? undefined : value } as Partial<IOnboardingAnswers>;
}

export function OnboardingAnswers_ageNote(answers: IOnboardingAnswers): string | undefined {
  const age = NumberText_parse(answers.age);
  if (age == null || age < FoodTargets_minPlanAge || age >= FoodTargets_limits.age[0]) {
    return undefined;
  }
  // The calculator names the age problem only once the other fields pass, so these stand-ins let its text through.
  const stand: IFoodTargetsForm = {
    ...bodyForm(answers),
    weight: "70",
    weightUnit: "kg",
    heightUnit: "cm",
    heightCm: "175",
    sex: "male",
    activity: "light",
    goal: "gain",
  };
  return FoodTargets_bodyError(stand);
}

export function OnboardingAnswers_isYouth(answers: IOnboardingAnswers): boolean {
  const age = OnboardingAnswers_age(answers);
  return age != null && age < youthAge;
}

export function OnboardingAnswers_planInput(answers: IOnboardingAnswers): IBearPlanInput {
  return {
    picks: answers.places.length > 0 ? answers.places : ["none"],
    goal: answers.goal,
    agile: answers.agile,
    experience: answers.experience,
    days: answers.days,
    age: OnboardingAnswers_age(answers),
  };
}

function OnboardingAnswers_goalKind(goal: IBearGoal): IProgramGoalKind {
  return goal === "strength" ? "maintain" : "buildMuscle";
}

function bodyForm(answers: IOnboardingAnswers): Omit<IFoodTargetsForm, "activity" | "goal"> {
  return {
    weight: answers.weight,
    weightUnit: answers.unit,
    heightUnit: answers.heightUnit,
    heightCm: answers.height,
    heightFt: answers.heightFt,
    heightIn: answers.heightIn,
    sex: answers.sex,
    age: answers.age,
  };
}

function heightCm(answers: IOnboardingAnswers): number | undefined {
  const cm = FoodTargets_heightCm(bodyForm(answers));
  return cm == null || answers.heightUnit === "cm" ? cm : Math.round(cm);
}

export function OnboardingAnswers_body(
  answers: IOnboardingAnswers,
  days: number,
  today: Date
): {
  profile: IFoodProfile;
  weight?: IWeight;
} {
  const cm = heightCm(answers);
  const age = OnboardingAnswers_age(answers);
  const weight = FoodTargets_weightKg(bodyForm(answers)) == null ? undefined : NumberText_parse(answers.weight);
  return {
    profile: {
      activity: answers.activity ?? (days <= 3 ? "light" : days <= 5 ? "moderate" : "active"),
      goal: answers.foodGoal ?? (answers.goal === "strength" ? "maintain" : "gain"),
      heightUnit: answers.heightUnit,
      heightCm: cm,
      sex: answers.sex,
      ...(age == null ? {} : { birthYear: today.getFullYear() - age, ageSetAt: today.getTime() }),
    },
    weight: weight == null ? undefined : { value: weight, unit: answers.unit },
  };
}

export function OnboardingAnswers_foodTargets(
  answers: IOnboardingAnswers,
  today: Date
): { goals: IFoodGoals; profile: IFoodProfile } | undefined {
  if (answers.activity == null || answers.foodGoal == null) {
    return undefined;
  }
  const form: IFoodTargetsForm = { ...bodyForm(answers), activity: answers.activity, goal: answers.foodGoal };
  const result = FoodTargets_result(form, today);
  return result == null ? undefined : { goals: result.goals, profile: FoodTargets_toProfile(form, today) };
}

export function OnboardingAnswers_mergeProfile(saved: IFoodProfile, next: IFoodProfile): IFoodProfile {
  const defined: Partial<IFoodProfile> = Object.fromEntries(
    Object.entries(next).filter(([, value]) => value !== undefined)
  );
  return { ...saved, ...defined };
}

export function OnboardingAnswers_programGoal(
  answers: IOnboardingAnswers,
  now: number,
  startWeight?: IWeight
): IProgramGoal {
  return {
    kind: OnboardingAnswers_goalKind(answers.goal),
    activity: "5to10k",
    startedAt: now,
    ...(startWeight != null ? { startWeight } : {}),
    ...(answers.sex != null ? { sex: answers.sex } : {}),
  };
}

// isDeleted keeps a hidden key's plates, so picking that place again in settings brings them back.
export function OnboardingAnswers_gymEquipment(
  current: Record<IEquipment, IEquipmentData | undefined>,
  keys: IEquipment[]
): Record<IEquipment, IEquipmentData | undefined> {
  const defaults = Settings_defaultEquipment();
  const kept: Partial<Record<IEquipment, IEquipmentData>> = {};
  for (const key of keys) {
    const data = current[key] ?? defaults[key];
    if (data != null) {
      kept[key] = data;
    }
  }
  const merged = Equipment_mergeEquipment(current, kept);
  const result = { ...current };
  for (const [key, data] of Object.entries(merged) as [IEquipment, IEquipmentData][]) {
    result[key] = Equipment_isBuiltIn(key) ? { ...data, isDeleted: !keys.includes(key) } : data;
  }
  return result;
}
