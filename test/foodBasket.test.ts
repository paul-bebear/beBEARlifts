import "mocha";
import { expect } from "chai";
import {
  FoodBasket_entries,
  FoodBasket_fromChoices,
  FoodBasket_has,
  FoodBasket_putAll,
  FoodBasket_setGrams,
  FoodBasket_toggle,
  FoodBasket_totals,
  FoodBasket_put,
} from "../src/models/foodBasket";
import { FoodSuggestions_forMeal } from "../src/models/foodSuggestions";
import {
  Recipes_fromBasket,
  Recipes_servingPick,
  SavedMeals_fromBasket,
  SavedMeals_items,
} from "../src/models/savedMeals";
import { FoodLog_empty, FoodLog_parse, FoodLog_saveMeal, FoodLog_saveRecipe, IFoodEntry } from "../src/models/foodLog";
import { FoodAddFlow_nutrientsFor, IFoodPick } from "../src/models/foodAddFlow";
import { RecipeCatalog_basketKey, RecipeCatalog_find, RecipeCatalog_servingPick } from "../src/models/recipeCatalog";

const yogurt: IFoodPick = {
  name: "Greek yogurt",
  brand: "Fage",
  source: "search",
  barcode: "5201054017272",
  per100g: { calories: 73, protein: 10, carbs: 4, fat: 2 },
  servingGrams: 170,
};
const wrap: IFoodPick = {
  name: "Chicken wrap",
  source: "manual",
  fixed: { nutrients: { calories: 520, protein: 38, carbs: 45, fat: 18 } },
};

describe("FoodBasket", () => {
  it("toggles a food in with its serving size and out again", () => {
    const basket = FoodBasket_toggle([], yogurt);
    expect(basket).to.have.length(1);
    expect(basket[0].grams).to.equal(170);
    expect(FoodBasket_has(basket, yogurt)).to.equal(true);
    expect(FoodBasket_toggle(basket, yogurt)).to.deep.equal([]);
  });

  it("totals the basket with grams applied", () => {
    const basket = FoodBasket_setGrams(FoodBasket_put(FoodBasket_put([], yogurt), wrap), yogurt.barcode!, 200);
    expect(FoodBasket_totals(basket)).to.deep.equal({ calories: 666, protein: 58, carbs: 53, fat: 22 });
  });

  it("ignores a zero or negative portion", () => {
    const basket = FoodBasket_put([], yogurt);
    expect(FoodBasket_setGrams(basket, yogurt.barcode!, 0)[0].grams).to.equal(170);
  });

  it("turns the basket into entries for one day and meal", () => {
    const entries = FoodBasket_entries(
      FoodBasket_put([], yogurt, 100),
      { day: "2026-10-19", meal: "dinner" },
      () => "1",
      5
    );
    expect(entries[0]).to.deep.include({ id: "1", day: "2026-10-19", meal: "dinner", grams: 100, createdAt: 5 });
    expect(entries[0].nutrients.calories).to.equal(73);
  });

  it("keeps AI items with the same name as separate rows", () => {
    const choices = [
      { name: "Rice", grams: 150, isSelected: true, nutrients: { calories: 195, protein: 4, carbs: 42, fat: 0.4 } },
      { name: "Rice", grams: 50, isSelected: true, nutrients: { calories: 65, protein: 1.3, carbs: 14, fat: 0.1 } },
      { name: "Oil", grams: 10, isSelected: false, nutrients: { calories: 88, protein: 0, carbs: 0, fat: 10 } },
    ];
    const basket = FoodBasket_putAll([], FoodBasket_fromChoices(choices, "photo", 7));
    expect(basket.map((i) => i.grams)).to.deep.equal([150, 50]);
    expect(FoodBasket_totals(basket).calories).to.equal(260);
  });

  it("keeps calories on the first edit of a suspect AI amount, then scales", () => {
    const choices = [
      {
        name: "Margarita",
        grams: 20,
        isSelected: true,
        isAmountSuspect: true,
        nutrients: { calories: 240, protein: 0, carbs: 22, fat: 0 },
      },
    ];
    const basket = FoodBasket_putAll([], FoodBasket_fromChoices(choices, "photo", 7));
    const fixed = FoodBasket_setGrams(basket, basket[0].key, 240);
    expect(FoodBasket_totals(fixed).calories).to.equal(240);
    expect(FoodBasket_totals(FoodBasket_setGrams(fixed, basket[0].key, 480)).calories).to.equal(480);
  });
});

function entry(name: string, meal: IFoodEntry["meal"], createdAt: number): IFoodEntry {
  return {
    id: `${name}${createdAt}`,
    day: "2026-10-19",
    meal,
    name,
    source: "manual",
    nutrients: { calories: 100, protein: 1, carbs: 1, fat: 1 },
    createdAt,
  };
}

