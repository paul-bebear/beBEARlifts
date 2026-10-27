import manifest from "../../images/bear/house/manifest.json";
import { BearHouse_artOf, BearHouse_objects, BearHouse_room, BearHouse_wallColor } from "./bearHouse";
import type { IBearHouseManifest, IBearHouseObject, IBearHouseSources, IBearHouseTier } from "./bearHouse";
import type { IBearSceneArt } from "./bearScene";
import { HouseFrame_canvas } from "./houseFrame";

export interface IHouseArrangeState {
  manifest: IBearHouseManifest;
  room: IBearHouseTier;
  picked: string | undefined;
}

export type IHouseArrangeAction =
  | { type: "move"; id: string; dx: number; dy: number }
  | { type: "scale"; id: string; factor: number }
  | { type: "movePill"; id: string; dx: number; dy: number }
  | { type: "moveFoot"; dx: number; dy: number }
  | { type: "pickRoom"; room: string }
  | { type: "pick"; id: string | undefined }
  | { type: "reset" };

export interface IHouseArrangeScene {
  room: string;
  wall: string;
  objects: IBearHouseObject[];
  art: IBearSceneArt;
}

const grid = 2;
const minSize = 20;
const everythingOpenDays = 100000;
const openSources: IBearHouseSources = {
  kcal: 0,
  kcalTarget: 0,
  hasNoteToday: false,
  streak: 1,
  friendCount: 1,
  pendingRequests: 0,
  honeyEarned: 0,
  badgeCount: 1,
  isOffline: true,
};

export function HouseArrange_isOn(search: string): boolean {
  return /[?&]arrange=1(&|$)/.test(search);
}

function fileManifest(): IBearHouseManifest {
  return JSON.parse(JSON.stringify(manifest));
}

export function HouseArrange_initial(roomImage: string | undefined): IHouseArrangeState {
  const tiers = Object.keys(manifest.rooms) as IBearHouseTier[];
  const room = tiers.find((tier) => BearHouse_room(tier) === roomImage) ?? tiers[0];
  return { manifest: fileManifest(), room, picked: undefined };
}

function snap(value: number): number {
  return Math.round(value / grid) * grid;
}

function floorToGrid(value: number): number {
  return Math.floor(value / grid) * grid;
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

function clampPoint(point: number[]): number[] {
  return [clamp(point[0], 0, HouseFrame_canvas.width), clamp(point[1], 0, HouseFrame_canvas.height)];
}

function movePoint(point: number[], dx: number, dy: number): number[] {
  return clampPoint([snap(point[0] + dx), snap(point[1] + dy)]);
}

function moveRect(rect: number[], dx: number, dy: number): number[] {
  const [x1, y1, x2, y2] = rect;
  const nx = clamp(snap(x1 + dx), 0, floorToGrid(HouseFrame_canvas.width - (x2 - x1)));
  const ny = clamp(snap(y1 + dy), 0, floorToGrid(HouseFrame_canvas.height - (y2 - y1)));
  return [nx, ny, nx + (x2 - x1), ny + (y2 - y1)];
}

// Objects stand on the bottom of their slot, so the bottom edge and the centre stay put.
function scaleRect(rect: number[], factor: number): number[] {
  const [x1, y1, x2, y2] = rect;
  const width = clamp(snap((x2 - x1) * factor), minSize, HouseFrame_canvas.width);
  const height = clamp(snap((y2 - y1) * factor), minSize, y2);
  const left = clamp(snap((x1 + x2) / 2 - width / 2), 0, floorToGrid(HouseFrame_canvas.width - width));
  const top = clamp(snap(y2 - height), 0, y2);
  return [left, top, left + width, y2];
}

function withSlot(
  state: IHouseArrangeState,
  id: string,
  change: (slot: { rect: number[]; pill: number[] }) => { rect: number[]; pill: number[] }
): IHouseArrangeState {
  const objects = state.manifest.rooms[state.room].objects;
  if (objects[id] == null) {
    return state;
  }
  const room = state.manifest.rooms[state.room];
  const rooms = {
    ...state.manifest.rooms,
    [state.room]: { ...room, objects: { ...objects, [id]: change(objects[id]) } },
  };
  return { ...state, manifest: { ...state.manifest, rooms } };
}

export function HouseArrange_reduce(state: IHouseArrangeState, action: IHouseArrangeAction): IHouseArrangeState {
  switch (action.type) {
    case "move":
      return withSlot(state, action.id, (slot) => {
        const rect = moveRect(slot.rect, action.dx, action.dy);
        const pill = clampPoint([slot.pill[0] + rect[0] - slot.rect[0], slot.pill[1] + rect[1] - slot.rect[1]]);
        return { rect, pill };
      });
    case "scale":
      return withSlot(state, action.id, (slot) => ({ ...slot, rect: scaleRect(slot.rect, action.factor) }));
    case "movePill":
      return withSlot(state, action.id, (slot) => ({ ...slot, pill: movePoint(slot.pill, action.dx, action.dy) }));
    case "moveFoot":
      return {
        ...state,
        manifest: { ...state.manifest, bearFoot: movePoint(state.manifest.bearFoot, action.dx, action.dy) },
      };
    case "pickRoom":
      return state.manifest.rooms[action.room] == null
        ? state
        : { ...state, room: action.room as IBearHouseTier, picked: undefined };
    case "pick":
      if (action.id != null && state.manifest.rooms[state.room].objects[action.id] == null) {
        return state;
      }
      return { ...state, picked: action.id };
    case "reset":
      return { ...state, manifest: fileManifest() };
  }
}

// The picked room with every object open and every source filled, so the owner can place all of them.
export function HouseArrange_scene(state: IHouseArrangeState): IHouseArrangeScene {
  return {
    room: BearHouse_room(state.room),
    wall: BearHouse_wallColor(state.room),
    objects: BearHouse_objects(state.room, everythingOpenDays, openSources, undefined, state.manifest),
    art: BearHouse_artOf(state.manifest),
  };
}

function isNumberList(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number");
}

// Same layout as the file: objects open over several lines, lists of numbers stay on one line.
function format(value: unknown, indent: string): string {
  if (isNumberList(value)) {
    return `[${value.join(", ")}]`;
  }
  if (typeof value === "object" && value != null) {
    const inner = `${indent}  `;
    const lines = Object.entries(value).map(([key, item]) => `${inner}${JSON.stringify(key)}: ${format(item, inner)}`);
    return `{\n${lines.join(",\n")}\n${indent}}`;
  }
  return JSON.stringify(value);
}

export function HouseArrange_export(state: IHouseArrangeState): string {
  return `${format(state.manifest, "")}\n`;
}
