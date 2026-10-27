import manifest from "../../images/bear/house/manifest.json";
import { IStats, IUnit } from "../types";
import { BearBoard_latestWeight } from "./bearBoard";
import { IBearCountedWorkout } from "./bearGrowth";
import { BearScene_boardInkBottom, BearScene_dashboardRect, IBearBox, IBearRect, IBearSceneArt } from "./bearScene";
import { BearText_houseEmpty, BearText_lockLine } from "./bearText";
import { DailyChecklist_doneDays, DailyChecklist_goalTarget, DailyChecklist_streak } from "./dailyChecklist";
import { FoodLog_dayKey, FoodLog_dayTotals, IFoodLog } from "./foodLog";
import { INotesLog, Notes_forDay, Notes_isBlank } from "./notes";
import type { ITab } from "./screen";

export type IBearHouseTier = keyof typeof manifest.rooms;

export type IBearHouseObjectId =
  | "whiteboard"
  | "door"
  | "bowl"
  | "bed"
  | "notebook"
  | "tv"
  | "passport"
  | "scale"
  | "calendar"
  | "boombox"
  | "phone"
  | "honey"
  | "shelf"
  | "wardrobe"
  | "mirror";

export type IBearHouseScreen = "friends" | "stats" | "music" | "streak" | "progressPhotos";

export type IBearHouseTarget =
  | { kind: "plus" }
  | { kind: "door" }
  | { kind: "bearPanel" }
  | { kind: "journal" }
  | { kind: "monthCalendar" }
  | { kind: "screen"; screen: IBearHouseScreen; tab?: ITab }
  | { kind: "addFriend" }
  | { kind: "honey" }
  | { kind: "phone" }
  | { kind: "line"; text: string };

export type IBearHouseOpenTarget = Exclude<IBearHouseTarget, { kind: "line" }>;

export interface IBearHouseOverlay {
  kind: "tv" | "number" | "badge";
  rect: IBearRect;
  text?: string;
}

export interface IBearHouseLock {
  atDays: number;
  toGo: number;
}

export interface IBearHouseObject {
  id: IBearHouseObjectId;
  image?: string;
  label: string;
  pill?: string;
  target: IBearHouseTarget;
  rect: IBearRect;
  pillAt: { x: number; y: number };
  layer: "back" | "front";
  lock?: IBearHouseLock;
  isNew: boolean;
  overlay?: IBearHouseOverlay;
}

export interface IBearHouseSources {
  kcal: number;
  kcalTarget: number;
  hasNoteToday: boolean;
  weight?: string;
  streak: number;
  friendCount: number;
  pendingRequests: number;
  honeyEarned: number;
  badgeCount: number;
  isOffline: boolean;
}

export interface IBearHouseSourcesInput {
  workouts: readonly IBearCountedWorkout[];
  foodLog: IFoodLog;
  stats: IStats;
  notes: INotesLog;
  units: IUnit;
  friendCount: number;
  pendingRequests: number;
  honeyEarned: number;
  badgeCount: number;
  isOffline: boolean;
  now: number;
}

type IManifestSlot = { rect: number[]; pill: number[] };

export interface IBearHouseManifest {
  canvas: number[];
  whiteboard: number[];
  bearFoot: number[];
  gymExit: IManifestSlot;
  images: Record<string, number[]>;
  rooms: Record<string, { room: string; door: string; wall: string; objects: Record<string, IManifestSlot> }>;
  gymWalls: Record<string, string>;
}

const images: Record<string, number[]> = manifest.images;
const imageDir = "/images/bear/house";

// The house is the bear's own floor. Its feet stand further back than in the gym, so the cub reads smaller.
// The room paints the whiteboard where the gym does, so the ink ends the same rows below the board's top edge.
export function BearHouse_artOf(source: IBearHouseManifest): IBearSceneArt {
  return {
    canvas: { width: source.canvas[0], height: source.canvas[1] },
    foot: { x: source.bearFoot[0], y: source.bearFoot[1] },
    minHeightShare: 0.26,
    board: [source.whiteboard[0], source.whiteboard[1], source.whiteboard[2], source.whiteboard[3]],
    inkBottom: source.whiteboard[1] + BearScene_boardInkBottom - BearScene_dashboardRect[1],
  };
}

export const BearHouse_art: IBearSceneArt = BearHouse_artOf(manifest);

// Screen area of each TV sprite as a share of the trimmed image, measured on the art in handoff 07.
const tvScreens: Record<string, IBearRect> = {
  "tv-crt": [0.13, 0.34, 0.7, 0.8],
  "tv-flat-small": [0.06, 0.03, 0.94, 0.55],
  "tv-flat-big": [0.03, 0.04, 0.97, 0.94],
  "tv-hologram": [0.06, 0.08, 0.94, 0.9],
};
const scaleDisplay: IBearRect = [0.36, 0.04, 0.64, 0.17];
const calendarGrid: IBearRect = [0.2, 0.3, 0.8, 0.9];
const phoneBadge: IBearRect = [0.7, -0.04, 1.02, 0.2];

