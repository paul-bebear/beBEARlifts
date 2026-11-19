import { AccessibilityInfo } from "react-native";
import { act, renderHook } from "@testing-library/react-native";
import { useReduceMotion } from "../../src/utils/useReduceMotion";

type IListener = (enabled: boolean) => void;

describe("useReduceMotion", () => {
  let listener: IListener | undefined;
  const remove = jest.fn();

  function mockSystem(enabled: boolean): void {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(enabled);
    jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation(((_name: string, fn: IListener) => {
      listener = fn;
      return { remove };
    }) as never);
  }

  beforeEach(() => {
    listener = undefined;
    remove.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns the initial value, then the system answer", async () => {
    mockSystem(true);
    const { result } = await renderHook(() => useReduceMotion());
    await act(async () => {});
    expect(result.current).toBe(true);
  });

  it("follows the setting when it changes", async () => {
    mockSystem(false);
    const { result } = await renderHook(() => useReduceMotion());
    await act(async () => {});
    await act(async () => listener?.(true));
    expect(result.current).toBe(true);
  });

  it("removes its subscription on unmount", async () => {
    mockSystem(false);
    const { unmount } = await renderHook(() => useReduceMotion());
    await unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
