import "mocha";
import { expect } from "chai";
import { readFileSync } from "fs";
import {
  HouseArrange_export,
  HouseArrange_initial,
  HouseArrange_isOn,
  HouseArrange_reduce,
  HouseArrange_scene,
  HouseArrange_slots,
} from "../src/models/houseArrange";
import { BearHouse_room, BearHouse_roomKey } from "../src/models/bearHouse";
import { HouseFrame_canvas } from "../src/models/houseFrame";

const manifestPath = "images/bear/house/manifest.json";

function fresh(): ReturnType<typeof HouseArrange_initial> {
  return HouseArrange_initial();
}

function scaleRect(state: ReturnType<typeof HouseArrange_initial>): number[] {
  return HouseArrange_slots(state).scale.rect;
}

describe("HouseArrange", () => {
  it("reads the flag from the query string", () => {
    expect(HouseArrange_isOn("?arrange=1")).to.equal(true);
    expect(HouseArrange_isOn("?a=2&arrange=1&b=3")).to.equal(true);
    expect(HouseArrange_isOn("?arrange=0")).to.equal(false);
    expect(HouseArrange_isOn("?disarrange=1")).to.equal(false);
    expect(HouseArrange_isOn("")).to.equal(false);
  });

  it("clamps a move past the left edge to 0", () => {
    const state = fresh();
    const [x1, y1, x2, y2] = HouseArrange_slots(state).calendar.rect;
    const moved = HouseArrange_reduce(state, { type: "move", id: "calendar", dx: -5000, dy: 0 });
    expect(HouseArrange_slots(moved).calendar.rect).to.deep.equal([0, y1, x2 - x1, y2]);
  });

  it("clamps a move past the bottom right corner inside the canvas", () => {
    const moved = HouseArrange_reduce(fresh(), { type: "move", id: "scale", dx: 5000, dy: 9000 });
    const [x1, y1, x2, y2] = scaleRect(moved);
    expect(x2).to.be.at.most(HouseFrame_canvas.width);
    expect(y2).to.be.at.most(HouseFrame_canvas.height);
    expect(x1 % 2).to.equal(0);
    expect(y1 % 2).to.equal(0);
  });

  it("snaps a move of 3 px to the 2 px grid", () => {
    const state = fresh();
    const moved = HouseArrange_reduce(state, { type: "move", id: "scale", dx: 3, dy: 0 });
    const shift = scaleRect(moved)[0] - scaleRect(state)[0];
    expect([2, 4]).to.include(shift);
  });

  it("moves the pill dot with its object", () => {
    const state = fresh();
    const moved = HouseArrange_reduce(state, { type: "move", id: "scale", dx: 20, dy: 0 });
    const before = HouseArrange_slots(state).scale.pill;
    const after = HouseArrange_slots(moved).scale.pill;
    expect(after[0] - before[0]).to.equal(scaleRect(moved)[0] - scaleRect(state)[0]);
  });

  it("keeps the bottom edge and the centre when it scales by 1.05", () => {
    const state = HouseArrange_reduce(fresh(), { type: "move", id: "scale", dx: 100, dy: -100 });
    const [x1, y1, x2, y2] = scaleRect(state);
    const scaled = HouseArrange_reduce(state, { type: "scale", id: "scale", factor: 1.05 });
    const [nx1, ny1, nx2, ny2] = scaleRect(scaled);
    expect(ny2).to.equal(y2);
    expect(Math.abs((nx1 + nx2) / 2 - (x1 + x2) / 2)).to.be.at.most(1);
    expect(nx1 % 2).to.equal(0);
    expect(nx2 % 2).to.equal(0);
    expect(nx2 - nx1).to.be.greaterThan(x2 - x1);
    expect(ny2 - ny1).to.be.greaterThan(y2 - y1);
  });

  it("snaps every edge to 2 px when [100, 200, 300, 400] scales by 1.05", () => {
    const state = fresh();
    const room = state.manifest.rooms[BearHouse_roomKey];
    const seeded = {
      ...state,
      manifest: {
        ...state.manifest,
        rooms: {
          ...state.manifest.rooms,
          [BearHouse_roomKey]: {
            ...room,
            objects: { ...room.objects, scale: { ...room.objects.scale, rect: [100, 200, 300, 400] } },
          },
        },
      },
    };
    const scaled = HouseArrange_reduce(seeded, { type: "scale", id: "scale", factor: 1.05 });
    expect(scaleRect(scaled)).to.deep.equal([96, 190, 306, 400]);
  });

  it("does not shrink an object below 20 px", () => {
    let state = fresh();
    for (let i = 0; i < 200; i++) {
      state = HouseArrange_reduce(state, { type: "scale", id: "scale", factor: 0.9 });
    }
    const [x1, y1, x2, y2] = scaleRect(state);
    expect(x2 - x1).to.be.at.least(20);
    expect(y2 - y1).to.be.at.least(20);
  });

  it("moves the pill dot and the bear's feet on their own", () => {
    const state = fresh();
    const pill = HouseArrange_slots(state).scale.pill;
    const dot = HouseArrange_reduce(state, { type: "movePill", id: "scale", dx: 10, dy: -10 });
    expect(HouseArrange_slots(dot).scale.pill).to.deep.equal([pill[0] + 10, pill[1] - 10]);
    expect(scaleRect(dot)).to.deep.equal(scaleRect(state));
    const foot = HouseArrange_reduce(state, { type: "moveFoot", dx: -10, dy: 20 });
    expect(foot.manifest.bearFoot).to.deep.equal([state.manifest.bearFoot[0] - 10, state.manifest.bearFoot[1] + 20]);
  });

  it("picks an object, and ignores one that does not exist", () => {
    const picked = HouseArrange_reduce(fresh(), { type: "pick", id: "scale" });
    expect(picked.picked).to.equal("scale");
    expect(HouseArrange_reduce(picked, { type: "pick", id: "nothing" })).to.equal(picked);
    expect(HouseArrange_reduce(picked, { type: "pick", id: undefined }).picked).to.equal(undefined);
  });

  it("returns the file's values on reset", () => {
    const state = fresh();
    const edited = HouseArrange_reduce(HouseArrange_reduce(state, { type: "move", id: "scale", dx: 200, dy: 200 }), {
      type: "moveFoot",
      dx: 40,
      dy: 40,
    });
    expect(edited.manifest).to.not.deep.equal(state.manifest);
    expect(HouseArrange_reduce(edited, { type: "reset" }).manifest).to.deep.equal(state.manifest);
  });

  it("exports text that parses back to the manifest", () => {
    const edited = HouseArrange_reduce(fresh(), { type: "scale", id: "mirror", factor: 1.05 });
    const text = HouseArrange_export(edited);
    expect(JSON.parse(text)).to.deep.equal(edited.manifest);
    expect(text.endsWith("}\n")).to.equal(true);
    expect(text.startsWith('{\n  "canvas"')).to.equal(true);
  });

  it("exports the untouched manifest as the file's exact text", () => {
    expect(HouseArrange_export(fresh())).to.equal(readFileSync(manifestPath, "utf8"));
  });

  it("starts in the cabin and draws its eight objects from the tool's manifest", () => {
    const state = fresh();
    const scene = HouseArrange_scene(state);
    expect(scene.room).to.equal(BearHouse_room());
    expect(scene.objects.map((o) => o.id)).to.have.members([
      "whiteboard",
      "door",
      "bowl",
      "bed",
      "scale",
      "calendar",
      "phone",
      "mirror",
    ]);
    expect(scene.objects.find((o) => o.id === "door")?.isPainted).to.equal(true);
    const moved = HouseArrange_scene(HouseArrange_reduce(state, { type: "moveFoot", dx: 20, dy: 0 }));
    expect(moved.art.foot.x).to.equal(scene.art.foot.x + 20);
  });
});
