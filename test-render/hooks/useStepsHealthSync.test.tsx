import { AppState } from "react-native";
import { act, renderHook } from "@testing-library/react-native";
import { useStepsHealthSync } from "../../src/utils/useStepsHealthSync";
import { StepsStore_syncHealth } from "../../src/utils/stepsStore";

jest.mock("../../src/utils/stepsStore", () => ({
  StepsStore_syncHealth: jest.fn(),
}));

type IListener = (status: string) => void;

describe("useStepsHealthSync", () => {
  const syncHealth = StepsStore_syncHealth as jest.Mock;
  const remove = jest.fn();
  let listener: IListener | undefined;

  beforeEach(() => {
    listener = undefined;
    remove.mockClear();
    syncHealth.mockReset().mockResolvedValue(undefined);
    jest.spyOn(AppState, "addEventListener").mockImplementation(((_name: string, fn: IListener) => {
      listener = fn;
      return { remove };
    }) as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("syncs once on mount when enabled and focused", async () => {
    await renderHook(() => useStepsHealthSync(true, true));
    expect(syncHealth).toHaveBeenCalledTimes(1);
  });

  it("does not sync or listen when health access is off", async () => {
    await renderHook(() => useStepsHealthSync(false, true));
    await act(async () => listener?.("active"));
    expect(syncHealth).not.toHaveBeenCalled();
  });

  it("does not sync while the screen is not focused", async () => {
    await renderHook(() => useStepsHealthSync(true, false));
    await act(async () => listener?.("active"));
    expect(syncHealth).not.toHaveBeenCalled();
  });

  it("does not sync again on a re-render with the same flags", async () => {
    const { rerender } = await renderHook(() => useStepsHealthSync(true, true));
    await rerender({});
    await rerender({});
    expect(syncHealth).toHaveBeenCalledTimes(1);
  });

  it("syncs again when the app returns to the foreground", async () => {
    await renderHook(() => useStepsHealthSync(true, true));
    await act(async () => listener?.("background"));
    expect(syncHealth).toHaveBeenCalledTimes(1);
    await act(async () => listener?.("active"));
    expect(syncHealth).toHaveBeenCalledTimes(2);
  });

  it("swallows a failed sync", async () => {
    syncHealth.mockRejectedValue(new Error("health module missing"));
    await expect(renderHook(() => useStepsHealthSync(true, true))).resolves.toBeDefined();
    await act(async () => {});
    expect(syncHealth).toHaveBeenCalledTimes(1);
  });

  it("removes the listener on unmount", async () => {
    const { unmount } = await renderHook(() => useStepsHealthSync(true, true));
    await unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("removes the listener when access turns off", async () => {
    const { rerender } = await renderHook((props: { enabled: boolean }) => useStepsHealthSync(props.enabled, true), {
      initialProps: { enabled: true },
    });
    await rerender({ enabled: false });
    expect(remove).toHaveBeenCalledTimes(1);
    expect(syncHealth).toHaveBeenCalledTimes(1);
  });
});
