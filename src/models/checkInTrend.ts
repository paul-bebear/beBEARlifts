import { FoodLog_shiftDay } from "./foodLog";
import { ICheckInField, INotesLog, Notes_checkIns, Notes_checkInScales } from "./notes";

export interface ICheckInTrendLine {
  field: ICheckInField;
  label: string;
  values: (number | undefined)[];
  average?: number;
}

export interface ICheckInTrend {
  days: string[];
  lines: ICheckInTrendLine[];
  workoutDays: boolean[];
  checkInCount: number;
}

export interface ICheckInTrendInput {
  notes: INotesLog;
  today: string;
  length: number;
  workoutDays: Set<string>;
}

export interface IChartPoint {
  x: number;
  y: number;
}

export const CheckInTrend_shortDays = 30;
export const CheckInTrend_longDays = 90;

function averageOf(values: (number | undefined)[]): number | undefined {
  const known = values.filter((v): v is number => v != null);
  return known.length === 0 ? undefined : Math.round((known.reduce((a, b) => a + b, 0) / known.length) * 10) / 10;
}

export function CheckInTrend_build(input: ICheckInTrendInput): ICheckInTrend {
  const days: string[] = [];
  for (let i = input.length - 1; i >= 0; i -= 1) {
    days.push(FoodLog_shiftDay(input.today, -i));
  }
  const byDay = new Map(Notes_checkIns(input.notes).map((n) => [n.day, n]));
  const lines = Notes_checkInScales.map(({ field, label }) => {
    const values = days.map((d) => byDay.get(d)?.[field]);
    return { field, label, values, average: averageOf(values) };
  });
  return {
    days,
    lines,
    workoutDays: days.map((d) => input.workoutDays.has(d)),
    checkInCount: days.filter((d) => byDay.has(d)).length,
  };
}

// A day without a score breaks the line, so a gap in check-ins never draws as a straight trend.
export function CheckInTrend_segments(values: (number | undefined)[], width: number, height: number): IChartPoint[][] {
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const segments: IChartPoint[][] = [];
  let current: IChartPoint[] = [];
  values.forEach((value, i) => {
    if (value == null) {
      if (current.length > 0) {
        segments.push(current);
      }
      current = [];
      return;
    }
    current.push({ x: Math.round(i * step * 10) / 10, y: Math.round((height - ((value - 1) / 4) * height) * 10) / 10 });
  });
  if (current.length > 0) {
    segments.push(current);
  }
  return segments;
}

export function CheckInTrend_summary(trend: ICheckInTrend): string {
  if (trend.checkInCount === 0) {
    return "No check-ins yet. Rate your day in the Journal.";
  }
  const days = trend.checkInCount === 1 ? "1 check-in" : `${trend.checkInCount} check-ins`;
  return `${days} in the last ${trend.days.length} days`;
}
