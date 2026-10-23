import "mocha";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import {
  RecipeCatalog_all,
  RecipeCatalog_find,
  RecipeCatalog_isSaved,
  RecipeCatalog_parseServings,
  RecipeCatalog_perServing,
  RecipeCatalog_servingPick,
  RecipeCatalog_servingsLabel,
  RecipeCatalog_sourceLine,
  RecipeCatalog_tags,
  RecipeCatalog_toUserRecipe,
} from "../src/models/recipeCatalog";
import { Recipes_perServing, Recipes_servingPick } from "../src/models/savedMeals";
import { FoodLog_empty, FoodLog_parse, FoodLog_saveRecipe, IFoodRecipe } from "../src/models/foodLog";

const root = path.join(__dirname, "..");

describe("RecipeCatalog data", () => {
  it("has five distinct recipes with complete details", () => {
    const recipes = RecipeCatalog_all();
    expect(recipes).to.have.length(5);
    expect(new Set(recipes.map((r) => r.id)).size).to.equal(5);
    for (const r of recipes) {
      expect(r.servings, r.id).to.be.greaterThan(0);
      expect(r.prepMinutes + r.cookMinutes, r.id).to.be.at.most(r.totalMinutes);
      expect(r.ingredients.length, r.id).to.be.at.least(3);
      expect(r.steps.length, r.id).to.be.at.least(3);
      expect(r.equipment, r.id).to.include("instantPot");
      expect(r.source.pdfPages.length, r.id).to.be.at.least(1);
      expect(r.meals.length, r.id).to.be.at.least(1);
    }
  });

  it("weighs every counted ingredient and names its reference food", () => {
    for (const r of RecipeCatalog_all()) {
      for (const i of r.ingredients) {
        expect(i.grams == null, `${r.id}: ${i.text}`).to.equal(i.per100g == null);
        if (i.grams != null) {
          expect(i.basis, `${r.id}: ${i.text}`).to.be.a("string");
        }
      }
    }
  });

  it("ships a photo file for every recipe that names one", () => {
    for (const r of RecipeCatalog_all()) {
      if (r.photo != null) {
        expect(fs.existsSync(path.join(root, r.photo.path)), r.id).to.equal(true);
      }
    }
  });

  it("stays within 9% of the printed calories and 2 g of the printed protein, and flags gaps over 5%", () => {
    for (const r of RecipeCatalog_all()) {
      const estimate = RecipeCatalog_perServing(r);
      const gap = Math.abs(estimate.calories - r.printedPerServing.calories) / r.printedPerServing.calories;
      expect(gap, r.id).to.be.below(0.09);
      expect(Math.abs(estimate.protein - r.printedPerServing.protein), r.id).to.be.at.most(2);
      if (gap > 0.05) {
        expect(r.nutritionCheck, r.id).to.contain("Unresolved");
      }
    }
  });

  it("names the book and the PDF pages", () => {
    const line = RecipeCatalog_sourceLine(RecipeCatalog_find("ginger-beef-broccoli")!);
    expect(line).to.equal(
      "The Healthy Instant Pot Cookbook by Karen Lee Young (Rockridge Press, 2021), PDF pages 179-181"
    );
  });
});

describe("RecipeCatalog_tags", () => {
  it("keeps unknown allergens and diets apart from confirmed ones", () => {
    const tags = RecipeCatalog_tags(RecipeCatalog_find("florentine-egg-bites")!);
    expect(tags.contains).to.deep.equal(["Milk", "Egg"]);
    expect(tags.unknownAllergens).to.deep.equal(["Soy"]);
    expect(tags.diets).to.deep.equal(["Gluten-free"]);
    expect(tags.unknownDiets).to.deep.equal(["Vegetarian"]);
  });
});

