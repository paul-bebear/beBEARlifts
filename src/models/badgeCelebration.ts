import { IBearBadge } from "./bearBadges";
import { IBearStoreData } from "./bearStoreData";
import { BearCelebration_reachedLevel } from "./bearCelebration";

export interface IBadgeCelebrationStep {
  store: IBearStoreData;
  badge?: IBearBadge;
}

function withSeen(store: IBearStoreData, ids: string[]): IBearStoreData {
  return { ...store, seenBadges: Array.from(new Set([...store.seenBadges, ...ids])) };
}

// A level-up card is due while the bear's level is above celebratedLevel. The card shows on the finish screen.
export function BadgeCelebration_isLevelUpDue(store: IBearStoreData, countedKg: number): boolean {
  return store.seeded === true && BearCelebration_reachedLevel(countedKg) > store.celebratedLevel;
}

export function BadgeCelebration_step(
  badges: IBearBadge[],
  store: IBearStoreData,
  countedKg: number
): IBadgeCelebrationStep {
  if (BadgeCelebration_isLevelUpDue(store, countedKg)) {
    return { store };
  }
  return BadgeCelebration_next(badges, store);
}

// The first run marks every badge the user already has as seen, so years of history do not replay as sheets.
// After that it returns the oldest unseen badge and records its id, so the sheet never shows twice.
export function BadgeCelebration_next(badges: IBearBadge[], store: IBearStoreData): IBadgeCelebrationStep {
  if (!store.badgesSeeded) {
    return {
      store: {
        ...withSeen(
          store,
          badges.map((b) => b.id)
        ),
        badgesSeeded: true,
      },
    };
  }
  const badge = badges.find((b) => !store.seenBadges.includes(b.id));
  if (badge == null) {
    return { store };
  }
  return { store: withSeen(store, [badge.id]), badge };
}
