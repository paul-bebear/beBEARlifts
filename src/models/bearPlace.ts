import { IEquipment } from "../types";

export type IBearPlacePick = "gym" | "dumbbells" | "street" | "none";
export type IBearPlace = "gym" | "dumbbells" | "street" | "floor";

export const BearPlace_order: IBearPlace[] = ["gym", "dumbbells", "street", "floor"];

const placeOfPick: Record<IBearPlacePick, IBearPlace> = {
  gym: "gym",
  dumbbells: "dumbbells",
  street: "street",
  none: "floor",
};

const equipmentOfPlace: Record<IBearPlace, IEquipment[]> = {
  gym: ["barbell", "dumbbell", "cable", "leverageMachine", "smith", "ezbar", "trapbar", "kettlebell"],
  dumbbells: ["dumbbell"],
  street: ["bodyweight"],
  floor: ["bodyweight"],
};

export function BearPlace_resolve(picks: IBearPlacePick[]): IBearPlace[] {
  const chosen = new Set<IBearPlace>(picks.map((pick) => placeOfPick[pick]));
  chosen.add("floor");
  return BearPlace_order.filter((place) => chosen.has(place));
}

export function BearPlace_equipmentKeys(places: IBearPlace[]): IEquipment[] {
  const keys: IEquipment[] = [];
  for (const place of BearPlace_order) {
    if (!places.includes(place) && place !== "floor") {
      continue;
    }
    for (const key of equipmentOfPlace[place]) {
      if (!keys.includes(key)) {
        keys.push(key);
      }
    }
  }
  return keys;
}
