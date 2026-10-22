import { IFoodHeightUnit, IFoodProfile } from "./foodTargets";
import { IEquipment, IEquipmentData, IWeight } from "../types";
import { IProgramGoal, IProgramGoalKind } from "./programGoal";
import { Equipment_isBuiltIn, Equipment_mergeEquipment } from "./equipment";
import { Settings_defaultEquipment } from "./settings";
import { IBearPlacePick } from "./bearPlace";
import { IBearGoal } from "./bearPlan";
import { IBearPlanInput } from "./bearPlanRecommend";

export interface IOnboardingAnswers {
  places: IBearPlacePick[];
  goal: IBearGoal;
  agile: boolean;
  experience: "new" | "months" | "years";
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

const cmPerInch = 2.54;
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

function inRange(text: string, min: number, max: number): number | undefined {
  const n = Number(text.trim().replace(",", "."));
  return text.trim() !== "" && Number.isFinite(n) && n >= min && n <= max ? n : undefined;
}

export function OnboardingAnswers_age(answers: IOnboardingAnswers): number | undefined {
  const age = inRange(answers.age, 13, 100);
  return age == null ? undefined : Math.round(age);
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
    age: OnboardingAnswers_age(answers),
  };
}

export function OnboardingAnswers_goalKind(goal: IBearGoal): IProgramGoalKind {
  return goal === "strength" ? "maintain" : "buildMuscle";
}

function heightCm(answers: IOnboardingAnswers): number | undefined {
  if (answers.heightUnit === "cm") {
    return inRange(answers.height, 120, 230);
  }
  const feet = inRange(answers.heightFt, 3, 8);
  const inches = answers.heightIn.trim() === "" ? 0 : inRange(answers.heightIn, 0, 11.99);
  const cm = feet == null || inches == null ? undefined : (feet * 12 + inches) * cmPerInch;
  return cm != null && cm >= 120 && cm <= 230 ? Math.round(cm) : undefined;
}

export function OnboardingAnswers_body(
  answers: IOnboardingAnswers,
  days: number,
  year: number
): {
  profile: IFoodProfile;
  weight?: IWeight;
} {
  const cm = heightCm(answers);
  const age = OnboardingAnswers_age(answers);
  const weight = inRange(answers.weight, answers.unit === "kg" ? 30 : 66, answers.unit === "kg" ? 300 : 660);
  return {
    profile: {
      activity: days <= 3 ? "light" : days <= 5 ? "moderate" : "active",
      goal: answers.goal === "strength" ? "maintain" : "gain",
      heightUnit: answers.heightUnit,
      heightCm: cm,
      sex: answers.sex,
      birthYear: age == null ? undefined : year - age,
    },
    weight: weight == null ? undefined : { value: weight, unit: answers.unit },
  };
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
