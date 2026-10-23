export type ISeason = "bulk" | "lean" | "summer";

export const Season_all: ISeason[] = ["bulk", "lean", "summer"];

export const Season_names: Record<ISeason, string> = { bulk: "Bulk", lean: "Lean", summer: "Summer" };

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

const monthLengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const northernLastMonth: Record<ISeason, number> = { bulk: 2, lean: 5, summer: 8 };

const southShift = 6;

function northernMonth(date: Date, south: boolean): number {
  return (date.getMonth() + (south ? southShift : 0)) % 12;
}

export function Season_for(date: Date, south: boolean): ISeason {
  const month = northernMonth(date, south);
  if (month >= 9 || month <= 2) {
    return "bulk";
  }
  return month <= 5 ? "lean" : "summer";
}

export function Season_lastDay(season: ISeason, south: boolean): string {
  const month = (northernLastMonth[season] + (south ? southShift : 0)) % 12;
  return `${monthNames[month]} ${monthLengths[month]}`;
}

export function Season_summary(south: boolean): string {
  return south
    ? "Bulk from April to September, lean out from October to December, and maintain from January to March."
    : "Bulk from October to March, lean out from April to June, and maintain from July to September.";
}

export function Season_parse(raw: unknown): ISeason | undefined {
  return Season_all.includes(raw as ISeason) ? (raw as ISeason) : undefined;
}
