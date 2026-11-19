import React from "react";
import { act, renderHook } from "@testing-library/react-native";
import { Fixture_build } from "../harness/fixture";
import { TrackedStateProvider } from "../../src/navigation/TrackedStateContext";
import { NotesStore } from "../../src/utils/notesStore";
import { useJournalDay, useJournalSources } from "../../src/utils/useJournalSources";

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

const state = Fixture_build({ ongoingWorkout: false });
const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
  <TrackedStateProvider state={state} dispatch={jest.fn()}>
    {children}
  </TrackedStateProvider>
);

describe("useJournalSources", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 10, 18, 12, 0, 0), doNotFake: ["nextTick", "setImmediate"] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("gathers today, history, settings, weights and the stores on first render", async () => {
    const { result } = await renderHook(() => useJournalSources(), { wrapper });
    expect(result.current.today).toBe("2026-11-18");
    expect(result.current.history).toEqual(state.storage.history);
    expect(result.current.settings).toEqual(state.storage.settings);
    expect(result.current.weights).toEqual(state.storage.stats.weight.weight ?? []);
    expect(result.current.notes.notes).toEqual([]);
  });

  it("returns the new notes after the notes store changes", async () => {
    const { result } = await renderHook(() => useJournalSources(), { wrapper });
    await act(async () => {
      await NotesStore.update((log) => ({ ...log, notes: [] }));
    });
    expect(result.current.notes).toBe(NotesStore.get());
  });

  it("builds the entry for the day it is asked for", async () => {
    const { result } = await renderHook(() => useJournalDay("2026-11-17"), { wrapper });
    expect(result.current.day).toBe("2026-11-17");
  });
});
