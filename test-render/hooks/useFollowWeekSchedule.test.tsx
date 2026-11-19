import { act, renderHook } from "@testing-library/react-native";
import { IEvaluatedProgram } from "../../src/models/program";
import { WeekScheduleStore } from "../../src/utils/weekScheduleStore";
import { useFollowWeekSchedule } from "../../src/utils/useFollowWeekSchedule";

jest.mock("../../src/utils/indexeddb", () => {
  const memory = new Map<string, string | undefined>();
  return {
    IndexedDBUtils_get: async (key: string) => memory.get(key),
    IndexedDBUtils_setMany: async (pairs: Array<[string, string | undefined]>) => {
      pairs.forEach(([key, value]) => memory.set(key, value));
    },
  };
});
jest.mock("react-native-purchases", () => ({ __esModule: true, default: {} }));
jest.mock("react-native-purchases-ui", () => ({ __esModule: true, default: {} }));

const week = { days: ["a", "b", "c", "d", "e", "f", "g"].map((name) => ({ name })) };
const program = { id: "p1", nextDay: 1, weeks: [week] } as unknown as IEvaluatedProgram;

describe("useFollowWeekSchedule", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 10, 18, 12, 0, 0), doNotFake: ["nextTick", "setImmediate"] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("moves the next workout to the planned weekday on the first look of the day", async () => {
    const dispatch = jest.fn();
    await renderHook(() => useFollowWeekSchedule(program, [], false, dispatch));
    await act(async () => {});
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(WeekScheduleStore.get().followedOn).toEqual({ p1: "2026-11-18" });
  });

  it("does not move it a second time on the same day", async () => {
    const dispatch = jest.fn();
    await renderHook(() => useFollowWeekSchedule(program, [], false, dispatch));
    await act(async () => {});
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("leaves a running workout alone", async () => {
    await WeekScheduleStore.replace({ version: 1, programs: {} });
    const dispatch = jest.fn();
    await renderHook(() => useFollowWeekSchedule(program, [], true, dispatch));
    await act(async () => {});
    expect(dispatch).not.toHaveBeenCalled();
    expect(WeekScheduleStore.get().followedOn).toBeUndefined();
  });

  it("follows again the next day", async () => {
    const dispatch = jest.fn();
    const { rerender } = await renderHook(() => useFollowWeekSchedule(program, [], false, dispatch));
    jest.setSystemTime(new Date(2026, 10, 19, 12, 0, 0));
    await rerender({});
    await act(async () => {});
    expect(WeekScheduleStore.get().followedOn).toEqual({ p1: "2026-11-19" });
  });
});
