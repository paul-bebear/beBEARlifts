import { AppState } from "react-native";
import { renderHook } from "@testing-library/react-native";
import { StepsStore_syncHealth } from "../../src/utils/stepsStore";
import { useStepsHealthSync } from "../../src/utils/useStepsHealthSync";

jest.mock("../../src/utils/stepsStore", () => ({ StepsStore_syncHealth: jest.fn().mockResolvedValue(undefined) }));

type IListener = (status: string) => void;

describe("useStepsHealthSync", () => {
  let listener: IListener | undefined;
  const remove = jest.fn();
  const sync = StepsStore_syncHealth as jest.Mock;

  beforeEach(() => {
    listener = undefined;
    sync.mockClear();
    remove.mockClear();
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
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it("does nothing when disabled or not focused", async () => {
    await renderHook(() => useStepsHealthSync(false, true));
    await renderHook(() => useStepsHealthSync(true, false));
    expect(sync).not.toHaveBeenCalled();
    expect(listener).toBeUndefined();
  });

  it("syncs again when the app returns to the foreground, and not for other states", async () => {
    await renderHook(() => useStepsHealthSync(true, true));
    listener?.("background");
    expect(sync).toHaveBeenCalledTimes(1);
    listener?.("active");
    expect(sync).toHaveBeenCalledTimes(2);
  });

  it("stops listening when focus is lost and on unmount", async () => {
    const { rerender, unmount } = await renderHook(
      (props: { focused: boolean }) => useStepsHealthSync(true, props.focused),
      { initialProps: { focused: true } }
    );
    await rerender({ focused: false });
    expect(remove).toHaveBeenCalledTimes(1);
    await rerender({ focused: true });
    await unmount();
    expect(remove).toHaveBeenCalledTimes(2);
  });

  it("swallows a failed sync", async () => {
    sync.mockRejectedValueOnce(new Error("no health"));
    await expect(renderHook(() => useStepsHealthSync(true, true))).resolves.toBeDefined();
  });
});