describe("FoodSuggestions_forMeal", () => {
  it("ranks foods by how often they were logged at that meal, then adds recents", () => {
    const now = 100 * 24 * 60 * 60 * 1000;
    const log = {
      ...FoodLog_empty(),
      entries: [
        entry("Ramen", "dinner", now - 3),
        entry("Ramen", "dinner", now - 2),
        entry("Steak", "dinner", now - 1),
      ],
      recents: [
        { name: "Oats", source: "manual" as const, nutrients: { calories: 150, protein: 5, carbs: 27, fat: 3 } },
      ],
    };
    expect(FoodSuggestions_forMeal(log, "dinner", now).map((r) => r.name)).to.deep.equal(["Ramen", "Steak", "Oats"]);
    expect(FoodSuggestions_forMeal(log, "breakfast", now).map((r) => r.name)).to.deep.equal(["Oats"]);
  });
});

describe("SavedMeals and Recipes", () => {
  it("saves a basket as a meal and puts the same items back", () => {
    const meal = SavedMeals_fromBasket(
      " Usual breakfast ",
      FoodBasket_put(FoodBasket_put([], yogurt, 200), wrap),
      "m1"
    );
    expect(meal.name).to.equal("Usual breakfast");
    const back = FoodBasket_putAll([], SavedMeals_items(meal));
    expect(back.map((i) => i.grams)).to.deep.equal([200, 0]);
    expect(FoodBasket_totals(back).calories).to.equal(666);
  });

  it("logs one serving of a recipe and scales by its weight", () => {
    const recipe = Recipes_fromBasket("Chili", 4, FoodBasket_put([], { ...yogurt }, 800), "r1");
    const pick = Recipes_servingPick(recipe);
    expect(pick.fixed?.grams).to.equal(200);
    expect(pick.fixed?.nutrients.calories).to.equal(146);
    expect(FoodAddFlow_nutrientsFor(pick, 400).calories).to.equal(292);
  });

  it("logs a recipe with an unweighed ingredient as fixed numbers per serving", () => {
    const recipe = Recipes_fromBasket("Wraps", 2, FoodBasket_put([], wrap), "r2");
    expect(Recipes_servingPick(recipe).fixed).to.deep.equal({
      grams: undefined,
      nutrients: { calories: 260, protein: 19, carbs: 22.5, fat: 9 },
    });
  });

  it("survives a round trip through the stored log and drops broken records", () => {
    const meal = SavedMeals_fromBasket("Breakfast", FoodBasket_put([], yogurt), "m1");
    const recipe = Recipes_fromBasket("Chili", 4, FoodBasket_put([], yogurt, 800), "r1");
    const log = FoodLog_saveRecipe(FoodLog_saveMeal(FoodLog_empty(), meal), recipe);
    const stored = JSON.parse(JSON.stringify(log));
    stored.meals.push({ id: "x", name: "Empty", items: [] });
    stored.recipes.push({ id: "y", name: "Bad", servings: 0, ingredients: meal.items });
    const parsed = FoodLog_parse(stored);
    expect(parsed.meals).to.deep.equal([meal]);
    expect(parsed.recipes).to.deep.equal([recipe]);
  });
});

describe("FoodBasket with a cookbook recipe serving", () => {
  const bowls = RecipeCatalog_find("teriyaki-chicken-rice-bowls")!;
  const where = { day: "2026-10-23", meal: "lunch" as const };

  it("logs 1.5 servings once, on the chosen day and meal", () => {
    const pick = RecipeCatalog_servingPick(bowls, 1.5);
    const basket = FoodBasket_put([], pick, 0, RecipeCatalog_basketKey(bowls));
    const entries = FoodBasket_entries(basket, where, () => "e1", 7);
    expect(entries).to.have.length(1);
    expect(entries[0]).to.deep.include({ day: "2026-10-23", meal: "lunch", name: bowls.title });
    expect(entries[0].nutrients).to.deep.equal(pick.fixed!.nutrients);
    expect(entries[0].grams).to.equal(undefined);
  });

  it("replaces the serving count when the recipe is logged again before saving the basket", () => {
    let basket = FoodBasket_put([], RecipeCatalog_servingPick(bowls, 1), 0, RecipeCatalog_basketKey(bowls));
    basket = FoodBasket_put(basket, RecipeCatalog_servingPick(bowls, 0.5), 0, RecipeCatalog_basketKey(bowls));
    expect(basket).to.have.length(1);
    expect(FoodBasket_totals(basket)).to.deep.equal(RecipeCatalog_servingPick(bowls, 0.5).fixed!.nutrients);
  });
});
