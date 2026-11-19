import "mocha";
import { expect } from "chai";
import {
  FoodBasketFlow_logBasket,
  FoodBasketFlow_logServing,
  FoodBasketFlow_saveGroup,
  FoodBasketFlow_saveLabel,
  IFoodLogWrite,
  IServingLogDeps,
} from "../src/models/foodBasketFlow";
import { FoodAddFlow_pickFromProduct } from "../src/models/foodAddFlow";
import { FoodBasket_put, IFoodBasketItem } from "../src/models/foodBasket";
import { FoodLabel_saveFailed } from "../src/models/foodCapture";
import { FoodLog_empty, IFoodLog } from "../src/models/foodLog";
import { FoodScanSteps_shareFailed, IScanServing } from "../src/models/foodScanSteps";

const product = {
  barcode: "3017624010701",
  name: "Nutella",
  brand: "Ferrero",
  per100g: { calories: 539, protein: 6.3, carbs: 57.5, fat: 30.9 },
  servingGrams: 15,
};
const nutella = FoodAddFlow_pickFromProduct(product, "barcode");
const where = { day: "2026-11-19", meal: "lunch" as const };
const postId = "01234567-89ab-4def-8123-456789abcdef";

function idCounter(): () => string {
  let n = 0;
  return () => {
    n += 1;
    return `id${n}`;
  };
}

interface IRecorder {
  log: IFoodLog;
  calls: string[];
  write: IFoodLogWrite;
}

function recorder(failWrite: boolean = false): IRecorder {
  const rec: IRecorder = {
    log: FoodLog_empty(),
    calls: [],
    write: {
      update: async (change) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        if (failWrite) {
          throw new Error("disk full");
        }
        rec.log = change(rec.log);
        rec.calls.push("save");
      },
      newId: idCounter(),
      now: 5,
    },
  };
  return rec;
}

const servingOf = (items: IFoodBasketItem[], extra: Partial<IScanServing> = {}): IScanServing => ({
  mode: "ai",
  items,
  ...extra,
});

describe("FoodBasketFlow_logBasket", () => {
  it("logs once when Add is tapped twice, and lets the user retry when the write throws", async () => {
    const rec = recorder();
    const basket = FoodBasket_put([], nutella);
    const guard = { current: false };
    const taps = [
      FoodBasketFlow_logBasket(basket, where, guard, rec.write),
      FoodBasketFlow_logBasket(basket, where, guard, rec.write),
    ];
    expect(await Promise.all(taps)).to.deep.equal([true, false]);
    expect(rec.log.entries.map((e) => [e.name, e.meal])).to.deep.equal([["Nutella", "lunch"]]);
    const failing = { current: false };
    expect(await FoodBasketFlow_logBasket(basket, where, failing, recorder(true).write)).to.equal(false);
    expect(failing.current).to.equal(false);
  });
});

describe("FoodBasketFlow_logServing", () => {
  const items = FoodBasket_put([], nutella);

  function deps(rec: IRecorder, over: Partial<IServingLogDeps> = {}): IServingLogDeps {
    return {
      guard: { current: false },
      write: rec.write,
      share: { enabled: true, note: "" },
      newPostId: () => postId,
      goBack: () => rec.calls.push("goBack"),
      sharePost: async () => {
        rec.calls.push("share");
      },
      alert: (message) => rec.calls.push(`alert:${message}`),
      ...over,
    };
  }

  it("saves, closes the screen, then shares, in that order", async () => {
    const rec = recorder();
    await FoodBasketFlow_logServing(servingOf(items, { isShared: true, photo: "data:x" }), where, deps(rec));
    expect(rec.calls).to.deep.equal(["save", "goBack", "share"]);
  });

  it("shows a notice when the share fails after the meal was added", async () => {
    const rec = recorder();
    const sharePost = async (): Promise<void> => {
      throw new Error("feed write failed");
    };
    await FoodBasketFlow_logServing(servingOf(items, { isShared: true }), where, deps(rec, { sharePost }));
    expect(rec.calls).to.deep.equal(["save", "goBack", `alert:${FoodScanSteps_shareFailed}`]);
  });

  it("saves once when Add is tapped twice", async () => {
    const rec = recorder();
    const shared = deps(rec);
    const serving = servingOf(items);
    await Promise.all([
      FoodBasketFlow_logServing(serving, where, shared),
      FoodBasketFlow_logServing(serving, where, shared),
    ]);
    expect(rec.calls).to.deep.equal(["save", "goBack"]);
  });
});

describe("FoodBasketFlow_saveGroup", () => {
  const basket = FoodBasket_put([], nutella);

  it("saves a meal and sends the user to the Meals tab in browse", async () => {
    const rec = recorder();
    const result = await FoodBasketFlow_saveGroup("meal", " Breakfast ", 1, basket, { current: false }, rec.write);
    expect(result).to.deep.equal({ isMealsTab: true, step: { type: "browseOpened" } });
    expect(rec.log.meals.map((m) => [m.id, m.name, m.items.length])).to.deep.equal([["id1", "Breakfast", 1]]);
  });

  it("saves a recipe and replaces the basket with that one recipe", async () => {
    const rec = recorder();
    const result = await FoodBasketFlow_saveGroup("recipe", "Bowl", 2, basket, { current: false }, rec.write);
    expect(result?.step).to.deep.equal({ type: "basketOpened" });
    expect(result?.basket?.map((i) => i.pick.name)).to.deep.equal(["Bowl"]);
    expect(rec.log.recipes.map((r) => [r.name, r.servings])).to.deep.equal([["Bowl", 2]]);
  });
});

describe("FoodBasketFlow_saveLabel", () => {
  it("saves the food and opens the amount step with a barcode pick when a code was scanned", async () => {
    const rec = recorder();
    const alerts: string[] = [];
    const step = await FoodBasketFlow_saveLabel(product, "3017624010701", { current: false }, rec.write.update, (m) =>
      alerts.push(m)
    );
    expect(step?.type).to.equal("amountOpened");
    expect(step?.type === "amountOpened" && step.pick.source).to.equal("barcode");
    expect(rec.log.savedFoods.map((f) => f.name)).to.deep.equal(["Nutella"]);
    expect(alerts).to.deep.equal([]);
  });

  it("opens the amount step once when Save is tapped twice, and stays silent on the second tap", async () => {
    const rec = recorder();
    const alerts: string[] = [];
    const guard = { current: false };
    const first = FoodBasketFlow_saveLabel(product, undefined, guard, rec.write.update, (m) => alerts.push(m));
    const second = FoodBasketFlow_saveLabel(product, undefined, guard, rec.write.update, (m) => alerts.push(m));
    const steps = await Promise.all([first, second]);
    expect(steps.filter((s) => s != null)).to.have.length(1);
    expect(alerts).to.deep.equal([]);
    expect(rec.log.savedFoods).to.have.length(1);
  });

  it("shows a notice and does not move when the write fails", async () => {
    const rec = recorder(true);
    const alerts: string[] = [];
    const step = await FoodBasketFlow_saveLabel(product, undefined, { current: false }, rec.write.update, (m) =>
      alerts.push(m)
    );
    expect(step).to.equal(undefined);
    expect(alerts).to.deep.equal([FoodLabel_saveFailed]);
  });
});