describe("RecipeCatalog_toUserRecipe", () => {
  const chili = RecipeCatalog_find("sweet-potato-turkey-chili")!;

  it("gives the same per-serving numbers as the catalog", () => {
    expect(Recipes_perServing(RecipeCatalog_toUserRecipe(chili))).to.deep.equal(RecipeCatalog_perServing(chili));
  });

  it("leaves out grams, so summed raw weights never become a cooked serving weight", () => {
    const recipe = RecipeCatalog_toUserRecipe(chili);
    expect(recipe.ingredients.every((i) => i.grams == null)).to.equal(true);
    expect(Recipes_servingPick(recipe).fixed?.grams).to.equal(undefined);
  });

  it("uses a stable id, so saving twice keeps one copy", () => {
    let log = FoodLog_saveRecipe(FoodLog_empty(), RecipeCatalog_toUserRecipe(chili));
    log = FoodLog_saveRecipe(log, RecipeCatalog_toUserRecipe(chili));
    expect(log.recipes).to.have.length(1);
    expect(RecipeCatalog_isSaved(log.recipes, chili)).to.equal(true);
  });

  it("survives a save and reload next to an existing custom recipe", () => {
    const mine: IFoodRecipe = {
      id: "r1",
      name: "My oats",
      servings: 2,
      ingredients: [
        { name: "Oats", source: "search", grams: 80, nutrients: { calories: 300, protein: 10, carbs: 54, fat: 6 } },
      ],
    };
    const log = FoodLog_saveRecipe(FoodLog_saveRecipe(FoodLog_empty(), mine), RecipeCatalog_toUserRecipe(chili));
    const reloaded = FoodLog_parse(JSON.parse(JSON.stringify(log)));
    expect(reloaded.recipes.map((r) => r.id)).to.deep.equal(["catalog-sweet-potato-turkey-chili", "r1"]);
    expect(Recipes_perServing(reloaded.recipes[0])).to.deep.equal(RecipeCatalog_perServing(chili));
    expect(Recipes_servingPick(reloaded.recipes[1]).fixed?.grams).to.equal(40);
  });

  it("is not in a fresh food log until the user saves it", () => {
    expect(FoodLog_empty().recipes).to.have.length(0);
    expect(RecipeCatalog_isSaved(FoodLog_empty().recipes, chili)).to.equal(false);
  });
});

describe("RecipeCatalog_servingPick", () => {
  const bowls = RecipeCatalog_find("teriyaki-chicken-rice-bowls")!;

  it("logs one serving's nutrients for one serving", () => {
    expect(RecipeCatalog_servingPick(bowls, 1).fixed?.nutrients).to.deep.equal(RecipeCatalog_perServing(bowls));
  });

  it("logs half for half a serving without changing the catalog entry", () => {
    const before = JSON.stringify(bowls);
    const one = RecipeCatalog_servingPick(bowls, 1).fixed!.nutrients;
    const half = RecipeCatalog_servingPick(bowls, 0.5).fixed!.nutrients;
    expect(half.calories).to.be.closeTo(one.calories / 2, 0.5);
    expect(half.protein).to.be.closeTo(one.protein / 2, 0.1);
    expect(JSON.stringify(bowls)).to.equal(before);
  });

  it("has no grams and names the serving count", () => {
    const pick = RecipeCatalog_servingPick(bowls, 1.5);
    expect(pick.fixed?.grams).to.equal(undefined);
    expect(pick.brand).to.equal("Recipe · 1.5 servings");
  });
});

describe("RecipeCatalog servings text", () => {
  it("reads decimals with a dot or a comma", () => {
    expect(RecipeCatalog_parseServings("1.5")).to.equal(1.5);
    expect(RecipeCatalog_parseServings("0,5")).to.equal(0.5);
  });

  it("rejects zero, negatives, text and silly amounts", () => {
    expect(RecipeCatalog_parseServings("0")).to.equal(undefined);
    expect(RecipeCatalog_parseServings("-1")).to.equal(undefined);
    expect(RecipeCatalog_parseServings("abc")).to.equal(undefined);
    expect(RecipeCatalog_parseServings("50")).to.equal(undefined);
  });

  it("labels one serving and several", () => {
    expect(RecipeCatalog_servingsLabel(1)).to.equal("1 serving");
    expect(RecipeCatalog_servingsLabel(0.5)).to.equal("0.5 servings");
  });
});
