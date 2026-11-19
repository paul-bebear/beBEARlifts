import React from "react";
import { act, renderHook } from "@testing-library/react-native";
import { Fixture_build } from "../harness/fixture";
import { TrackedStateProvider } from "../../src/navigation/TrackedStateContext";
import { useBearHouse } from "../../src/utils/useBearHouse";

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

describe("useBearHouse", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 10, 18, 23, 59, 50) });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns a room, a wall and objects on first render", async () => {
    const { result } = await renderHook(() => useBearHouse(false, 1), { wrapper });
    expect(typeof result.current.room).toBe("string");
    expect(typeof result.current.wall).toBe("string");
    expect(Array.isArray(result.current.objects)).toBe(true);
  });

  it("returns a new view when the level or the workout flag changes", async () => {
    const { result, rerender } = await renderHook(
      (props: { hasWorkout: boolean; level: number }) => useBearHouse(props.hasWorkout, props.level),
      { wrapper, initialProps: { hasWorkout: false, level: 1 } }
    );
    const before = result.current;
    await rerender({ hasWorkout: true, level: 5 });
    expect(result.current).not.toBe(before);
  });

  it("builds a new view after midnight", async () => {
    const { result } = await renderHook(() => useBearHouse(false, 1), { wrapper });
    const before = result.current;
    await act(async () => {
      jest.advanceTimersByTime(11000);
    });
    expect(result.current).not.toBe(before);
  });

  it("clears the midnight timer on unmount", async () => {
    const { unmount } = await renderHook(() => useBearHouse(false, 1), { wrapper });
    const clear = jest.spyOn(global, "clearTimeout");
    await unmount();
    expect(clear).toHaveBeenCalled();
  });
});
