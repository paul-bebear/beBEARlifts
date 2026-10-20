export interface ILiftThing {
  one: string;
  many: string;
  kg: number;
  emoji: string;
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

// Rough everyday weights, for a joke on a share card. Each is a typical adult or standard size.
const things: ILiftThing[] = [
  { one: "rubber duck", many: "rubber ducks", kg: 0.05, emoji: "🦆" },
  { one: "banana", many: "bananas", kg: 0.12, emoji: "🍌" },
  { one: "avocado", many: "avocados", kg: 0.2, emoji: "🥑" },
  { one: "smartphone", many: "smartphones", kg: 0.2, emoji: "📱" },
  { one: "loaf of bread", many: "loaves of bread", kg: 0.8, emoji: "🍞" },
  { one: "large pizza", many: "large pizzas", kg: 1, emoji: "🍕" },
  { one: "coconut", many: "coconuts", kg: 1.4, emoji: "🥥" },
  { one: "pineapple", many: "pineapples", kg: 1.5, emoji: "🍍" },
  { one: "gallon of milk", many: "gallons of milk", kg: 3.9, emoji: "🥛" },
  { one: "house cat", many: "house cats", kg: 4.5, emoji: "🐈" },
  { one: "sloth", many: "sloths", kg: 5, emoji: "🦥" },
  { one: "pumpkin", many: "pumpkins", kg: 5, emoji: "🎃" },
  { one: "bowling ball", many: "bowling balls", kg: 7, emoji: "🎳" },
  { one: "Thanksgiving turkey", many: "Thanksgiving turkeys", kg: 7, emoji: "🦃" },
  { one: "watermelon", many: "watermelons", kg: 9, emoji: "🍉" },
  { one: "car tire", many: "car tires", kg: 10, emoji: "🛞" },
  { one: "corgi", many: "corgis", kg: 12, emoji: "🐶" },
  { one: "Stanley Cup", many: "Stanley Cups", kg: 15.5, emoji: "🏆" },
  { one: "empty barbell", many: "empty barbells", kg: 20, emoji: "🏋️" },
  { one: "emperor penguin", many: "emperor penguins", kg: 23, emoji: "🐧" },
  { one: "golden retriever", many: "golden retrievers", kg: 30, emoji: "🐕" },
  { one: "wheel of Parmesan", many: "wheels of Parmesan", kg: 40, emoji: "🧀" },
  { one: "keg of beer", many: "kegs of beer", kg: 60, emoji: "🍺" },
  { one: "alpaca", many: "alpacas", kg: 65, emoji: "🦙" },
  { one: "washing machine", many: "washing machines", kg: 70, emoji: "🧺" },
  { one: "kangaroo", many: "kangaroos", kg: 85, emoji: "🦘" },
  { one: "giant panda", many: "giant pandas", kg: 100, emoji: "🐼" },
  { one: "scooter", many: "scooters", kg: 110, emoji: "🛵" },
  { one: "sumo wrestler", many: "sumo wrestlers", kg: 150, emoji: "🤼" },
  { one: "silverback gorilla", many: "silverback gorillas", kg: 160, emoji: "🦍" },
  { one: "lion", many: "lions", kg: 190, emoji: "🦁" },
  { one: "Shetland pony", many: "Shetland ponies", kg: 200, emoji: "🐴" },
  { one: "grizzly bear", many: "grizzly bears", kg: 300, emoji: "🐻" },
  { one: "grand piano", many: "grand pianos", kg: 400, emoji: "🎹" },
  { one: "polar bear", many: "polar bears", kg: 450, emoji: "🐻‍❄️" },
  { one: "dairy cow", many: "dairy cows", kg: 700, emoji: "🐄" },
  { one: "Smart car", many: "Smart cars", kg: 900, emoji: "🚗" },
  { one: "Liberty Bell", many: "Liberty Bells", kg: 943, emoji: "🔔" },
  { one: "great white shark", many: "great white sharks", kg: 1100, emoji: "🦈" },
  { one: "giraffe", many: "giraffes", kg: 1200, emoji: "🦒" },
  { one: "hippo", many: "hippos", kg: 1500, emoji: "🦛" },
  { one: "rhino", many: "rhinos", kg: 2300, emoji: "🦏" },
  { one: "pickup truck", many: "pickup trucks", kg: 2500, emoji: "🛻" },
  { one: "African elephant", many: "African elephants", kg: 6000, emoji: "🐘" },
  { one: "T. rex", many: "T. rexes", kg: 8000, emoji: "🦖" },
  { one: "school bus", many: "school buses", kg: 11000, emoji: "🚌" },
  { one: "blue whale", many: "blue whales", kg: 150000, emoji: "🐋" },
  { one: "jumbo jet", many: "jumbo jets", kg: 180000, emoji: "✈️" },
  { one: "Statue of Liberty", many: "Statues of Liberty", kg: 225000, emoji: "🗽" },
  { one: "Eiffel Tower", many: "Eiffel Towers", kg: 7300000, emoji: "🗼" },
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

// Under 2 reads as "1.4 giraffes"; over 999 reads as "48,000 bananas". Neither is funny.
const minCount = 2;
const maxCount = 999;

export function LiftEquivalents_all(): readonly ILiftThing[] {
  return things;
}

export function LiftEquivalents_formatCount(count: number): string {
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

// Sorted by a name hash so that consecutive shuffles jump between food, animals and vehicles.
function fitting(totalKg: number): ILiftThing[] {
  return things
    .filter((t) => totalKg / t.kg >= minCount && totalKg / t.kg <= maxCount)
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