const arrivals: Partial<Record<IBearHouseObjectId, number>> = {
  calendar: 3,
  boombox: 7,
  honey: 14,
  shelf: 30,
  wardrobe: 30,
  mirror: 100,
};

const backLayer: ReadonlySet<IBearHouseObjectId> = new Set(["door", "calendar", "shelf", "wardrobe", "mirror", "bed"]);
const tierOrder = Object.keys(manifest.rooms) as IBearHouseTier[];

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

// An active day is a day with a counted workout, a food entry or a weigh-in.
export function BearHouse_activeDays(input: {
  workouts: readonly IBearCountedWorkout[];
  foodLog: { entries: readonly { day: string }[] };
  stats: IStats;
}): number {
  const days = new Set<string>();
  for (const { record } of input.workouts) {
    days.add(FoodLog_dayKey(new Date(record.endTime ?? record.startTime)));
  }
  for (const entry of input.foodLog.entries) {
    days.add(entry.day);
  }
  for (const entry of input.stats.weight.weight ?? []) {
    days.add(FoodLog_dayKey(new Date(entry.timestamp)));
  }
  return days.size;
}

export function BearHouse_sources(input: IBearHouseSourcesInput): IBearHouseSources {
  const today = FoodLog_dayKey(new Date(input.now));
  const doneDays = DailyChecklist_doneDays({ workouts: input.workouts, foodLog: input.foodLog });
  return {
    kcal: FoodLog_dayTotals(input.foodLog, today).calories,
    kcalTarget: DailyChecklist_goalTarget(input.foodLog.goals.calories),
    hasNoteToday: Notes_forDay(input.notes, today).some((note) => !Notes_isBlank(note)),
    weight: BearBoard_latestWeight(input.stats, input.units, input.now),
    streak: DailyChecklist_streak(doneDays, today),
    friendCount: input.friendCount,
    pendingRequests: input.pendingRequests,
    honeyEarned: input.honeyEarned,
    badgeCount: input.badgeCount,
    isOffline: input.isOffline,
  };
}

function tierIndex(tier: IBearHouseTier): number {
  return tierOrder.indexOf(tier);
}

function bowlImage(sources: IBearHouseSources): string {
  const share = sources.kcalTarget > 0 ? sources.kcal / sources.kcalTarget : sources.kcal > 0 ? 1 : 0;
  return share < 0.25 ? "bowl-empty" : share <= 0.75 ? "bowl-half" : "bowl-full";
}

function tvImage(tier: IBearHouseTier): string {
  const index = tierIndex(tier);
  return index <= 1 ? "tv-crt" : index === 2 ? "tv-flat-small" : index === 3 ? "tv-flat-big" : "tv-hologram";
}

function honeyImage(earned: number): string {
  return earned <= 0 ? "honey-jar-empty" : earned < 50 ? "honey-jar-half" : "honey-jar-full";
}

function shelfImage(badges: number): string {
  return badges <= 0 ? "trophy-shelf-empty" : badges <= 9 ? "trophy-shelf-some" : "trophy-shelf-full";
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
  label: string;
  pill?: string;
  target: IBearHouseTarget;
  overlay?: Omit<IBearHouseOverlay, "rect"> & { share: IBearRect };
}

function specs(tier: IBearHouseTier, sources: IBearHouseSources): IObjectSpec[] {
  const tv = tvImage(tier);
  const hasFriends = sources.friendCount > 0;
  const list: IObjectSpec[] = [
    { id: "whiteboard", label: "To-do", target: { kind: "plus" } },
    { id: "door", image: manifest.rooms[tier].door, label: "Gym", target: { kind: "door" } },
    { id: "bowl", image: bowlImage(sources), label: "Food", target: { kind: "journal" } },
    {
      id: "bed",
      image: tierIndex(tier) <= 2 ? "bed-small" : "bed-big",
      label: "Bed",
      target: { kind: "bearPanel" },
    },
    {
      id: "notebook",
      image: sources.hasNoteToday ? "notebook-open" : "notebook-closed",
      label: "Journal",
      target: { kind: "journal" },
    },
    {
      id: "tv",
      image: tv,
      label: "TV",
      pill: hasFriends ? undefined : BearText_houseEmpty.tv,
      target: hasFriends ? { kind: "screen", screen: "friends", tab: "friends" } : { kind: "addFriend" },
      overlay: { kind: "tv", share: tvScreens[tv] },
    },
    {
      id: "passport",
      image: "passport-closed",
      label: "Passport",
      pill: BearText_houseEmpty.passport,
      target: { kind: "line", text: BearText_houseEmpty.passportSoon },
    },
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
      target: { kind: "monthCalendar" },
      overlay: sources.streak > 0 ? { kind: "number", share: calendarGrid, text: `${sources.streak}` } : undefined,
    },
    {
      id: "phone",
      image: "phone-dock",
      label: "Phone",
      target: { kind: "phone" },
      overlay:
        sources.pendingRequests > 0
          ? { kind: "badge", share: phoneBadge, text: `${sources.pendingRequests}` }
          : undefined,
    },
    { id: "boombox", image: "boombox", label: "Music", target: { kind: "screen", screen: "music" } },
    { id: "honey", image: honeyImage(sources.honeyEarned), label: "Honey", target: { kind: "honey" } },
    {
      id: "shelf",
      image: shelfImage(sources.badgeCount),
      label: "Trophies",
      target: { kind: "screen", screen: "streak" },
    },
    { id: "wardrobe", image: "wardrobe-closed", label: "Wardrobe", target: { kind: "honey" } },
    { id: "mirror", image: "mirror", label: "Mirror", target: { kind: "screen", screen: "progressPhotos" } },
  ];
  return list.filter((spec) => spec.id !== "boombox" || sources.isOffline);
}

