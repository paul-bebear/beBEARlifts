import "mocha";
import { expect } from "chai";
import {
  IRecipeFilters,
  RecipeRecommendations_chipIsOn,
  RecipeRecommendations_chips,
  RecipeRecommendations_for,
  RecipeRecommendations_hasFilters,
  RecipeRecommendations_noFilters,
  RecipeRecommendations_toggleChip,
} from "../src/models/recipeRecommendations";
import { FoodLog_defaultGoals, IFoodGoals } from "../src/models/foodLog";
import { RecipeCatalog_all } from "../src/models/recipeCatalog";

const nothing = { calories: 0, protein: 0, carbs: 0, fat: 0 };
const goals: IFoodGoals = {
  calories: { min: 2000, max: 2400 },
  protein: { min: 150, max: 180 },
  carbs: { min: 200, max: 300 },
  fat: { min: 50, max: 80 },
};

function ids(filters: IRecipeFilters = RecipeRecommendations_noFilters): string[] {
  return RecipeRecommendations_for("dinner", nothing, FoodLog_defaultGoals, filters).items.map((i) => i.recipe.id);
}

describe("RecipeRecommendations filters", () => {
  it("drops recipes that contain or may contain an avoided allergen", () => {
    expect(ids({ ...RecipeRecommendations_noFilters, avoid: ["soy"] })).to.deep.equal(["sweet-potato-turkey-chili"]);
  });

  it("keeps only recipes confirmed for a diet, never unknown ones", () => {
    expect(ids({ ...RecipeRecommendations_noFilters, diets: ["vegetarian"] })).to.deep.equal([
      "southwestern-tofu-scramble",
    ]);
  });

  it("drops recipes that need missing equipment", () => {
    expect(ids({ ...RecipeRecommendations_noFilters, missingEquipment: ["instantPot"] })).to.deep.equal([]);
  });

  it("drops recipes over the time limit", () => {
    expect(ids({ ...RecipeRecommendations_noFilters, maxMinutes: 30 }).sort()).to.deep.equal([
      "florentine-egg-bites",
      "southwestern-tofu-scramble",
    ]);
  });

  it("applies filters before ranking, so a filtered recipe never shows", () => {
    const result = RecipeRecommendations_for("breakfast", nothing, goals, {
      ...RecipeRecommendations_noFilters,
      avoid: ["egg"],
    });
    expect(result.items.map((i) => i.recipe.id)).to.not.include("florentine-egg-bites");
  });
});

describe("RecipeRecommendations ranking", () => {
  it("puts dishes made for the meal first and keeps catalog order on ties when goals are unset", () => {
    const result = RecipeRecommendations_for(
      "breakfast",
      nothing,
      FoodLog_defaultGoals,
      RecipeRecommendations_noFilters
    );
    expect(result.usesGoals).to.equal(false);
    expect(result.items.map((i) => i.recipe.id)).to.deep.equal([
      "florentine-egg-bites",
      "southwestern-tofu-scramble",
      "teriyaki-chicken-rice-bowls",
      "sweet-potato-turkey-chili",
      "ginger-beef-broccoli",
    ]);
  });

  it("gives no goal reasons when goals are unset", () => {
    const result = RecipeRecommendations_for(
      "breakfast",
      nothing,
      FoodLog_defaultGoals,
      RecipeRecommendations_noFilters
    );
    expect(result.items[0].reasons).to.deep.equal(["Made for breakfast", "Ready in 25 minutes"]);
    const all = result.items.flatMap((i) => i.reasons);
    expect(all.some((r) => r.includes("Cal") || r.includes("protein"))).to.equal(false);
  });

  it("favours protein when a lot of today's protein is left", () => {
    const consumed = { calories: 1800, protein: 60, carbs: 150, fat: 50 };
    const result = RecipeRecommendations_for("dinner", consumed, goals, RecipeRecommendations_noFilters);
    expect(result.usesGoals).to.equal(true);
    expect(result.items.map((i) => i.recipe.id)).to.deep.equal([
      "ginger-beef-broccoli",
      "teriyaki-chicken-rice-bowls",
      "southwestern-tofu-scramble",
      "sweet-potato-turkey-chili",
      "florentine-egg-bites",
    ]);
    expect(result.items[0].reasons).to.deep.equal([
      "Made for dinner",
      "Adds 41 g of the 90 g protein you still need",
      "Fits your remaining 600 Cal",
    ]);
  });

  it("does not claim a recipe fits when the calories left are too few", () => {
    const consumed = { calories: 2320, protein: 60, carbs: 150, fat: 50 };
    const result = RecipeRecommendations_for("dinner", consumed, goals, RecipeRecommendations_noFilters);
    const beef = result.items.find((i) => i.recipe.id === "ginger-beef-broccoli")!;
    expect(beef.reasons.some((r) => r.startsWith("Fits"))).to.equal(false);
    const bites = result.items.find((i) => i.recipe.id === "florentine-egg-bites")!;
    expect(bites.reasons).to.include("Fits your remaining 80 Cal");
  });

  it("skips the protein reason once the protein target is met", () => {
    const consumed = { calories: 1000, protein: 160, carbs: 150, fat: 50 };
    const result = RecipeRecommendations_for("dinner", consumed, goals, RecipeRecommendations_noFilters);
    expect(result.items.flatMap((i) => i.reasons).some((r) => r.includes("protein"))).to.equal(false);
  });

  it("returns the same order for the same input", () => {
    const a = RecipeRecommendations_for("lunch", nothing, goals, RecipeRecommendations_noFilters);
    const b = RecipeRecommendations_for("lunch", nothing, goals, RecipeRecommendations_noFilters);
    expect(a.items.map((i) => i.recipe.id)).to.deep.equal(b.items.map((i) => i.recipe.id));
  });

  it("covers every catalog recipe when nothing is filtered", () => {
    expect(ids()).to.have.length(RecipeCatalog_all().length);
  });
});

describe("RecipeRecommendations chips", () => {
  it("toggles a chip on and off", () => {
    const vegan = RecipeRecommendations_chips.find((c) => c.value === "vegan")!;
    const on = RecipeRecommendations_toggleChip(RecipeRecommendations_noFilters, vegan);
    expect(RecipeRecommendations_chipIsOn(on, vegan)).to.equal(true);
    expect(RecipeRecommendations_hasFilters(on)).to.equal(true);
    const off = RecipeRecommendations_toggleChip(on, vegan);
    expect(RecipeRecommendations_chipIsOn(off, vegan)).to.equal(false);
    expect(RecipeRecommendations_hasFilters(off)).to.equal(false);
  });

  it("sets and clears the time limit", () => {
    const quick = RecipeRecommendations_chips.find((c) => c.kind === "time")!;
    const on = RecipeRecommendations_toggleChip(RecipeRecommendations_noFilters, quick);
    expect(on.maxMinutes).to.equal(30);
    expect(RecipeRecommendations_toggleChip(on, quick).maxMinutes).to.equal(undefined);
  });
});
