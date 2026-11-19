import { act, renderHook } from "@testing-library/react-native";
import { AccountPlan_empty } from "../../src/models/accountPlan";
import { AccountPlanStore } from "../../src/utils/accountPlanClient";
import { CloudStore } from "../../src/utils/supabaseClient";
import { useHasPlus, usePlusAccess } from "../../src/utils/usePlusAccess";

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

const plusPlan = { status: "known", userId: "u1", plan: "plus", grant: "code", canManage: false } as const;
const session = { userId: "u1" } as never;

describe("usePlusAccess", () => {
  beforeEach(async () => {
    await AccountPlanStore.replace(AccountPlan_empty());
    await CloudStore.update((cloud) => ({ ...cloud, session: undefined }));
  });

  it("is locked for a plus feature and open for a free one before any plan is known", async () => {
    const plus = await renderHook(() => usePlusAccess("muscles"));
    const free = await renderHook(() => usePlusAccess("plates"));
    expect(plus.result.current).toBe(false);
    expect(free.result.current).toBe(true);
  });

  it("opens a plus feature once the plan and the signed-in user match", async () => {
    const { result } = await renderHook(() => ({ feature: usePlusAccess("muscles"), has: useHasPlus() }));
    await act(async () => {
      await AccountPlanStore.replace(plusPlan);
      await CloudStore.update((cloud) => ({ ...cloud, session }));
    });
    expect(result.current).toEqual({ feature: true, has: true });
  });

  it("stays locked when the plan belongs to another user", async () => {
    const { result } = await renderHook(() => useHasPlus());
    await act(async () => {
      await AccountPlanStore.replace(plusPlan);
      await CloudStore.update((cloud) => ({ ...cloud, session: { userId: "u2" } as never }));
    });
    expect(result.current).toBe(false);
  });

  it("stops listening to both stores on unmount", async () => {
    const { unmount } = await renderHook(() => useHasPlus());
    await unmount();
    await expect(AccountPlanStore.replace(plusPlan)).resolves.toBeUndefined();
  });
});
