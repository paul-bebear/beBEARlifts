import { AccessibilityInfo, Animated } from "react-native";
import { act, renderHook } from "@testing-library/react-native";
import { useBearBreathing } from "../../src/utils/useBearBreathing";

describe("useBearBreathing", () => {
  const start = jest.fn();
  const stop = jest.fn();

  function mockSystem(reduceMotion: boolean): void {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(reduceMotion);
    jest.spyOn(AccessibilityInfo, "addEventListener").mockReturnValue({ remove: jest.fn() } as never);
    jest.spyOn(Animated, "loop").mockReturnValue({ start, stop } as never);
  }

  beforeEach(() => {
    start.mockClear();
    stop.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns a value at rest", async () => {
    mockSystem(true);
    const { result } = await renderHook(() => useBearBreathing(4000, 1.04));
    expect((result.current as unknown as { __getValue: () => number }).__getValue()).toBe(1);
  });

  it("starts the loop when Reduce Motion is off", async () => {
    mockSystem(false);
    await renderHook(() => useBearBreathing(4000, 1.04));
    await act(async () => {});
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("never starts the loop when Reduce Motion is on", async () => {
    mockSystem(true);
    await renderHook(() => useBearBreathing(4000, 1.04));
    await act(async () => {});
    expect(start).not.toHaveBeenCalled();
  });

  it("stops the loop on unmount", async () => {
    mockSystem(false);
    const { unmount } = await renderHook(() => useBearBreathing(4000, 1.04));
    await act(async () => {});
    await unmount();
    expect(stop).toHaveBeenCalled();
  });
});
