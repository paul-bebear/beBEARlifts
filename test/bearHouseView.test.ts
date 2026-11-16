import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import { BearArt_gym } from "../src/models/bearArt";
import {
  BearHouse_doorLabel,
  BearHouse_gymWallColor,
  BearHouse_objects,
  IBearHouseObject,
} from "../src/models/bearHouse";
import { BearHouseView_pick } from "../src/models/bearHouseView";
import { BearTier_all } from "../src/models/bearTier";

const sources = { fullness: 0, dayOfMonth: 1, pendingRequests: 0, hasWorkout: false };
const workoutSources = { ...sources, hasWorkout: true };

function cabin(hasWorkout: boolean): IBearHouseObject[] {
  return BearHouse_objects(hasWorkout ? workoutSources : sources, undefined);
}

function webpSize(file: string): [number, number] {
  const bytes = fs.readFileSync(path.join(__dirname, "..", file));
  expect(bytes.toString("ascii", 8, 15), file).to.equal("WEBPVP8");
  expect(bytes.toString("ascii", 15, 16), file).to.equal(" ");
  const fourteenBits = 16384;
  return [bytes.readUInt16LE(26) % fourteenBits, bytes.readUInt16LE(28) % fourteenBits];
}

describe("BearHouseView_pick", () => {
  it("shows the cabin with all eight objects when no workout runs", () => {
    const view = BearHouseView_pick({ hasWorkout: false, level: 12, objects: cabin(false) });
    expect(view.room).to.equal("/images/bear/house/room-cabin.webp");
    expect(view.wall).to.equal("#EBD2C0");
    expect(view.objects.map((o) => o.id)).to.have.members([
      "whiteboard",
      "door",
      "bowl",
      "bed",
      "scale",
      "calendar",
      "phone",
      "mirror",
    ]);
  });

  it("shows the gym of the bear's level while a workout runs", () => {
    for (const tier of BearTier_all("male")) {
      const view = BearHouseView_pick({ hasWorkout: true, level: tier.level, objects: cabin(true) });
      expect(view.room, `level ${tier.level}`).to.equal(`/images/bear/gyms/${tier.gym}.webp`);
      expect(view.room).to.equal(BearArt_gym(tier.level));
      expect(view.wall, `level ${tier.level}`).to.equal(BearHouse_gymWallColor(view.room));
    }
  });

  it("walks the seven gyms up the 12 levels", () => {
    const rooms = Array.from(
      { length: 12 },
      (_, index) => BearHouseView_pick({ hasWorkout: true, level: index + 1, objects: cabin(true) }).room
    );
    expect(rooms.map((room) => path.basename(room, ".webp"))).to.deep.equal([
      "trailer-park",
      "trailer-park",
      "trailer-park",
      "discount-gym",
      "discount-gym",
      "luxury-club",
      "luxury-club",
      "mansion-gym",
      "mansion-gym",
      "spaceship",
      "moon",
      "mars",
    ]);
  });

  it("keeps only the whiteboard and the door during a workout", () => {
    const view = BearHouseView_pick({ hasWorkout: true, level: 5, objects: cabin(true) });
    expect(view.objects.map((o) => o.id)).to.deep.equal(["whiteboard", "door"]);
  });

  it("keeps the whiteboard and door rects the cabin uses, so the gym art lines up", () => {
    const home = BearHouseView_pick({ hasWorkout: false, level: 5, objects: cabin(false) });
    const gym = BearHouseView_pick({ hasWorkout: true, level: 5, objects: cabin(true) });
    for (const id of ["whiteboard", "door"] as const) {
      const before = home.objects.find((o) => o.id === id)!;
      const after = gym.objects.find((o) => o.id === id)!;
      expect(after.rect, id).to.deep.equal(before.rect);
      expect(after.pillAt, id).to.deep.equal(before.pillAt);
    }
  });

  it("makes the door open the running workout, with the Back to workout pill", () => {
    const view = BearHouseView_pick({ hasWorkout: true, level: 5, objects: cabin(true) });
    const door = view.objects.find((o) => o.id === "door")!;
    expect(door.target).to.deep.equal({ kind: "door" });
    expect(door.pill).to.equal(BearHouse_doorLabel.workout);
    expect(door.label).to.equal("Back to workout");
    expect(door.isPainted).to.equal(true);
    expect(door.image).to.equal(undefined);
  });

  it("opens the whiteboard on the plus sheet", () => {
    const view = BearHouseView_pick({ hasWorkout: true, level: 5, objects: cabin(true) });
    expect(view.objects.find((o) => o.id === "whiteboard")!.target).to.deep.equal({ kind: "plus" });
  });
});

describe("the painted gyms", () => {
  it("ships each gym at 768 by 1728, the cabin's 4 by 9 shape", () => {
    for (const tier of BearTier_all("male")) {
      expect(webpSize(BearArt_gym(tier.level)), BearArt_gym(tier.level)).to.deep.equal([768, 1728]);
    }
    expect(webpSize("/images/bear/house/room-cabin.webp")).to.deep.equal([768, 1728]);
  });

  it("ships only gyms that a tier names", () => {
    const named = new Set(BearTier_all("male").map((tier) => `${tier.gym}.webp`));
    const shipped = fs.readdirSync(path.join(__dirname, "..", "images", "bear", "gyms")).sort();
    expect(shipped).to.deep.equal([...named].sort());
  });
});
