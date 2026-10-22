import { JSX, useMemo } from "react";
import { BearPlan_text } from "../models/bearPlan";
import { IBearPlanCard } from "../models/bearPlanRecommend";
import { OnboardingProgram_dayNames } from "../models/onboardingProgram";

export function OnboardingPlanCards(props: {
  cards: IBearPlanCard[];
  selected: number;
  busy: boolean;
  onPick: (index: number) => void;
}): JSX.Element {
  const card = props.cards[props.selected];
  const dayNames = useMemo(() => (card == null ? [] : OnboardingProgram_dayNames(BearPlan_text(card.params))), [card]);
  return (
    <>
      <h1 className="text-3xl font-bold">Your plan</h1>
      <div className="space-y-3" role="radiogroup" aria-label="Plans">
        {props.cards.map((c, i) => {
          const active = i === props.selected;
          return (
            <button
              key={c.days}
              role="radio"
              aria-checked={active}
              disabled={props.busy}
              className={`w-full p-4 text-left border-2 rounded-2xl ${
                active ? "border-yellow-500 bg-background-cardyellow" : "border-border-prominent"
              }`}
              onClick={() => props.onPick(i)}
            >
              {c.recommended && (
                <span className="inline-block px-2 py-1 mb-2 text-xs font-bold text-black rounded-full bg-yellow-400">
                  Best for you
                </span>
              )}
              <span className="block text-xl font-bold">{c.name}</span>
              <span className="block text-text-secondary">
                {c.days} days a week · about {c.minutes} minutes
              </span>
              <span className="block mt-1">{c.summary}</span>
              {active && dayNames.length > 0 && (
                <ol className="pl-5 mt-3 space-y-1 list-decimal">
                  {dayNames.map((name, d) => (
                    <li key={d}>{name}</li>
                  ))}
                </ol>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-text-secondary">Start light. The app adds weight when you hit the reps.</p>
    </>
  );
}
