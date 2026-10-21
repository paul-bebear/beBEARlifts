import { ILiftEquivalent, LiftEquivalents_formatCount } from "./liftEquivalents";

interface IRunThing {
  one: string;
  many: string;
  metres: number;
  emoji: string;
}

// Rough everyday lengths, for a joke on a share card.
const things: IRunThing[] = [
  { one: "banana", many: "bananas", metres: 0.18, emoji: "🍌" },
  { one: "corgi", many: "corgis", metres: 0.6, emoji: "🐶" },
  { one: "giraffe", many: "giraffes", metres: 5.5, emoji: "🦒" },
  { one: "school bus", many: "school buses", metres: 12, emoji: "🚌" },
  { one: "T. rex", many: "T. rexes", metres: 12, emoji: "🦖" },
  { one: "bowling lane", many: "bowling lanes", metres: 18.3, emoji: "🎳" },
  { one: "tennis court", many: "tennis courts", metres: 23.8, emoji: "🎾" },
  { one: "blue whale", many: "blue whales", metres: 30, emoji: "🐋" },
  { one: "Olympic pool", many: "Olympic pools", metres: 50, emoji: "🏊" },
  { one: "jumbo jet", many: "jumbo jets", metres: 70, emoji: "✈️" },
  { one: "Statue of Liberty", many: "Statues of Liberty", metres: 93, emoji: "🗽" },
  { one: "football pitch", many: "football pitches", metres: 105, emoji: "⚽" },
  { one: "Titanic", many: "Titanics", metres: 269, emoji: "🚢" },
  { one: "Eiffel Tower", many: "Eiffel Towers", metres: 330, emoji: "🗼" },
  { one: "Empire State Building", many: "Empire State Buildings", metres: 443, emoji: "🏙️" },
  { one: "Burj Khalifa", many: "Burj Khalifas", metres: 828, emoji: "🏗️" },
  { one: "Golden Gate Bridge", many: "Golden Gate Bridges", metres: 2737, emoji: "🌉" },
  { one: "Mount Everest", many: "Mount Everests", metres: 8849, emoji: "🏔️" },
  { one: "marathon", many: "marathons", metres: 42195, emoji: "🏅" },
];

const phrases: { lead: string; tail: string }[] = [
  { lead: "That's", tail: "end to end" },
  { lead: "You ran", tail: "" },
  { lead: "Same as", tail: "laid end to end" },
  { lead: "You covered", tail: "" },
  { lead: "Roughly", tail: "and still breathing" },
];

// Under 2 reads as "1.4 Titanics"; over 999 reads as "28,000 bananas". Neither is funny.
const minCount = 2;
const maxCount = 999;

function wrap(value: number, length: number): number {
  return ((Math.floor(value) % length) + length) % length;
}

export function RunEquivalents_pick(distanceM: number, seed: number): ILiftEquivalent | undefined {
  const candidates = things.filter((t) => distanceM / t.metres >= minCount && distanceM / t.metres <= maxCount);
  if (candidates.length === 0) {
    return undefined;
  }
  const thing = candidates[wrap(seed, candidates.length)];
  const phrase = phrases[wrap(seed, phrases.length)];
  const count = distanceM / thing.metres;
  const number = LiftEquivalents_formatCount(count);
  const text = [phrase.lead, `${number} ${thing.many}`, phrase.tail].filter((s) => s !== "").join(" ");
  return { count, number, noun: thing.many, lead: phrase.lead, tail: phrase.tail, emoji: thing.emoji, text };
}
