import { RecipeCatalog_all, RecipeCatalog_perServing } from "../src/models/recipeCatalog";

// Usage: npx ts-node scripts/checkRecipeCatalog.ts
// Prints the ingredient estimate next to the book's printed numbers for every catalog recipe.
for (const recipe of RecipeCatalog_all()) {
  const estimate = RecipeCatalog_perServing(recipe);
  const printed = recipe.printedPerServing;
  console.log(recipe.title);
  for (const key of ["calories", "protein", "carbs", "fat"] as const) {
    const diff = estimate[key] - printed[key];
    console.log(
      `  ${key}: estimate ${estimate[key]}, printed ${printed[key]}, difference ${Math.round(diff * 10) / 10}`
    );
  }
}
