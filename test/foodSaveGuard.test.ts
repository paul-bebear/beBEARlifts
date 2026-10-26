import "mocha";
import { expect } from "chai";
import { FoodSaveGuard_run, IFoodSaveGuard } from "../src/models/foodSaveGuard";

describe("FoodSaveGuard_run", () => {
  it("reports a saved write and keeps the guard when the screen closes", async () => {
    const guard: IFoodSaveGuard = { current: false };
    expect(await FoodSaveGuard_run(guard, async () => undefined, true)).to.equal(true);
    expect(guard.current).to.equal(true);
  });

  it("releases the guard after a saved write that keeps the screen open", async () => {
    const guard: IFoodSaveGuard = { current: false };
    expect(await FoodSaveGuard_run(guard, async () => undefined, false)).to.equal(true);
    expect(guard.current).to.equal(false);
  });

  it("releases the guard when the write fails, so Add and Log work on the next tap", async () => {
    const guard: IFoodSaveGuard = { current: false };
    const failing = async (): Promise<void> => {
      throw new Error("quota");
    };
    expect(await FoodSaveGuard_run(guard, failing, true)).to.equal(false);
    expect(guard.current).to.equal(false);
    let calls = 0;
    expect(
      await FoodSaveGuard_run(
        guard,
        async () => {
          calls += 1;
        },
        true
      )
    ).to.equal(true);
    expect(calls).to.equal(1);
  });

  it("ignores a second tap while the first write is running", async () => {
    const guard: IFoodSaveGuard = { current: false };
    let calls = 0;
    let finish: () => void = () => undefined;
    const first = FoodSaveGuard_run(
      guard,
      () =>
        new Promise<void>((resolve) => {
          calls += 1;
          finish = resolve;
        }),
      true
    );
    expect(
      await FoodSaveGuard_run(
        guard,
        async () => {
          calls += 1;
        },
        true
      )
    ).to.equal(false);
    finish();
    expect(await first).to.equal(true);
    expect(calls).to.equal(1);
  });
});
