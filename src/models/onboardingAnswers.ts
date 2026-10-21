import { IFoodHeightUnit, IFoodProfile } from "./foodTargets";
import { IWeight } from "../types";

export interface IOnboardingAnswers {
  goal: "muscle" | "strength" | "lose" | "fitness";
  days: number;
  minutes: number;
  equipment: "gym" | "bodyweight" | "machines" | "dumbbells";
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

// Only these regions still weigh people in pounds and measure them in feet and inches.
const imperialRegions = ["US", "LR", "MM"];

export function OnboardingAnswers_empty(locale: string = "en-US"): IOnboardingAnswers {
  const region = locale.split(/[-_]/)[1]?.toUpperCase();
  const imperial = region == null || imperialRegions.includes(region);
  return {
    goal: "muscle",
    days: 3,
    minutes: 60,
    equipment: "gym",
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

// The built-in programs start at 3 days, so without AI a 2-day answer gets a 3-day plan.
export function OnboardingAnswers_daysLabel(days: number, useAi: boolean): string {
  return days === 2 && !useAi ? "2 (you get a 3-day plan)" : `${days}`;
}

function inRange(text: string, min: number, max: number): number | undefined {
  const n = Number(text.trim().replace(",", "."));
  return text.trim() !== "" && Number.isFinite(n) && n >= min && n <= max ? n : undefined;
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
  year: number
): {
  profile: IFoodProfile;
  weight?: IWeight;
} {
  const cm = heightCm(answers);
  const age = inRange(answers.age, 14, 100);
  const weight = inRange(answers.weight, answers.unit === "kg" ? 30 : 66, answers.unit === "kg" ? 300 : 660);
  return {
    profile: {
      activity: answers.days <= 3 ? "light" : answers.days <= 5 ? "moderate" : "active",
      goal: answers.goal === "lose" ? "lose" : answers.goal === "muscle" ? "gain" : "maintain",
      heightUnit: answers.heightUnit,
      heightCm: cm,
      sex: answers.sex,
      birthYear: age == null ? undefined : year - Math.round(age),
    },
    weight: weight == null ? undefined : { value: weight, unit: answers.unit },
  };
}
