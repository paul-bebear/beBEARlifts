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
  ["mirror", "Your progress photos. Tap it to see how you changed."],
  ["calendar", "Your month. The number is your day streak."],
  ["bed", "Your bear rests here. Tap it to see how it feels."],
  ["phone", "Your phone. Friends, music, photos, stats, badges and settings."],
];

export interface IHouseTourGate {
  screen: string | undefined;
  hasProgram: boolean;
  hasWorkoutInProgress: boolean;
  isOfferBusy: boolean;
}

// The seen flags decide who has met the tour, so the history count is not part of the gate.
// A Plus offer in flight goes first. The tour starts when the offer ends.
export function HouseTour_canStart(gate: IHouseTourGate): boolean {
  return gate.screen === "main" && gate.hasProgram && !gate.hasWorkoutInProgress && !gate.isOfferBusy;
}

// The whiteboard and the door are painted into the room and have no sprite, so their steps show the room picture.
export function HouseTour_steps(objects: readonly IBearHouseObject[], roomImage: string): IHouseTourStep[] {
  const steps: IHouseTourStep[] = [];
  for (const [id, line] of HouseTour_lines) {
    const object = objects.find((o) => o.id === id);
    if (object == null) {
      continue;
    }
    steps.push({ id, title: object.label, line, image: object.image ?? roomImage });
  }
  return steps;
}
