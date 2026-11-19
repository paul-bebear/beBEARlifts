import "mocha";
import { expect } from "chai";
import {
  FoodBasketFlow_logBasket,
  FoodBasketFlow_reduce,
  FoodBasketFlow_logServing,
  FoodBasketFlow_saveGroup,
  FoodBasketFlow_saveLabel,
  IFoodLogWrite,
  IServingLogDeps,
} from "../src/models/foodBasketFlow";
import { FoodAddFlow_pickFromProduct } from "../src/models/foodAddFlow";
import { FoodBasket_keyOf, FoodBasket_put, IFoodBasketItem } from "../src/models/foodBasket";
import { FoodLabel_saveFailed } from "../src/models/foodCapture";
import { FoodLog_empty, IFoodLog, IFoodSavedMeal } from "../src/models/foodLog";
import { RecipeCatalogData_recipes } from "../src/models/recipeCatalogData";
import { RecipeCatalog_basketKey } from "../src/models/recipeCatalog";
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

describe("FoodBasketFlow_reduce", () => {
  const rice = FoodAddFlow_pickFromProduct(
    { name: "Rice", per100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 } } as typeof product,
    "search"
  );
  const nutellaKey = FoodBasket_keyOf(nutella);
  const riceKey = FoodBasket_keyOf(rice);

  it("returns to the start when the same food is toggled twice", () => {
    const on = FoodBasketFlow_reduce([], { type: "toggled", pick: nutella });
    expect(on).to.deep.equal([{ key: nutellaKey, pick: nutella, grams: 15 }]);
    expect(FoodBasketFlow_reduce(on, { type: "toggled", pick: nutella })).to.deep.equal([]);
  });

  it("replaces a food that is already in the basket and keeps its place", () => {
    const start = FoodBasketFlow_reduce(FoodBasketFlow_reduce([], { type: "put", pick: nutella, grams: 30 }), {
      type: "put",
      pick: rice,
      grams: 200,
    });
    const next = FoodBasketFlow_reduce(start, { type: "put", pick: nutella, grams: 45 });
    expect(next.map((i) => [i.key, i.grams])).to.deep.equal([
      [nutellaKey, 45],
      [riceKey, 200],
    ]);
  });

  it("empties the basket when the last item is removed, and ignores an unknown key", () => {
    const one = FoodBasketFlow_reduce([], { type: "toggled", pick: nutella });
    expect(FoodBasketFlow_reduce(one, { type: "removed", key: "nope" })).to.deep.equal(one);
    expect(FoodBasketFlow_reduce(one, { type: "removed", key: nutellaKey })).to.deep.equal([]);
  });

  it("changes grams, ignores 0 and below, and passes a huge value through", () => {
    const one = FoodBasketFlow_reduce([], { type: "toggled", pick: nutella });
    const gramsOf = (b: IFoodBasketItem[]): number | undefined => b[0]?.grams;
    expect(gramsOf(FoodBasketFlow_reduce(one, { type: "gramsChanged", key: nutellaKey, grams: 60 }))).to.equal(60);
    expect(gramsOf(FoodBasketFlow_reduce(one, { type: "gramsChanged", key: nutellaKey, grams: 0 }))).to.equal(15);
    expect(gramsOf(FoodBasketFlow_reduce(one, { type: "gramsChanged", key: nutellaKey, grams: -5 }))).to.equal(15);
    expect(gramsOf(FoodBasketFlow_reduce(one, { type: "gramsChanged", key: nutellaKey, grams: 99999 }))).to.equal(
      99999
    );
  });

  it("adds a quick item with 0 grams and a key of its own, so two quick items stay separate", () => {
    const nutrients = { calories: 300, protein: 10, carbs: 20, fat: 5 };
    const a = FoodBasketFlow_reduce([], { type: "quickAdded", name: " Cake ", nutrients, now: 1 });
    const b = FoodBasketFlow_reduce(a, { type: "quickAdded", name: "Cake", nutrients, now: 2 });
    expect(a[0]).to.deep.include({ key: "quick|1", grams: 0 });
    expect(a[0].pick.name).to.equal("Cake");
    expect(b.map((i) => i.key)).to.deep.equal(["quick|1", "quick|2"]);
  });

  it("adds a catalog recipe as one row with 0 grams, and a second add replaces it", () => {
    const recipe = RecipeCatalogData_recipes.find((r) => r.ingredients.length > 1)!;
    const one = FoodBasketFlow_reduce([], { type: "catalogRecipeAdded", recipe, servings: 1 });
    const two = FoodBasketFlow_reduce(one, { type: "catalogRecipeAdded", recipe, servings: 2 });
    expect(one).to.have.length(1);
    expect(one[0]).to.deep.include({ key: RecipeCatalog_basketKey(recipe), grams: 0 });
    expect(two).to.have.length(1);
    expect(two[0].pick.fixed!.nutrients.calories).to.be.closeTo(one[0].pick.fixed!.nutrients.calories * 2, 1);
  });

  it("adds a saved meal on top of a basket that has one of its foods, replacing that row in place", () => {
    const meal: IFoodSavedMeal = {
      id: "m1",
      name: "Lunch",
      items: [
        { name: "Rice", source: "search", per100g: rice.per100g, grams: 150, nutrients: rice.per100g! },
        {
          name: "Nutella",
          source: "barcode",
          barcode: product.barcode,
          per100g: product.per100g,
          grams: 20,
          nutrients: product.per100g,
        },
      ],
    };
    const start = FoodBasketFlow_reduce(FoodBasketFlow_reduce([], { type: "toggled", pick: nutella }), {
      type: "put",
      pick: FoodAddFlow_pickFromProduct({ name: "Egg", per100g: product.per100g } as typeof product, "search"),
      grams: 50,
    });
    const next = FoodBasketFlow_reduce(start, { type: "mealAdded", meal });
    expect(next.map((i) => [i.pick.name, i.grams])).to.deep.equal([
      ["Nutella", 20],
      ["Egg", 50],
      ["Rice", 150],
    ]);
  });
});
