import { BearArt_gym } from "./bearArt";
import {
  BearHouse_gymWallColor,
  BearHouse_room,
  BearHouse_wallColor,
  IBearHouseObject,
  IBearHouseObjectId,
} from "./bearHouse";

export interface IBearHouseView {
  room: string;
  wall: string;
  objects: IBearHouseObject[];
}

export interface IBearHouseViewInput {
  hasWorkout: boolean;
  level: number;
  objects: IBearHouseObject[];
}

const workoutObjects: ReadonlySet<IBearHouseObjectId> = new Set(["whiteboard", "door"]);

export function BearHouseView_pick(input: IBearHouseViewInput): IBearHouseView {
  if (!input.hasWorkout) {
    return { room: BearHouse_room(), wall: BearHouse_wallColor(), objects: input.objects };
  }
  const room = BearArt_gym(input.level);
  return {
    room,
    wall: BearHouse_gymWallColor(room),
    objects: input.objects.filter((object) => workoutObjects.has(object.id)),
  };
}
