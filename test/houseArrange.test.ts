import "mocha";
import { expect } from "chai";
import { readFileSync } from "fs";
import {
  HouseArrange_export,
  HouseArrange_initial,
  HouseArrange_isOn,
  HouseArrange_reduce,
  HouseArrange_scene,
} from "../src/models/houseArrange";
import { BearHouse_room } from "../src/models/bearHouse";
import { HouseFrame_canvas } from "../src/models/houseFrame";

const manifestPath = "images/bear/house/manifest.json";

function fresh(): ReturnType<typeof HouseArrange_initial> {
  return HouseArrange_initial(undefined);
}

function bedRect(state: ReturnType<typeof HouseArrange_initial>): number[] {
  return state.manifest.rooms[state.room].objects.bed.rect;
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
    const [x1, y1, x2, y2] = state.manifest.rooms[state.room].objects.wardrobe.rect;
    const moved = HouseArrange_reduce(state, { type: "move", id: "wardrobe", dx: -5000, dy: 0 });
    expect(moved.manifest.rooms[moved.room].objects.wardrobe.rect).to.deep.equal([0, y1, x2 - x1, y2]);
  });

  it("clamps a move past the bottom right corner inside the canvas", () => {
    const moved = HouseArrange_reduce(fresh(), { type: "move", id: "bed", dx: 5000, dy: 9000 });
    const [x1, y1, x2, y2] = bedRect(moved);
    expect(x2).to.be.at.most(HouseFrame_canvas.width);
    expect(y2).to.be.at.most(HouseFrame_canvas.height);
    expect(x1 % 2).to.equal(0);
    expect(y1 % 2).to.equal(0);
  });

  it("snaps a move of 3 px to the 2 px grid", () => {
    const state = fresh();
    const moved = HouseArrange_reduce(state, { type: "move", id: "bed", dx: 3, dy: 0 });
    const shift = bedRect(moved)[0] - bedRect(state)[0];
    expect([2, 4]).to.include(shift);
  });

  it("moves the pill dot with its object", () => {
    const state = fresh();
    const moved = HouseArrange_reduce(state, { type: "move", id: "bed", dx: 20, dy: 0 });
    const before = state.manifest.rooms[state.room].objects.bed.pill;
    const after = moved.manifest.rooms[moved.room].objects.bed.pill;
    expect(after[0] - before[0]).to.equal(bedRect(moved)[0] - bedRect(state)[0]);
  });

  it("keeps the bottom edge and the centre when it scales by 1.05", () => {
    const state = HouseArrange_reduce(fresh(), { type: "move", id: "bed", dx: 100, dy: -100 });
    const [x1, y1, x2, y2] = bedRect(state);
    const scaled = HouseArrange_reduce(state, { type: "scale", id: "bed", factor: 1.05 });
    const [nx1, ny1, nx2, ny2] = bedRect(scaled);
    expect(ny2).to.equal(y2);
    expect(Math.abs((nx1 + nx2) / 2 - (x1 + x2) / 2)).to.be.at.most(0.5);
    expect(nx2 - nx1).to.be.greaterThan(x2 - x1);
    expect(ny2 - ny1).to.be.greaterThan(y2 - y1);
  });

  it("does not shrink an object below 20 px", () => {
    let state = fresh();
    for (let i = 0; i < 200; i++) {
      state = HouseArrange_reduce(state, { type: "scale", id: "bed", factor: 0.9 });
    }
    const [x1, y1, x2, y2] = bedRect(state);
    expect(x2 - x1).to.be.at.least(20);
    expect(y2 - y1).to.be.at.least(20);
  });

  it("moves the pill dot and the bear's feet on their own", () => {
    const state = fresh();
    const pill = state.manifest.rooms[state.room].objects.bed.pill;
    const dot = HouseArrange_reduce(state, { type: "movePill", id: "bed", dx: 10, dy: -10 });
    expect(dot.manifest.rooms[dot.room].objects.bed.pill).to.deep.equal([pill[0] + 10, pill[1] - 10]);
    expect(bedRect(dot)).to.deep.equal(bedRect(state));
    const foot = HouseArrange_reduce(state, { type: "moveFoot", dx: -10, dy: 21 });
    expect(foot.manifest.bearFoot).to.deep.equal([state.manifest.bearFoot[0] - 10, state.manifest.bearFoot[1] + 21]);
  });

  it("picks a room and an object, and ignores one that does not exist", () => {
    const state = fresh();
    const room = HouseArrange_reduce(state, { type: "pickRoom", room: "moon" });
    expect(room.room).to.equal("moon");
    expect(room.picked).to.equal(undefined);
    const picked = HouseArrange_reduce(room, { type: "pick", id: "bed" });
    expect(picked.picked).to.equal("bed");
    expect(HouseArrange_reduce(picked, { type: "pick", id: "nothing" })).to.equal(picked);
    expect(HouseArrange_reduce(picked, { type: "pick", id: undefined }).picked).to.equal(undefined);
    expect(HouseArrange_reduce(picked, { type: "pickRoom", room: "nowhere" })).to.equal(picked);
  });

  it("returns the file's values on reset", () => {
    const state = fresh();
    const edited = HouseArrange_reduce(HouseArrange_reduce(state, { type: "move", id: "bed", dx: 200, dy: 200 }), {
      type: "moveFoot",
      dx: 40,
      dy: 40,
    });
    expect(edited.manifest).to.not.deep.equal(state.manifest);
    expect(HouseArrange_reduce(edited, { type: "reset" }).manifest).to.deep.equal(state.manifest);
  });

  it("exports text that parses back to the manifest", () => {
    const edited = HouseArrange_reduce(fresh(), { type: "scale", id: "tv", factor: 1.05 });
    const text = HouseArrange_export(edited);
    expect(JSON.parse(text)).to.deep.equal(edited.manifest);
    expect(text.endsWith("}\n")).to.equal(true);
    expect(text.startsWith('{\n  "canvas"')).to.equal(true);
  });

  it("exports the untouched manifest as the file's exact text", () => {
    expect(HouseArrange_export(fresh())).to.equal(readFileSync(manifestPath, "utf8"));
  });

  it("draws every object of the picked room, unlocked, from the tool's manifest", () => {
    const state = HouseArrange_reduce(fresh(), { type: "pickRoom", room: "mars" });
    const scene = HouseArrange_scene(state);
    expect(scene.room).to.equal(BearHouse_room("mars"));
    expect(scene.objects.some((o) => o.lock != null)).to.equal(false);
    const moved = HouseArrange_scene(HouseArrange_reduce(state, { type: "moveFoot", dx: 20, dy: 0 }));
    expect(moved.art.foot.x).to.equal(scene.art.foot.x + 20);
  });
});
