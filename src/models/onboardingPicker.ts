import { IOnboardingAnswers } from "./onboardingAnswers";

const choices = [
  { id: "basicBeginner", level: "new", days: 3, minutes: 45, goal: "strength", equipment: "gym" },
  { id: "fierce-5", level: "new", days: 3, minutes: 60, goal: "muscle", equipment: "gym" },
  { id: "recommended-routine", level: "new", days: 3, minutes: 60, goal: "muscle", equipment: "bodyweight" },
  { id: "gzclp", level: "months", days: 3, minutes: 60, goal: "strength", equipment: "gym" },
  { id: "phul", level: "months", days: 4, minutes: 90, goal: "muscle", equipment: "gym" },
  { id: "planet-fitness-hypertrophy", level: "months", days: 4, minutes: 60, goal: "muscle", equipment: "machines" },
  { id: "the531bbb", level: "years", days: 4, minutes: 60, goal: "muscle", equipment: "gym" },
  { id: "tsa-9-week-intermediate", level: "years", days: 4, minutes: 90, goal: "strength", equipment: "gym" },
  { id: "phat", level: "years", days: 5, minutes: 90, goal: "muscle", equipment: "gym" },
  { id: "dbPpl", level: "years", days: 6, minutes: 90, goal: "muscle", equipment: "dumbbells" },
  { id: "coolcicada-ppl", level: "months", days: 6, minutes: 90, goal: "muscle", equipment: "gym" },
];

export function OnboardingPicker_pick(answers: IOnboardingAnswers): { builtin: string; note: string } {
  const goal = answers.goal === "strength" ? "strength" : "muscle";
  const compatible = choices.filter((p) => answers.equipment === "gym" || p.equipment === answers.equipment);
  let shortlist = compatible.filter((p) => p.level === answers.experience);
  if (shortlist.length === 0) {
    shortlist = compatible;
  }
  const exactDays = shortlist.filter((p) => p.days === answers.days);
  if (exactDays.length > 0) {
    shortlist = exactDays;
  } else {
    const otherLevels = compatible.filter((p) => p.days === answers.days);
    if (otherLevels.length > 0) {
      shortlist = otherLevels;
    }
  }
  const withinTime = shortlist.filter((p) => p.minutes <= answers.minutes);
  if (withinTime.length > 0) {
    shortlist = withinTime;
  }
  const matchingGoal = shortlist.filter((p) => p.goal === goal);
  const selected = (matchingGoal.length > 0 ? matchingGoal : shortlist)[0];
  const limits = selected.days !== answers.days || selected.minutes > answers.minutes;
  return {
    builtin: selected.id,
    note: [
      "Picked from the built-in programs using your answers.",
      limits ? `This plan lists ${selected.days} days a week and up to ${selected.minutes} minutes per session.` : "",
      selected.id === "the531bbb" ? "Squat and deadlift days can take 70–80 minutes." : "",
      answers.goal === "lose" ? "Food drives fat loss; lifting helps keep muscle." : "",
    ]
      .filter(Boolean)
      .join(" "),
  };
}
