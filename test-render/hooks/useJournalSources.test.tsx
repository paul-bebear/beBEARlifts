import React from "react";
import { renderHook } from "@testing-library/react-native";
import { Fixture_build } from "../harness/fixture";
import { TrackedStateProvider } from "../../src/navigation/TrackedStateContext";
import { useJournalDay, useJournalSources } from "../../src/utils/useJournalSources";

jest.mock("../../src/utils/indexeddb", () => ({
  IndexedDBUtils_get: async () => undefined,
  IndexedDBUtils_setMany: async () => undefined,
}));
jest.mock("react-native-purchases", () => ({ __esModule: true, default: {} }));
jest.mock("react-native-purchases-ui", () => ({ __esModule: true, default: {} }));

const state = Fixture_build({ ongoingWorkout: false });
const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
  <TrackedStateProvider state={state} dispatch={jest.fn()}>
    {children}
  </TrackedStateProvider>
);

describe("useJournalSources", () => {
  it("gathers today, history, settings, weights and the stores on first render", async () => {
    const { result } = await renderHook(() => useJournalSources(), { wrapper });
    expect(result.current.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.current.history).toEqual(state.storage.history);
    expect(result.current.settings).toEqual(state.storage.settings);
    expect(result.current.weights).toEqual(state.storage.stats.weight.weight ?? []);
    expect(result.current.notes.notes).toEqual([]);
  });

  it("builds the entry for the day it is asked for", async () => {
    const { result } = await renderHook(() => useJournalDay("2026-11-17"), { wrapper });
    expect(result.current.day).toBe("2026-11-17");
  });
});
