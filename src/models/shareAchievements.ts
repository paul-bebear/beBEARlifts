import { ISettings } from "../types";
import { History_totalRecordWeight } from "./history";
import { Weight_convertTo } from "./weight";
import { BearBadges_compute, IBearBadge, IBearBadgeSources } from "./bearBadges";

export interface IShareAchievementSources extends IBearBadgeSources {
  settings: ISettings;
}

export interface IShareAchievements {
  lifetimeKg: Map<number, { beforeKg: number; afterKg: number }>;
  badges: IBearBadge[];
}

// Same order as History_getPersonalRecords, so a rank and a PR on one card agree about "before".
export function ShareAchievements_build(sources: IShareAchievementSources): IShareAchievements {
  const records = [...sources.history].sort((a, b) => (a.endTime ?? a.startTime) - (b.endTime ?? b.startTime));
  const lifetimeKg = new Map<number, { beforeKg: number; afterKg: number }>();
  let totalKg = 0;
  for (const record of records) {
    const beforeKg = totalKg;
    totalKg += Weight_convertTo(History_totalRecordWeight(record, sources.settings), "kg").value;
    lifetimeKg.set(record.id, { beforeKg, afterKg: totalKg });
  }
  return { lifetimeKg, badges: BearBadges_compute(sources) };
}
