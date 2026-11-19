import "mocha";
import { expect } from "chai";
import {
  DayClock_msToMidnight,
  DayClock_refresh,
  DayClock_refreshesOnFocus,
  DayClock_start,
  DayClock_timerDelay,
  IDayClock,
} from "../src/models/dayClock";

const evening = new Date(2026, 10, 18, 22).getTime();
const morning = new Date(2026, 10, 19, 7).getTime();
const hourMs = 3600000;

function runNights(start: number, nights: number): { dayKeys: string[]; gapsHours: number[] } {
  let now = start;
  let clock: IDayClock = DayClock_start(now);
  const dayKeys = [clock.dayKey];
  const gapsHours: number[] = [];
  let lastFire: number | undefined;
  for (let night = 0; night < nights; night += 1) {
    now += DayClock_timerDelay(now);
    clock = DayClock_refresh(clock, now);
    dayKeys.push(clock.dayKey);
    if (lastFire != null) {
      gapsHours.push((now - lastFire) / hourMs);
    }
    lastFire = now;
  }
  return { dayKeys, gapsHours };
}

describe("DayClock", () => {
  it("starts on the local day with tick 0", () => {
    expect(DayClock_start(evening)).to.deep.equal({ dayKey: "2026-11-18", tick: 0 });
  });

  it("counts every refresh so the bear mood recomputes within the same day", () => {
    const later = new Date(2026, 10, 18, 23).getTime();
    expect(DayClock_refresh(DayClock_start(evening), later)).to.deep.equal({ dayKey: "2026-11-18", tick: 1 });
  });

  it("moves to the new day on a refresh after midnight", () => {
    const next = DayClock_refresh(DayClock_start(evening), morning);
    expect(next).to.deep.equal({ dayKey: "2026-11-19", tick: 1 });
  });

  it("gives the milliseconds to the next local midnight", () => {
    expect(DayClock_msToMidnight(evening)).to.equal(2 * hourMs);
    expect(DayClock_msToMidnight(new Date(2026, 10, 18, 0, 0, 0).getTime())).to.equal(24 * hourMs);
  });

  it("schedules the next midnight again after each midnight, three nights in a row", () => {
    const { dayKeys } = runNights(evening, 3);
    expect(dayKeys).to.deep.equal(["2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21"]);
    expect(DayClock_timerDelay(new Date(2026, 10, 19, 0, 0, 1).getTime())).to.equal(24 * hourMs);
  });

  it("waits for midnight again when the timer runs a few milliseconds early", () => {
    const justBefore = new Date(2026, 10, 19).getTime() - 5;
    expect(DayClock_refresh(DayClock_start(evening), justBefore).dayKey).to.equal("2026-11-18");
    expect(DayClock_timerDelay(justBefore)).to.equal(1005);
  });

  it("refreshes when the screen gains focus, not on mount or on blur", () => {
    expect(DayClock_refreshesOnFocus(true, true)).to.equal(false);
    expect(DayClock_refreshesOnFocus(false, false)).to.equal(false);
    expect(DayClock_refreshesOnFocus(true, false)).to.equal(false);
    expect(DayClock_refreshesOnFocus(false, true)).to.equal(true);
  });

  describe("across a daylight saving change", () => {
    const savedTz = process.env.TZ;
    before(() => {
      process.env.TZ = "America/New_York";
    });
    after(() => {
      if (savedTz == null) {
        delete process.env.TZ;
      } else {
        process.env.TZ = savedTz;
      }
    });

    it("lands on each midnight around the 23-hour day in March", () => {
      const { dayKeys, gapsHours } = runNights(new Date(2026, 2, 6, 22).getTime(), 3);
      expect(dayKeys).to.deep.equal(["2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09"]);
      expect(gapsHours).to.deep.equal([24, 23]);
    });

    it("lands on each midnight around the 25-hour day in November", () => {
      const { dayKeys, gapsHours } = runNights(new Date(2026, 9, 30, 22).getTime(), 3);
      expect(dayKeys).to.deep.equal(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
      expect(gapsHours).to.deep.equal([24, 25]);
    });
  });
});
