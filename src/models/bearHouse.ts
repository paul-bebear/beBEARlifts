import manifest from "../../images/bear/house/manifest.json";
import { IStats, IUnit } from "../types";
import { BearBoard_latestWeight } from "./bearBoard";
import { IBearBox, IBearRect, IBearSceneArt } from "./bearScene";
import { BearText_houseEmpty } from "./bearText";
import { BearFullness_percent } from "./bearFullness";
import { IFoodLog } from "./foodLog";
import type { ITab } from "./screen";

export type IBearHouseTier = keyof typeof manifest.rooms;

export type IBearHouseObjectId = "whiteboard" | "door" | "bowl" | "bed" | "scale" | "calendar" | "phone" | "mirror";

export type IBearHouseScreen = "stats" | "progressPhotos" | "food" | "foodDay";

export type IBearHouseTarget =
  | { kind: "plus" }
  | { kind: "door" }
  | { kind: "bearPanel" }
  | { kind: "screen"; screen: IBearHouseScreen; tab: ITab }
  | { kind: "phone" };

export interface IBearHouseOverlay {
  kind: "number" | "badge";
  rect: IBearRect;
  text?: string;
}

export interface IBearHouseObject {
  id: IBearHouseObjectId;
  image?: string;
  isPainted: boolean;
  label: string;
  pill?: string;
  target: IBearHouseTarget;
  rect: IBearRect;
  pillAt: { x: number; y: number };
  layer: "back" | "front";
  isNew: boolean;
  overlay?: IBearHouseOverlay;
}

export interface IBearHouseSources {
  fullness: number;
  weight?: string;
  dayOfMonth: number;
  pendingRequests: number;
  hasWorkout: boolean;
}

export interface IBearHouseSourcesInput {
  foodLog: IFoodLog;
  stats: IStats;
  units: IUnit;
  pendingRequests: number;
  hasWorkout: boolean;
  now: number;
}

type IManifestSlot = { rect: number[]; pill: number[] };

export interface IBearHouseManifest {
  canvas: number[];
  whiteboard: number[];
  bearFoot: number[];
  gymExit: IManifestSlot;
  images: Record<string, number[]>;
  rooms: Record<string, { room: string; door?: string; wall: string; objects: Record<string, IManifestSlot> }>;
  gymWalls: Record<string, string>;
}

const images: Record<string, number[]> = manifest.images;
const imageDir = "/images/bear/house";

// The room paints the whiteboard edge to edge, and the app writes ink on all of it.
export function BearHouse_artOf(source: IBearHouseManifest): IBearSceneArt {
  return {
    canvas: { width: source.canvas[0], height: source.canvas[1] },
    foot: { x: source.bearFoot[0], y: source.bearFoot[1] },
    board: [source.whiteboard[0], source.whiteboard[1], source.whiteboard[2], source.whiteboard[3]],
    inkBottom: source.whiteboard[3],
  };
}

export const BearHouse_art: IBearSceneArt = BearHouse_artOf(manifest);

const scaleDisplay: IBearRect = [0.39, 0.1, 0.6, 0.36];
const calendarGrid: IBearRect = [0.2, 0.3, 0.8, 0.9];
const phoneBadge: IBearRect = [0.7, -0.04, 1.02, 0.2];

const backLayer: ReadonlySet<IBearHouseObjectId> = new Set(["door", "calendar", "mirror"]);
const tierOrder = Object.keys(manifest.rooms) as IBearHouseTier[];

export const BearHouse_doorLabel = { gym: "Gym", workout: "Back to workout" } as const;

export function BearHouse_image(name: string): string {
  return `${imageDir}/${name}.webp`;
}

export function BearHouse_room(tier: IBearHouseTier): string {
  return BearHouse_image(manifest.rooms[tier].room);
}

// The colour beside the art on a screen wider than the picture, measured from the picture's top rows.
export function BearHouse_wallColor(tier: IBearHouseTier): string {
  return manifest.rooms[tier].wall;
}

