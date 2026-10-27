import { IBearHouseObject, IBearHouseObjectId } from "./bearHouse";

export interface IHouseTourStep {
  id: IBearHouseObjectId;
  title: string;
  line: string;
  image: string;
}

export const HouseTour_lines: ReadonlyArray<readonly [IBearHouseObjectId, string]> = [
  ["whiteboard", "Your to-do list. Tap a line to log it."],
  ["door", "The gym. Tap it to start a workout."],
  ["bowl", "Your food. Tap it to see today's meals."],
  ["scale", "Weigh in here."],
  ["bed", "Your bear rests here. Tap it to see how it feels."],
  ["notebook", "Your journal. Every day you logged is in it."],
  ["tv", "Your friends. Add one to see their workouts."],
  ["phone", "Settings and everything else."],
  ["passport", "A stamp for every city you train in. Coming soon."],
];

// The whiteboard is painted into the room and has no sprite, so its step shows the room picture.
export function HouseTour_steps(objects: readonly IBearHouseObject[], roomImage: string): IHouseTourStep[] {
  const steps: IHouseTourStep[] = [];
  for (const [id, line] of HouseTour_lines) {
    const object = objects.find((o) => o.id === id);
    if (object == null || object.lock != null) {
      continue;
    }
    steps.push({ id, title: object.label, line, image: object.image ?? roomImage });
  }
  return steps;
}
