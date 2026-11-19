import React from "react";
import { act, renderHook } from "@testing-library/react-native";
import { Fixture_build } from "../harness/fixture";
import { TrackedStateProvider } from "../../src/navigation/TrackedStateContext";
import { BearStore } from "../../src/utils/bearStore";
import { useBear } from "../../src/utils/useBear";

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

const state = Fixture_build({ ongoingWorkout: false });
const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
  <TrackedStateProvider state={state} dispatch={jest.fn()}>
    {children}
  </TrackedStateProvider>
);

describe("useBear", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 10, 18, 23, 59, 50) });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns the bear state, the empty store and the planned days on first render", async () => {
    const { result } = await renderHook(() => useBear(), { wrapper });
    expect(result.current.store).toMatchObject({ celebratedLevel: 1, seenBadges: [], spent: 0 });
    expect(typeof result.current.state.countedKg).toBe("number");
    expect(result.current.plannedPerWeek).toBeGreaterThanOrEqual(0);
  });

  it("returns the new store after the bear store changes", async () => {
    const { result } = await renderHook(() => useBear(), { wrapper });
    await act(async () => {
      await BearStore.update((saved) => ({ ...saved, spent: 7 }));
    });
    expect(result.current.store.spent).toBe(7);
  });

  it("builds a new state after midnight", async () => {
    const { result } = await renderHook(() => useBear(), { wrapper });
    const before = result.current.state;
    await act(async () => {
      jest.advanceTimersByTime(11000);
    });
    expect(result.current.state).not.toBe(before);
  });

  it("clears the midnight timer on unmount", async () => {
    const { unmount } = await renderHook(() => useBear(), { wrapper });
    const clear = jest.spyOn(global, "clearTimeout");
    await unmount();
    expect(clear).toHaveBeenCalled();
  });
});
