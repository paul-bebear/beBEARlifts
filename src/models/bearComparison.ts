export interface IBearComparison {
  name: string;
  kg: number;
}

const objects: readonly IBearComparison[] = [
  { name: "a car", kg: 1500 },
  { name: "a rhino", kg: 2300 },
  { name: "an elephant", kg: 6000 },
  { name: "a T. rex", kg: 8000 },
  { name: "a school bus", kg: 12000 },
  { name: "a humpback whale", kg: 30000 },
  { name: "an empty Boeing 737", kg: 41000 },
  { name: "a Space Shuttle orbiter", kg: 78000 },
  { name: "a blue whale", kg: 150000 },
  { name: "the Statue of Liberty", kg: 204000 },
  { name: "an empty Airbus A380", kg: 277000 },
  { name: "a fully loaded Boeing 747", kg: 400000 },
  { name: "the ISS", kg: 420000 },
  { name: "Christ the Redeemer", kg: 635000 },
  { name: "a Delta IV Heavy", kg: 733000 },
  { name: "a P&H 2800XPC mining shovel", kg: 1079000 },
  { name: "a Falcon Heavy", kg: 1420000 },
  { name: "a Saturn V", kg: 2970000 },
  { name: "a full Starship", kg: 5000000 },
];

export function BearComparison_all(): readonly IBearComparison[] {
  return objects;
}

export function BearComparison_for(kg: number): string | undefined {
  let picked: IBearComparison | undefined;
  for (const object of objects) {
    if (object.kg <= kg) {
      picked = object;
    }
  }
  return picked?.name;
}
