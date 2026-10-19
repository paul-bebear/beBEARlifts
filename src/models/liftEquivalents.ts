// Rough everyday weights, for a joke on a share card. Each is a typical adult or standard size.
const things: { one: string; many: string; kg: number; emoji: string }[] = [
  { one: "loaf of bread", many: "loaves of bread", kg: 0.8, emoji: "🍞" },
  { one: "silverback gorilla", many: "silverback gorillas", kg: 160, emoji: "🦍" },
  { one: "grizzly bear", many: "grizzly bears", kg: 300, emoji: "🐻" },
  { one: "golden retriever", many: "golden retrievers", kg: 30, emoji: "🐕" },
  { one: "house cat", many: "house cats", kg: 4.5, emoji: "🐈" },
  { one: "emperor penguin", many: "emperor penguins", kg: 23, emoji: "🐧" },
  { one: "giant panda", many: "giant pandas", kg: 100, emoji: "🐼" },
  { one: "dairy cow", many: "dairy cows", kg: 700, emoji: "🐄" },
  { one: "giraffe", many: "giraffes", kg: 1200, emoji: "🦒" },
  { one: "African elephant", many: "African elephants", kg: 6000, emoji: "🐘" },
  { one: "T. rex", many: "T. rexes", kg: 8000, emoji: "🦖" },
  { one: "grand piano", many: "grand pianos", kg: 400, emoji: "🎹" },
  { one: "Smart car", many: "Smart cars", kg: 900, emoji: "🚗" },
  { one: "washing machine", many: "washing machines", kg: 70, emoji: "🧺" },
  { one: "watermelon", many: "watermelons", kg: 9, emoji: "🍉" },
  { one: "bowling ball", many: "bowling balls", kg: 7, emoji: "🎳" },
  { one: "banana", many: "bananas", kg: 0.12, emoji: "🍌" },
  { one: "avocado", many: "avocados", kg: 0.2, emoji: "🥑" },
  { one: "sumo wrestler", many: "sumo wrestlers", kg: 150, emoji: "🤼" },
  { one: "Shetland pony", many: "Shetland ponies", kg: 200, emoji: "🐴" },
];

const minCount = 2;
const maxCount = 100000;

export interface ILiftEquivalent {
  count: number;
  text: string;
  emoji: string;
}

function format(count: number): string {
  return count < 10 ? `${Math.round(count * 10) / 10}` : Math.round(count).toLocaleString("en-US");
}

// The seed comes from the shuffle button, so the same seed always gives the same line.
export function LiftEquivalents_pick(totalKg: number, seed: number): ILiftEquivalent | undefined {
  const fitting = things.filter((t) => totalKg / t.kg >= minCount && totalKg / t.kg <= maxCount);
  if (fitting.length === 0) {
    return undefined;
  }
  const thing = fitting[((Math.floor(seed) % fitting.length) + fitting.length) % fitting.length];
  const count = totalKg / thing.kg;
  return { count, emoji: thing.emoji, text: `That's ${format(count)} ${thing.many}` };
}

export function LiftEquivalents_count(totalKg: number): number {
  return things.filter((t) => totalKg / t.kg >= minCount && totalKg / t.kg <= maxCount).length;
}
