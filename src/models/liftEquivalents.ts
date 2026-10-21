export interface ILiftThing {
  one: string;
  many: string;
  kg: number;
  emoji: string;
  swarm?: boolean;
}

export interface ILiftEquivalent {
  count: number;
  number: string;
  noun: string;
  lead: string;
  tail: string;
  emoji: string;
  text: string;
}

// Rough weights of things from a bear's world, for a joke on a share card. Adults unless the name says cub.
const things: ILiftThing[] = [
  { one: "honeybee", many: "honeybees", kg: 0.0001, emoji: "🐝", swarm: true },
  { one: "blueberry", many: "blueberries", kg: 0.002, emoji: "🫐", swarm: true },
  { one: "gummy bear", many: "gummy bears", kg: 0.0025, emoji: "🍬", swarm: true },
  { one: "strawberry", many: "strawberries", kg: 0.012, emoji: "🍓" },
  { one: "newborn panda cub", many: "newborn panda cubs", kg: 0.15, emoji: "🐼" },
  { one: "jar of honey", many: "jars of honey", kg: 0.5, emoji: "🍯" },
  { one: "honeycomb frame", many: "honeycomb frames", kg: 2.5, emoji: "🍯" },
  { one: "wild salmon", many: "wild salmon", kg: 4, emoji: "🐟" },
  { one: "picnic basket", many: "picnic baskets", kg: 5, emoji: "🧺" },
  { one: "polar bear cub", many: "polar bear cubs", kg: 10, emoji: "🐻‍❄️" },
  { one: "full beehive", many: "full beehives", kg: 45, emoji: "🐝" },
  { one: "sun bear", many: "sun bears", kg: 50, emoji: "🐻" },
  { one: "black bear", many: "black bears", kg: 100, emoji: "🐻" },
  { one: "giant panda", many: "giant pandas", kg: 100, emoji: "🐼" },
  { one: "grizzly bear", many: "grizzly bears", kg: 300, emoji: "🐻" },
  { one: "polar bear", many: "polar bears", kg: 450, emoji: "🐻‍❄️" },
  { one: "Kodiak bear", many: "Kodiak bears", kg: 600, emoji: "🐻" },
];

const phrases: { lead: string; tail: string }[] = [
  { lead: "That's", tail: "" },
  { lead: "You moved", tail: "" },
  { lead: "That's", tail: "of pure gains" },
  { lead: "You lifted", tail: "today" },
  { lead: "Same as lifting", tail: "" },
  { lead: "Today you hauled", tail: "" },
  { lead: "Roughly", tail: "and still smiling" },
];

// Under 2 reads as "1.4 grizzlies"; over 999 reads as "48,000 salmon". A swarm stays funny at 50 million.
const minCount = 2;
const maxCount = 999;
const million = 1000000;

export function LiftEquivalents_all(): readonly ILiftThing[] {
  return things;
}

export function LiftEquivalents_formatCount(count: number): string {
  if (count >= million) {
    const millions = count / million;
    return `${millions < 10 ? Math.round(millions * 10) / 10 : Math.round(millions).toLocaleString("en-US")} million`;
  }
  return count < 10 ? `${Math.round(count * 10) / 10}` : Math.round(count).toLocaleString("en-US");
}

function nameHash(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 1000003;
  }
  return hash;
}

function wrap(seed: number, length: number): number {
  return ((Math.floor(seed) % length) + length) % length;
}

// Sorted by a name hash so that consecutive shuffles jump between bees, berries and bears.
function fitting(totalKg: number): ILiftThing[] {
  return things
    .filter((t) => totalKg / t.kg >= minCount && (t.swarm === true || totalKg / t.kg <= maxCount))
    .sort((a, b) => nameHash(a.many) - nameHash(b.many));
}

export function LiftEquivalents_count(totalKg: number): number {
  return fitting(totalKg).length;
}

// The seed comes from the shuffle button. Each press moves to the next thing and the next phrase.
export function LiftEquivalents_pick(totalKg: number, seed: number): ILiftEquivalent | undefined {
  const candidates = fitting(totalKg);
  if (candidates.length === 0) {
    return undefined;
  }
  const thing = candidates[wrap(seed, candidates.length)];
  const phrase = phrases[wrap(seed, phrases.length)];
  const count = totalKg / thing.kg;
  const number = LiftEquivalents_formatCount(count);
  const text = [phrase.lead, `${number} ${thing.many}`, phrase.tail].filter((s) => s !== "").join(" ");
  return { count, number, noun: thing.many, lead: phrase.lead, tail: phrase.tail, emoji: thing.emoji, text };
}
