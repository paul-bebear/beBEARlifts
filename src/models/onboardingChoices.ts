import { IBearPlacePick } from "./bearPlace";
import { IBearGoal } from "./bearPlan";
import { CubNumber_label } from "./cubNumber";
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

export function OnboardingChoices_welcomeLine(signedIn: boolean, cub: number | undefined): string {
  if (!signedIn) {
    return "Sign in to get your cub number";
  }
  return cub == null ? "Getting your cub number…" : `You are ${CubNumber_label(cub)}.`;
}
