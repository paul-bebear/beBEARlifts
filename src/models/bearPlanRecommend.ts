import { IBearPlacePick, BearPlace_resolve } from "./bearPlace";
import { IBearGoal, IBearPlanParams } from "./bearPlan";

export interface IBearPlanInput {
  picks: IBearPlacePick[];
  goal: IBearGoal;
  agile: boolean;
  experience: "new" | "months" | "years";
  days?: 2 | 3 | 4 | 5 | 6;
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

const adultAge = 18;

const daysOfExperience: Record<IBearPlanInput["experience"], IBearPlanParams["days"]> = {
  new: 3,
  months: 4,
  years: 5,
};

const BearPlanRecommend_names: Record<IBearPlanParams["days"], string> = {
  3: "beBEAR 3-Day Full Body",
  4: "beBEAR 4-Day Upper/Lower",
  5: "beBEAR 5-Day Upper/Lower/Push/Pull/Lower",
};

// Measured with scripts/validate_liftoscript.ts on the gym plans: 3-day days run 47-56 minutes
// because of the run and the stretch block, 4-day and 5-day days run 38-54.
const minutesOfDays: Record<IBearPlanParams["days"], number> = { 3: 50, 4: 45, 5: 45 };

function summaryOf(days: IBearPlanParams["days"], agile: boolean): string {
  const jumps = agile ? " Jumps and rope at the end of every day." : "";
  switch (days) {
    case 3:
      return agile
        ? `Three full-body days. Day A ends with a short run.${jumps}`
        : "Three full-body days. Day A ends with a short run, day C with stretching.";
    case 4:
      return `Upper body, then lower body, twice a week.${jumps}`;
    case 5:
      return `Upper, lower, push, pull, lower. Every muscle twice a week.${jumps}`;
  }
}

export function BearPlan_recommend(input: IBearPlanInput): IBearPlanCard[] {
  const youth = input.age != null && input.age < adultAge;
  const best = input.days == null ? daysOfExperience[input.experience] : input.days <= 3 ? 3 : input.days === 4 ? 4 : 5;
  const order: IBearPlanParams["days"][] = [best, ...([3, 4, 5] as const).filter((d) => d !== best)];
  const places = BearPlace_resolve(input.picks);
  return order.map((days) => ({
    params: { days, goal: input.goal, places, agile: input.agile, youth },
    name: BearPlanRecommend_names[days],
    days,
    minutes: minutesOfDays[days],
    summary: summaryOf(days, input.agile),
    recommended: days === best,
  }));
}
