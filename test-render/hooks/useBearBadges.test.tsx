import React from "react";
import { act, renderHook } from "@testing-library/react-native";
import { Fixture_build, Fixture_history } from "../harness/fixture";
import { TrackedStateProvider } from "../../src/navigation/TrackedStateContext";
import { BearStore } from "../../src/utils/bearStore";
import { useBearBadges } from "../../src/utils/useBearBadges";

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
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useIsFocused: () => true,
}));

const base = Fixture_build({ ongoingWorkout: false });
const state = { ...base, storage: { ...base.storage, history: Fixture_history(3) } };
const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
  <TrackedStateProvider state={state} dispatch={jest.fn()}>
    {children}
  </TrackedStateProvider>
);

describe("useBearBadges", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 10, 18, 23, 59, 50) });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns the badge list, the grid and an empty streak on first render", async () => {
    const { result } = await renderHook(() => useBearBadges(), { wrapper });
    expect(Array.isArray(result.current.badges)).toBe(true);
    expect(result.current.streak).toBe(0);
    expect(result.current.today).toBe("2026-11-18");
    expect(result.current.doneDays.size).toBe(0);
  });

  it("keeps the same badges when the bear store changes a field the badges do not read", async () => {
    const { result } = await renderHook(() => useBearBadges(), { wrapper });
    const before = result.current.badges;
    await act(async () => {
      await BearStore.update((saved) => ({ ...saved, spent: 5 }));
    });
    expect(result.current.badges).toEqual(before);
  });

  it("reads the new day after midnight", async () => {
    const { result } = await renderHook(() => useBearBadges(), { wrapper });
    await act(async () => {
      jest.advanceTimersByTime(11000);
    });
    expect(result.current.today).toBe("2026-11-19");
  });

  it("clears the midnight timer on unmount", async () => {
    const { unmount } = await renderHook(() => useBearBadges(), { wrapper });
    const clear = jest.spyOn(global, "clearTimeout");
    await unmount();
    expect(clear).toHaveBeenCalled();
  });
});
