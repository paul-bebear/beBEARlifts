import { ILiftEquivalent, LiftEquivalents_formatCount } from "./liftEquivalents";

interface IRunThing {
  one: string;
  many: string;
  metres: number;
  emoji: string;
  swarm?: boolean;
}

// Rough nose-to-tail lengths of things from a bear's world, for a joke on a share card.
const things: IRunThing[] = [
  { one: "honeybee", many: "honeybees", metres: 0.015, emoji: "🐝", swarm: true },
  { one: "gummy bear", many: "gummy bears", metres: 0.02, emoji: "🍬", swarm: true },
  { one: "wild salmon", many: "wild salmon", metres: 0.7, emoji: "🐟" },
  { one: "sun bear", many: "sun bears", metres: 1.3, emoji: "🐻" },
  { one: "black bear", many: "black bears", metres: 1.7, emoji: "🐻" },
  { one: "giant panda", many: "giant pandas", metres: 1.7, emoji: "🐼" },
  { one: "grizzly bear", many: "grizzly bears", metres: 2.1, emoji: "🐻" },
  { one: "polar bear", many: "polar bears", metres: 2.5, emoji: "🐻‍❄️" },
  { one: "standing Kodiak bear", many: "standing Kodiak bears", metres: 3, emoji: "🐻" },
];

const phrases: { lead: string; tail: string }[] = [
  { lead: "That's", tail: "nose to tail" },
  { lead: "You ran", tail: "" },
  { lead: "Same as", tail: "lined up nose to tail" },
  { lead: "You covered", tail: "" },
  { lead: "Roughly", tail: "and still breathing" },
];

// A 5 km run is 2,381 grizzlies, so the cap is higher than for lifts. A swarm has no cap.
const minCount = 2;
const maxCount = 9999;

function wrap(value: number, length: number): number {
  return ((Math.floor(value) % length) + length) % length;
}

export function RunEquivalents_pick(distanceM: number, seed: number): ILiftEquivalent | undefined {
  const candidates = things.filter(
    (t) => distanceM / t.metres >= minCount && (t.swarm === true || distanceM / t.metres <= maxCount)
  );
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