// Every object is drawn from day 0. One whose arrival day is above activeDays wears the padlock and has no pill.
// seen holds the open objects the user has already met; undefined means the unlock flags are not kept yet.
export function BearHouse_objects(
  houseTier: IBearHouseTier,
  activeDays: number,
  sources: IBearHouseSources,
  seen: ReadonlySet<IBearHouseObjectId> | undefined,
  source: IBearHouseManifest = manifest
): IBearHouseObject[] {
  const slots: Record<string, IManifestSlot> = source.rooms[houseTier].objects;
  return specs(houseTier, sources).map((spec) => {
    const atDays = arrivals[spec.id] ?? 0;
    const lock = atDays > activeDays ? { atDays, toGo: atDays - activeDays } : undefined;
    const isNew = seen != null && lock == null && !seen.has(spec.id);
    const slot: IManifestSlot = spec.id === "whiteboard" ? { rect: source.whiteboard, pill: [0, 0] } : slots[spec.id];
    const rect: IBearRect =
      spec.image == null ? [slot.rect[0], slot.rect[1], slot.rect[2], slot.rect[3]] : fit(slot.rect, spec.image);
    return {
      id: spec.id,
      image: spec.image == null ? undefined : BearHouse_image(spec.image),
      label: spec.label,
      pill: isNew ? "New" : spec.pill,
      target: spec.target,
      rect,
      pillAt: { x: slot.pill[0], y: slot.pill[1] },
      layer: backLayer.has(spec.id) ? "back" : "front",
      lock,
      isNew,
      overlay:
        spec.overlay == null || lock != null
          ? undefined
          : { kind: spec.overlay.kind, text: spec.overlay.text, rect: inside(rect, spec.overlay.share) },
    };
  });
}

export function BearHouse_lockLine(lock: IBearHouseLock): string {
  return BearText_lockLine(lock.atDays, lock.toGo);
}

// A padlocked object and the passport answer with a line under them. Every other tap opens its target.
export function BearHouse_tap(
  object: IBearHouseObject
): { kind: "note"; text: string } | { kind: "open"; target: IBearHouseOpenTarget } {
  if (object.lock != null) {
    return { kind: "note", text: BearHouse_lockLine(object.lock) };
  }
  if (object.target.kind === "line") {
    return { kind: "note", text: object.target.text };
  }
  return { kind: "open", target: object.target };
}

export function BearHouse_gymExit(gymImage: string): IBearHouseObject {
  const image = /spaceship|moon|mars/.test(gymImage) ? "door-exit-space" : "door-exit-gym";
  return {
    id: "door",
    image: BearHouse_image(image),
    label: "Exit",
    pill: "Exit",
    target: { kind: "door" },
    rect: fit(manifest.gymExit.rect, image),
    pillAt: { x: manifest.gymExit.pill[0], y: manifest.gymExit.pill[1] },
    layer: "front",
    isNew: false,
  };
}

export function BearHouse_padlock(rect: IBearRect): IBearRect {
  const [x1, y1, x2, y2] = rect;
  const [w, h] = images.padlock;
  const height = Math.max(56, Math.min(96, Math.min(x2 - x1, y2 - y1) * 0.7));
  const width = (height * w) / h;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  return [round(cx - width / 2), round(cy - height / 2), round(cx + width / 2), round(cy + height / 2)];
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

// A pill or the lock line is centred under its object and pushed back inside the scene at the edges.
export function BearHouse_pillLeft(centerX: number, width: number, sceneWidth: number, margin: number = 4): number {
  const left = centerX - width / 2;
  return round(Math.max(margin, Math.min(sceneWidth - width - margin, left)));
}
