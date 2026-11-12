import "mocha";
import { expect } from "chai";
import { BearHouse_objects, BearHouse_room, IBearHouseObjectId, IBearHouseSources } from "../src/models/bearHouse";
import { HouseTour_canStart, HouseTour_lines, HouseTour_steps } from "../src/models/houseTour";

const sources: IBearHouseSources = { fullness: 0, dayOfMonth: 1, pendingRequests: 0, hasWorkout: false };
const room = BearHouse_room("cabin");
const order: IBearHouseObjectId[] = ["whiteboard", "door", "bowl", "scale", "mirror", "calendar", "bed", "phone"];

describe("HouseTour_steps", () => {
  it("gives eight steps in the tour order on day 0", () => {
    const steps = HouseTour_steps(BearHouse_objects("cabin", sources, undefined), room);
    expect(steps.map((s) => s.id)).to.deep.equal(order);
    expect(HouseTour_lines.map(([id]) => id)).to.deep.equal(order);
  });

  it("uses the object's label as the title and the table's line as the text", () => {
    const objects = BearHouse_objects("cabin", sources, undefined);
    for (const step of HouseTour_steps(objects, room)) {
      expect(step.title).to.equal(objects.find((o) => o.id === step.id)!.label);
      expect(step.line).to.equal(HouseTour_lines.find(([id]) => id === step.id)![1]);
    }
  });

  it("writes a line for the mirror, the bowl and the calendar", () => {
    const line = (id: IBearHouseObjectId): string => HouseTour_lines.find(([lineId]) => lineId === id)![1];
    expect(line("mirror")).to.contain("progress photos");
    expect(line("bowl")).to.contain("log a meal");
    expect(line("calendar")).to.contain("workouts, meals and weigh-ins");
    expect(line("calendar")).to.not.contain("Journal");
    expect(line("calendar")).to.not.contain("streak");
  });

  it("shows each sprite, and the room picture for the whiteboard and the painted door", () => {
    const objects = BearHouse_objects("cabin", sources, undefined);
    for (const step of HouseTour_steps(objects, room)) {
      const image = objects.find((o) => o.id === step.id)!.image;
      expect(step.image).to.equal(step.id === "whiteboard" || step.id === "door" ? room : image);
    }
  });

  it("leaves out an object the room has no slot for", () => {
    const objects = BearHouse_objects("cabin", sources, undefined).filter((o) => o.id !== "mirror");
    expect(HouseTour_steps(objects, room).map((s) => s.id)).to.not.include("mirror");
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