export function BearHouse_gymWallColor(gymImage: string): string {
  const walls: Record<string, string> = manifest.gymWalls;
  const name = gymImage.replace(/^.*\//, "").replace(/\.webp$/, "");
  return walls[name] ?? manifest.rooms.trailer.wall;
}

export const BearHouse_images: readonly string[] = [
  ...Object.keys(images).map(BearHouse_image),
  ...tierOrder.map(BearHouse_room),
];

export function BearHouse_sources(input: IBearHouseSourcesInput): IBearHouseSources {
  return {
    fullness: BearFullness_percent(input.foodLog, input.now),
    weight: BearBoard_latestWeight(input.stats, input.units, input.now),
    dayOfMonth: new Date(input.now).getDate(),
    pendingRequests: input.pendingRequests,
    hasWorkout: input.hasWorkout,
  };
}

export function BearHouse_bowlImage(sources: IBearHouseSources): string {
  const { fullness } = sources;
  if (fullness < 10) {
    return "bowl-empty";
  }
  if (fullness < 40) {
    return "bowl-quarter";
  }
  if (fullness < 65) {
    return "bowl-half";
  }
  return fullness < 90 ? "bowl-three-quarter" : "bowl-full";
}

// The image keeps its own shape inside the slot, standing on the slot's bottom edge.
function fit(rect: number[], image: string): IBearRect {
  const [x1, y1, x2, y2] = rect;
  const [w, h] = images[image];
  const scale = Math.min((x2 - x1) / w, (y2 - y1) / h);
  const width = w * scale;
  const left = x1 + (x2 - x1 - width) / 2;
  return [round(left), round(y2 - h * scale), round(left + width), y2];
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function inside(box: IBearRect, share: IBearRect): IBearRect {
  const [x1, y1, x2, y2] = box;
  const w = x2 - x1;
  const h = y2 - y1;
  return [round(x1 + share[0] * w), round(y1 + share[1] * h), round(x1 + share[2] * w), round(y1 + share[3] * h)];
}

interface IObjectSpec {
  id: IBearHouseObjectId;
  image?: string;
  isPainted?: boolean;
  label: string;
  pill?: string;
  target: IBearHouseTarget;
  overlay?: Omit<IBearHouseOverlay, "rect"> & { share: IBearRect };
}

function specs(sources: IBearHouseSources): IObjectSpec[] {
  return [
    { id: "whiteboard", label: "To-do", target: { kind: "plus" } },
    {
      id: "door",
      isPainted: true,
      label: sources.hasWorkout ? BearHouse_doorLabel.workout : BearHouse_doorLabel.gym,
      pill: sources.hasWorkout ? BearHouse_doorLabel.workout : undefined,
      target: { kind: "door" },
    },
    {
      id: "bowl",
      image: BearHouse_bowlImage(sources),
      label: "Food",
      target: { kind: "screen", screen: "foodDay", tab: "food" },
    },
    { id: "bed", image: "bed", label: "Bed", target: { kind: "bearPanel" } },
    {
      id: "scale",
      image: "scale",
      label: "Scale",
      pill: sources.weight == null ? BearText_houseEmpty.scale : undefined,
      target: { kind: "screen", screen: "stats", tab: "graphs" },
      overlay: sources.weight == null ? undefined : { kind: "number", share: scaleDisplay, text: sources.weight },
    },
    {
      id: "calendar",
      image: "wall-calendar",
      label: "Calendar",
      target: { kind: "screen", screen: "food", tab: "food" },
      overlay: { kind: "number", share: calendarGrid, text: `${sources.dayOfMonth}` },
    },
    {
      id: "phone",
      image: "phone",
      label: "Phone",
      target: { kind: "phone" },
      overlay:
        sources.pendingRequests > 0
          ? { kind: "badge", share: phoneBadge, text: `${sources.pendingRequests}` }
          : undefined,
    },
    {
      id: "mirror",
      image: "mirror",
      label: "Mirror",
      target: { kind: "screen", screen: "progressPhotos", tab: "graphs" },
    },
  ];
}

// Every object is there from day 0. seen holds the objects the user has already met; undefined means the
// flags are not kept yet. A room without a slot for an object leaves that object out.
export function BearHouse_objects(
  houseTier: IBearHouseTier,
  sources: IBearHouseSources,
  seen: ReadonlySet<IBearHouseObjectId> | undefined,
  source: IBearHouseManifest = manifest
): IBearHouseObject[] {
  const slots: Record<string, IManifestSlot> = source.rooms[houseTier].objects;
  const present = specs(sources).filter((spec) => spec.id === "whiteboard" || slots[spec.id] != null);
  return present.map((spec) => {
    const isNew = seen != null && spec.id !== "whiteboard" && !seen.has(spec.id);
    const slot: IManifestSlot = spec.id === "whiteboard" ? { rect: source.whiteboard, pill: [0, 0] } : slots[spec.id];
    const rect: IBearRect =
      spec.image == null ? [slot.rect[0], slot.rect[1], slot.rect[2], slot.rect[3]] : fit(slot.rect, spec.image);
    return {
      id: spec.id,
      image: spec.image == null ? undefined : BearHouse_image(spec.image),
      isPainted: spec.isPainted === true,
      label: spec.label,
      pill: isNew ? "New" : spec.pill,
      target: spec.target,
      rect,
      pillAt: { x: slot.pill[0], y: slot.pill[1] },
      layer: backLayer.has(spec.id) ? "back" : "front",
      isNew,
      overlay:
        spec.overlay == null
          ? undefined
          : { kind: spec.overlay.kind, text: spec.overlay.text, rect: inside(rect, spec.overlay.share) },
    };
  });
}

export function BearHouse_gymExit(gymImage: string): IBearHouseObject {
  const image = /spaceship|moon|mars/.test(gymImage) ? "door-exit-space" : "door-exit-gym";
  return {
    id: "door",
    image: BearHouse_image(image),
    isPainted: false,
    label: "Exit",
    pill: "Exit",
    target: { kind: "door" },
    rect: fit(manifest.gymExit.rect, image),
    pillAt: { x: manifest.gymExit.pill[0], y: manifest.gymExit.pill[1] },
    layer: "front",
    isNew: false,
  };
}

export function BearHouse_box(rect: IBearRect, unit: number): IBearBox {
  return {
    left: round(rect[0] * unit),
    top: round(rect[1] * unit),
    width: round((rect[2] - rect[0]) * unit),
    height: round((rect[3] - rect[1]) * unit),
  };
}

// Apple's minimum touch target is 44 pt. Small objects keep their drawn size and grow only their hit area.
export function BearHouse_hitSlop(
  box: IBearBox,
  minSize: number = 44
): { top: number; bottom: number; left: number; right: number } {
  const x = Math.max(0, (minSize - box.width) / 2);
  const y = Math.max(0, (minSize - box.height) / 2);
  return { top: y, bottom: y, left: x, right: x };
}

// The pill is sized from its text, so it can be centred before it renders. 0.58 em per letter is an estimate
// for the semibold system font, not a measurement.
export function BearHouse_pillWidth(text: string, fontSize: number): number {
  return Math.ceil(text.length * fontSize * 0.58 + fontSize * 1.6);
}

// A pill is centred under its object and pushed back inside the scene at the edges.
export function BearHouse_pillLeft(centerX: number, width: number, sceneWidth: number, margin: number = 4): number {
  const left = centerX - width / 2;
  return round(Math.max(margin, Math.min(sceneWidth - width - margin, left)));
}
