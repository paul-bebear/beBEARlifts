import "mocha";
import { expect } from "chai";
import { BearHouse_objects, BearHouse_room, IBearHouseObjectId, IBearHouseSources } from "../src/models/bearHouse";
import { HouseTour_canStart, HouseTour_lines, HouseTour_steps } from "../src/models/houseTour";

const sources: IBearHouseSources = {
  kcal: 0,
  kcalTarget: 0,
  hasNoteToday: false,
  streak: 0,
  friendCount: 0,
  pendingRequests: 0,
  honeyEarned: 0,
  badgeCount: 0,
  isOffline: false,
};
const room = BearHouse_room("trailer");
const order: IBearHouseObjectId[] = [
  "whiteboard",
  "door",
  "bowl",
  "scale",
  "bed",
  "notebook",
  "tv",
  "phone",
  "passport",
];

describe("HouseTour_steps", () => {
  it("gives nine steps in the tour order on day 0", () => {
    const steps = HouseTour_steps(BearHouse_objects("trailer", 0, sources, undefined), room);
    expect(steps.map((s) => s.id)).to.deep.equal(order);
  });

  it("uses the object's label as the title and the table's line as the text", () => {
    const objects = BearHouse_objects("trailer", 0, sources, undefined);
    for (const step of HouseTour_steps(objects, room)) {
      expect(step.title).to.equal(objects.find((o) => o.id === step.id)!.label);
      expect(step.line).to.equal(HouseTour_lines.find(([id]) => id === step.id)![1]);
    }
  });

  it("shows each sprite, and the room picture for the whiteboard", () => {
    const objects = BearHouse_objects("trailer", 0, sources, undefined);
    for (const step of HouseTour_steps(objects, room)) {
      const image = objects.find((o) => o.id === step.id)!.image;
      expect(step.image).to.equal(step.id === "whiteboard" ? room : image);
    }
  });

  it("still gives nine steps when the calendar is open, because the calendar has no line", () => {
    const steps = HouseTour_steps(BearHouse_objects("trailer", 3, sources, undefined), room);
    expect(steps.map((s) => s.id)).to.deep.equal(order);
  });

  it("never names a padlocked object", () => {
    const objects = BearHouse_objects("trailer", 0, sources, undefined).map((o) =>
      o.id === "bed" ? { ...o, lock: { atDays: 5, toGo: 5 } } : o
    );
    expect(HouseTour_steps(objects, room).map((s) => s.id)).to.not.include("bed");
  });
});

describe("HouseTour_canStart", () => {
  const ready = { screen: "main", hasProgram: true, hasWorkoutInProgress: false, isOfferBusy: false };

  it("starts on the home with a program, whatever the history count", () => {
    expect(HouseTour_canStart(ready)).to.equal(true);
  });

  it("waits for a Plus offer in flight", () => {
    expect(HouseTour_canStart({ ...ready, isOfferBusy: true })).to.equal(false);
  });

  it("waits while another screen or modal is open", () => {
    expect(HouseTour_canStart({ ...ready, screen: "tourModal" })).to.equal(false);
    expect(HouseTour_canStart({ ...ready, screen: undefined })).to.equal(false);
  });

  it("stays out of a workout in progress and of a home with no program", () => {
    expect(HouseTour_canStart({ ...ready, hasWorkoutInProgress: true })).to.equal(false);
    expect(HouseTour_canStart({ ...ready, hasProgram: false })).to.equal(false);
  });
});
