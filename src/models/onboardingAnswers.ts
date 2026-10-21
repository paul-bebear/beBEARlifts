import { IFoodProfile } from "./foodTargets";
import { IWeight } from "../types";

export interface IOnboardingAnswers {
  goal: "muscle" | "strength" | "lose" | "fitness";
  days: number;
  minutes: number;
  equipment: "gym" | "bodyweight" | "machines" | "dumbbells";
  experience: "new" | "months" | "years";
  height: string;
  weight: string;
  unit: "kg" | "lb";
  age: string;
  sex?: "male" | "female";
  plan: string;
}

export function OnboardingAnswers_empty(): IOnboardingAnswers {
  return {
    goal: "muscle",
    days: 3,
    minutes: 60,
    equipment: "gym",
    experience: "new",
    height: "",
    weight: "",
    unit: "lb",
    age: "",
    sex: undefined,
    plan: "",
  };
}

function inRange(text: string, min: number, max: number): number | undefined {
  const n = Number(text.trim().replace(",", "."));
  return text.trim() !== "" && Number.isFinite(n) && n >= min && n <= max ? n : undefined;
}

export function OnboardingAnswers_body(
  answers: IOnboardingAnswers,
  year: number
): {
  profile: IFoodProfile;
  weight?: IWeight;
} {
  const heightCm = inRange(answers.height, 120, 230);
  const age = inRange(answers.age, 14, 100);
  const weight = inRange(answers.weight, answers.unit === "kg" ? 30 : 66, answers.unit === "kg" ? 300 : 660);
  return {
    profile: {
      activity: answers.days <= 3 ? "light" : answers.days <= 5 ? "moderate" : "active",
      goal: answers.goal === "lose" ? "lose" : answers.goal === "muscle" ? "gain" : "maintain",
      heightUnit: "cm",
      heightCm,
      sex: answers.sex,
      birthYear: age == null ? undefined : year - Math.round(age),
    },
    weight: weight == null ? undefined : { value: weight, unit: answers.unit },
  };
}
