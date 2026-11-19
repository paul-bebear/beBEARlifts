export const DayNames_monthsLong = [
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

export const DayNames_monthsShort = DayNames_monthsLong.map((name) => name.slice(0, 3));

export const DayNames_weekdaysLong = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const DayNames_weekdaysShort = DayNames_weekdaysLong.map((name) => name.slice(0, 3));

export const DayNames_weekdayLetters = DayNames_weekdaysLong.map((name) => name.slice(0, 1));

export function DayNames_mondayFirst<T>(sundayFirst: T[]): T[] {
  return [...sundayFirst.slice(1), sundayFirst[0]];
}

export function DayNames_monthDay(date: Date): string {
  return `${DayNames_monthsShort[date.getMonth()]} ${date.getDate()}`;
}

export function DayNames_dayMonth(date: Date): string {
  return `${date.getDate()} ${DayNames_monthsShort[date.getMonth()]}`;
}

export function DayNames_monthDayYear(date: Date): string {
  return `${DayNames_monthDay(date)}, ${date.getFullYear()}`;
}

export function DayNames_monthDayYearIfOtherYear(timestamp: number, now: number): string {
  const date = new Date(timestamp);
  return date.getFullYear() === new Date(now).getFullYear() ? DayNames_monthDay(date) : DayNames_monthDayYear(date);
}
