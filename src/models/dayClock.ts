import { FoodLog_dayKey } from "./foodLog";

export interface IDayClock {
  dayKey: string;
  tick: number;
}

// The timer waits one second past midnight, so a timer the OS delivers a little late still reads the new day.
const afterMidnightMs = 1000;

export function DayClock_start(now: number): IDayClock {
  return { dayKey: FoodLog_dayKey(new Date(now)), tick: 0 };
}

export function DayClock_refresh(clock: IDayClock, now: number): IDayClock {
  return { dayKey: FoodLog_dayKey(new Date(now)), tick: clock.tick + 1 };
}

export function DayClock_msToMidnight(now: number): number {
  const date = new Date(now);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime() - now;
}

export function DayClock_timerDelay(now: number): number {
  return DayClock_msToMidnight(now) + afterMidnightMs;
}

export function DayClock_refreshesOnFocus(wasFocused: boolean, isFocused: boolean): boolean {
  return isFocused && !wasFocused;
}
