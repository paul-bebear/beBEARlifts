import type { IFoodSex } from "./foodTargets";

export interface IBodyFatRange {
  min: number;
  max: number;
  step: number;
  initial: number;
}

export interface IBodyFatBand {
  label: string;
  detail: string;
}

export interface IBodyFatFigure {
  shoulder: number;
  chest: number;
  waist: number;
  hip: number;
  thigh: number;
}

export interface IBodyFatNavyInput {
  sex: IFoodSex;
  heightCm: number;
  waistCm: number;
  neckCm: number;
  hipCm?: number;
}

const ranges: Record<IFoodSex | "unknown", IBodyFatRange> = {
  male: { min: 5, max: 40, step: 1, initial: 18 },
  female: { min: 10, max: 45, step: 1, initial: 26 },
  unknown: { min: 5, max: 45, step: 1, initial: 22 },
};

const bands: { upTo: number; label: string; detail: string }[] = [
  { upTo: 8, label: "Very lean", detail: "Veins and deep lines between the abs" },
  { upTo: 13, label: "Lean", detail: "Abs show without flexing" },
  { upTo: 18, label: "Fit", detail: "An outline of the abs, flat stomach" },
  { upTo: 24, label: "Average", detail: "Soft stomach, no ab outline" },
  { upTo: 30, label: "Above average", detail: "Fat around the belly and hips" },
  { upTo: Infinity, label: "High", detail: "Round stomach, fat on the arms and legs" },
];

// Women carry about 8 points more essential fat, so the same look sits 8 points higher.
const femaleBandShift = 8;

const halfWidthsIn100By200Box: Record<IFoodSex | "unknown", { lean: IBodyFatFigure; high: IBodyFatFigure }> = {
  male: {
    lean: { shoulder: 27, chest: 23, waist: 14, hip: 17, thigh: 9 },
    high: { shoulder: 29, chest: 28, waist: 29, hip: 25, thigh: 13 },
  },
  female: {
    lean: { shoulder: 22, chest: 20, waist: 13, hip: 21, thigh: 10 },
    high: { shoulder: 25, chest: 26, waist: 26, hip: 31, thigh: 15 },
  },
  unknown: {
    lean: { shoulder: 25, chest: 22, waist: 14, hip: 19, thigh: 10 },
    high: { shoulder: 27, chest: 27, waist: 28, hip: 28, thigh: 14 },
  },
};

export function BodyFat_range(sex: IFoodSex | undefined): IBodyFatRange {
  return ranges[sex ?? "unknown"];
}

export function BodyFat_clamp(sex: IFoodSex | undefined, pct: number): number {
  const range = BodyFat_range(sex);
  return Math.min(range.max, Math.max(range.min, Math.round(pct)));
}

export function BodyFat_band(sex: IFoodSex | undefined, pct: number): IBodyFatBand {
  const shifted = sex === "female" ? pct - femaleBandShift : pct;
  const band = bands.find((b) => shifted <= b.upTo) ?? bands[bands.length - 1];
  return { label: band.label, detail: band.detail };
}

export function BodyFat_figure(sex: IFoodSex | undefined, pct: number): IBodyFatFigure {
  const range = BodyFat_range(sex);
  const { lean, high } = halfWidthsIn100By200Box[sex ?? "unknown"];
  const t = Math.min(1, Math.max(0, (pct - range.min) / (range.max - range.min)));
  const mix = (a: number, b: number): number => Math.round((a + (b - a) * t) * 10) / 10;
  return {
    shoulder: mix(lean.shoulder, high.shoulder),
    chest: mix(lean.chest, high.chest),
    waist: mix(lean.waist, high.waist),
    hip: mix(lean.hip, high.hip),
    thigh: mix(lean.thigh, high.thigh),
  };
}

export function BodyFat_figurePath(f: IBodyFatFigure): string {
  const l = (half: number): number => Math.round((50 - half) * 10) / 10;
  const r = (half: number): number => Math.round((50 + half) * 10) / 10;
  return [
    `M ${l(6)} 38`,
    `L ${l(f.shoulder)} 48`,
    `Q ${l(f.chest + 2)} 62 ${l(f.chest)} 76`,
    `Q ${l(f.waist)} 92 ${l(f.waist)} 104`,
    `Q ${l(f.hip)} 116 ${l(f.hip)} 130`,
    `L ${l(f.thigh + 4)} 196`,
    `L ${l(2)} 196`,
    `L 50 140`,
    `L ${r(2)} 196`,
    `L ${r(f.thigh + 4)} 196`,
    `L ${r(f.hip)} 130`,
    `Q ${r(f.hip)} 116 ${r(f.waist)} 104`,
    `Q ${r(f.waist)} 92 ${r(f.chest)} 76`,
    `Q ${r(f.chest + 2)} 62 ${r(f.shoulder)} 48`,
    `L ${r(6)} 38`,
    "Z",
  ].join(" ");
}

// US Navy circumference method (Hodgdon and Beckett, 1984), metric form.
export function BodyFat_navy(input: IBodyFatNavyInput): number | undefined {
  const { sex, heightCm, waistCm, neckCm, hipCm } = input;
  if (!(heightCm > 0 && waistCm > 0 && neckCm > 0)) {
    return undefined;
  }
  let pct: number;
  if (sex === "male") {
    if (waistCm <= neckCm) {
      return undefined;
    }
    pct = 495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) - 450;
  } else {
    if (hipCm == null || !(hipCm > 0) || waistCm + hipCm <= neckCm) {
      return undefined;
    }
    pct = 495 / (1.29579 - 0.35004 * Math.log10(waistCm + hipCm - neckCm) + 0.221 * Math.log10(heightCm)) - 450;
  }
  if (!isFinite(pct) || pct < 2 || pct > 60) {
    return undefined;
  }
  return Math.round(pct * 10) / 10;
}
