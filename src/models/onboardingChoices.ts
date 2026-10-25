import { IBearPlacePick } from "./bearPlace";
import { IBearGoal } from "./bearPlan";
import { IOnboardingAnswers } from "./onboardingAnswers";

export const OnboardingChoices_places: { pick: IBearPlacePick; label: string }[] = [
  { pick: "gym", label: "Full gym" },
  { pick: "dumbbells", label: "Only dumbbells" },
  { pick: "street", label: "Street workout" },
  { pick: "none", label: "No equipment" },
];

export const OnboardingChoices_experiences: { key: IOnboardingAnswers["experience"]; label: string }[] = [
  { key: "new", label: "New" },
  { key: "months", label: "A few months" },
  { key: "years", label: "Years" },
];

export const OnboardingChoices_goals: { key: IBearGoal; label: string; detail: string }[] = [
  { key: "size", label: "Size", detail: "Bigger muscles" },
  { key: "strength", label: "Strength", detail: "Lift heavier" },
  { key: "both", label: "Both", detail: "Heavy first lift, then muscle work" },
];

export const OnboardingChoices_days = [2, 3, 4, 5, 6] as const;

export function OnboardingChoices_dayLabel(days: number): string {
  return days === 6 ? "6+" : `${days}`;
}

export function OnboardingChoices_welcomeLabel(signedIn: boolean): string {
  return signedIn ? "Continue" : "Start";
}
