import { FoodLog_dayKey, FoodLog_shiftDay } from "./foodLog";

export interface ICalendarCell {
  day: string;
  dayNumber: number;
  isInMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isFuture: boolean;
  hasWorkout: boolean;
}

export interface IMonthCalendar {
  month: string;
  title: string;
  weeks: ICalendarCell[][];
}

export interface IMonthCalendarInput {
  month: string;
  today: string;
  selected: string;
  workoutDays: Set<string>;
}

export const MonthCalendar_weekdayLabels = ["M", "T", "W", "T", "F", "S", "S"];

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseMonth(month: string): { year: number; monthIndex: number } {
  const [year, monthNumber] = month.split("-").map(Number);
  return { year, monthIndex: monthNumber - 1 };
}

function monthKey(year: number, monthIndex: number): string {
  return `${year}-${`${monthIndex + 1}`.padStart(2, "0")}`;
}

export function MonthCalendar_monthOf(day: string): string {
  return day.slice(0, 7);
}

export function MonthCalendar_shift(month: string, delta: number): string {
  const { year, monthIndex } = parseMonth(month);
  const date = new Date(year, monthIndex + delta, 1);
  return monthKey(date.getFullYear(), date.getMonth());
}

export function MonthCalendar_title(month: string): string {
  const { year, monthIndex } = parseMonth(month);
  return `${monthNames[monthIndex]} ${year}`;
}

export function MonthCalendar_dayTitle(day: string): string {
  const [, monthNumber, date] = day.split("-").map(Number);
  return `${monthNames[monthNumber - 1]} ${date}`;
}

export function MonthCalendar_workoutDays(history: { startTime: number }[]): Set<string> {
  return new Set(history.map((r) => FoodLog_dayKey(new Date(r.startTime))));
}

export function MonthCalendar_build(input: IMonthCalendarInput): IMonthCalendar {
  const { month, today, selected, workoutDays } = input;
  const { year, monthIndex } = parseMonth(month);
  const first = new Date(year, monthIndex, 1, 12);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = FoodLog_shiftDay(FoodLog_dayKey(first), -mondayOffset);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const weekCount = Math.ceil((mondayOffset + daysInMonth) / 7);
  const weeks: ICalendarCell[][] = [];
  for (let w = 0; w < weekCount; w += 1) {
    const week: ICalendarCell[] = [];
    for (let d = 0; d < 7; d += 1) {
      const day = FoodLog_shiftDay(start, w * 7 + d);
      week.push({
        day,
        dayNumber: Number(day.slice(8, 10)),
        isInMonth: MonthCalendar_monthOf(day) === month,
        isToday: day === today,
        isSelected: day === selected,
        isFuture: day > today,
        hasWorkout: workoutDays.has(day),
      });
    }
    weeks.push(week);
  }
  return { month, title: MonthCalendar_title(month), weeks };
}

export function MonthCalendar_visibleWeeks(calendar: IMonthCalendar, isCollapsed: boolean): ICalendarCell[][] {
  if (!isCollapsed) {
    return calendar.weeks;
  }
  const week =
    calendar.weeks.find((w) => w.some((c) => c.isSelected)) ??
    calendar.weeks.find((w) => w.some((c) => c.isToday)) ??
    calendar.weeks[0];
  return week != null ? [week] : [];
}
