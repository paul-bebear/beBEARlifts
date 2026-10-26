import "mocha";
import { expect } from "chai";
import {
  FoodScanSteps_canAdd,
  FoodScanSteps_canLeave,
  FoodScanSteps_description,
  FoodScanSteps_entries,
  FoodScanSteps_initial,
  FoodScanSteps_modes,
  FoodScanSteps_reduce,
  FoodScanSteps_title,
  FoodScanSteps_totals,
  IScanEvent,
  IScanServing,
  IScanStep,
} from "../src/models/foodScanSteps";
import { FoodAddFlow_pickFromProduct, FoodAddFlow_photoChoices } from "../src/models/foodAddFlow";

const nutella = FoodAddFlow_pickFromProduct(
  {
    barcode: "3017624010701",
    name: "Nutella",
    brand: "Ferrero",
    per100g: { calories: 539, protein: 6.3, carbs: 57.5, fat: 30.9 },
    servingGrams: 15,
  },
  "barcode"
);

const plate = FoodAddFlow_photoChoices([
  { name: "Rice", grams: 150, nutrients: { calories: 195, protein: 4, carbs: 42, fat: 0.4 } },
  { name: "Chicken", grams: 100, nutrients: { calories: 165, protein: 31, carbs: 0, fat: 3.6 } },
]);

const nutellaCode = nutella.barcode as string;
const scanNutella: IScanEvent[] = [
  { type: "barcodeRead", code: nutellaCode },
  { type: "barcodeFound", code: nutellaCode, pick: nutella },
];

function run(events: IScanEvent[], from: IScanStep = FoodScanSteps_initial(undefined, true)): IScanStep {
  return events.reduce(FoodScanSteps_reduce, from);
}

function servingOf(step: IScanStep): IScanServing {
  if (step.kind !== "serving") {
    throw new Error(`Expected serving, got ${step.kind}`);
  }
  return step.serving;
}

function idCounter(): () => string {
  let n = 0;
  return () => {
    n += 1;
    return `id${n}`;
  };
}

const where = { day: "2026-10-22", meal: "lunch" as const };

describe("FoodScanSteps start", () => {
  it("opens on the barcode camera by default", () => {
    expect(FoodScanSteps_initial(undefined, true)).to.deep.equal({ kind: "camera", mode: "barcode" });
  });

  it("opens AI scan for photo when AI is on, and Describe for describe either way", () => {
    expect(FoodScanSteps_initial("photo", true)).to.deep.equal({ kind: "camera", mode: "ai" });
    expect(FoodScanSteps_initial("photo", false)).to.deep.equal({ kind: "camera", mode: "describe" });
    expect(FoodScanSteps_initial("describe", true)).to.deep.equal({ kind: "camera", mode: "describe" });
    expect(FoodScanSteps_initial("describe", false)).to.deep.equal({ kind: "camera", mode: "describe" });
  });

  it("opens quick log directly", () => {
    expect(FoodScanSteps_initial("quick", true)).to.deep.equal({ kind: "quick" });
  });

  it("reads Barcode, AI scan and Describe with AI, Barcode and Describe without", () => {
    expect(FoodScanSteps_modes(true)).to.deep.equal(["barcode", "ai", "describe"]);
    expect(FoodScanSteps_modes(false)).to.deep.equal(["barcode", "describe"]);
  });

  it("leaves the screen only from the camera", () => {
    expect(FoodScanSteps_canLeave({ kind: "camera", mode: "barcode" })).to.equal(true);
    expect(FoodScanSteps_canLeave({ kind: "browse" })).to.equal(false);
    expect(FoodScanSteps_canLeave(run(scanNutella))).to.equal(false);
  });
});

describe("FoodScanSteps camera to serving", () => {
  it("switches the toggle", () => {
    expect(run([{ type: "modePicked", mode: "ai" }])).to.deep.equal({ kind: "camera", mode: "ai" });
  });

  it("reads a barcode, then shows one item at its serving size", () => {
    const reading = run([{ type: "barcodeRead", code: "3017624010701" }]);
    expect(reading).to.deep.equal({ kind: "reading", code: "3017624010701" });
    const serving = servingOf(
      FoodScanSteps_reduce(reading, { type: "barcodeFound", code: "3017624010701", pick: nutella })
    );
    expect(serving.mode).to.equal("barcode");
    expect(serving.items.map((i) => [i.pick.name, i.grams])).to.deep.equal([["Nutella", 15]]);
    expect(FoodScanSteps_description(serving)).to.equal("Nutella");
  });

  it("keeps the code and error when the product is missing", () => {
    const step = run([
      { type: "barcodeRead", code: "1" },
      { type: "barcodeMissed", code: "1", error: "Offline" },
    ]);
    expect(step).to.deep.equal({ kind: "notFound", code: "1", error: "Offline" });
  });

  it("ignores a late answer for a code the screen is no longer reading", () => {
    const reading222 = run([
      { type: "barcodeRead", code: "111" },
      { type: "back" },
      { type: "barcodeRead", code: "222" },
    ]);
    expect(FoodScanSteps_reduce(reading222, { type: "barcodeFound", code: "111", pick: nutella })).to.equal(reading222);
    expect(FoodScanSteps_reduce(reading222, { type: "barcodeMissed", code: "111" })).to.equal(reading222);
  });

  it("ignores a barcode answer that arrives after the user went back to the camera", () => {
    const camera = run([{ type: "barcodeRead", code: "111" }, { type: "back" }]);
    expect(FoodScanSteps_reduce(camera, { type: "barcodeFound", code: "111", pick: nutella })).to.equal(camera);
    expect(FoodScanSteps_reduce(camera, { type: "barcodeMissed", code: "111" })).to.equal(camera);
  });

  it("does not replace a serving the user is editing with a late barcode answer", () => {
    const serving = run(scanNutella);
    expect(FoodScanSteps_reduce(serving, { type: "barcodeFound", code: nutellaCode, pick: nutella })).to.equal(serving);
  });

  it("turns a reviewed photo into serving items, one per choice", () => {
    const serving = servingOf(run([{ type: "photoReviewed", choices: plate, nonce: 7 }]));
    expect(serving.mode).to.equal("ai");
    expect(serving.items.map((i) => i.key)).to.deep.equal(["ai|7|0", "ai|7|1"]);
    expect(FoodScanSteps_description(serving)).to.equal("Rice, Chicken");
    expect(FoodScanSteps_totals(serving).calories).to.equal(360);
  });

  it("skips choices the user unticked", () => {
    const choices = plate.map((c, i) => ({ ...c, isSelected: i === 1 }));
    const serving = servingOf(run([{ type: "photoReviewed", choices, nonce: 1 }]));
    expect(serving.items.map((i) => i.pick.name)).to.deep.equal(["Chicken"]);
  });

  it("turns a described meal into manual serving items and goes back to Describe", () => {
    const serving = servingOf(run([{ type: "describeReviewed", choices: plate, nonce: 3 }]));
    expect(serving.mode).to.equal("describe");
    expect(serving.items.map((i) => i.pick.source)).to.deep.equal(["manual", "manual"]);
    expect(FoodScanSteps_description(serving)).to.equal("Rice, Chicken");
    const back = run([
      { type: "describeReviewed", choices: plate, nonce: 3, text: "rice and chicken" },
      { type: "back" },
    ]);
    expect(back).to.deep.equal({
      kind: "camera",
      mode: "describe",
      resume: { choices: plate, text: "rice and chicken" },
    });
  });

  it("puts a typed quick entry on the serving step without a grams field", () => {
    const serving = servingOf(
      run([{ type: "quickEntered", name: "Protein bar", nutrients: { calories: 200, protein: 20, carbs: 20, fat: 6 } }])
    );
    expect(serving.mode).to.equal("describe");
    expect(serving.items[0].grams).to.equal(0);
    expect(FoodScanSteps_description(serving)).to.equal("Protein bar");
  });

  it("goes back from serving, notFound and reading to the camera in the same mode", () => {
    const afterPhoto = run([{ type: "photoReviewed", choices: plate, nonce: 1 }, { type: "back" }]);
    expect(afterPhoto).to.deep.equal({ kind: "camera", mode: "ai", resume: { choices: plate, photo: undefined } });
    expect(run([...scanNutella, { type: "back" }])).to.deep.equal({ kind: "camera", mode: "barcode" });
    expect(run([{ type: "barcodeMissed", code: "1" }, { type: "back" }])).to.deep.equal({
      kind: "camera",
      mode: "barcode",
    });
    expect(run([{ type: "barcodeRead", code: "1" }, { type: "back" }])).to.deep.equal({
      kind: "camera",
      mode: "barcode",
    });
  });

  it("keeps the scanned items and photo in the camera step when Back leaves Serving size", () => {
    const back = run([
      { type: "photoReviewed", choices: plate, nonce: 1, photo: "data:image/jpeg;base64,x" },
      { type: "back" },
    ]);
    expect(back).to.deep.equal({
      kind: "camera",
      mode: "ai",
      resume: { choices: plate, photo: "data:image/jpeg;base64,x" },
    });
  });

  it("drops the kept scan when the user picks a mode again", () => {
    const back = run([{ type: "photoReviewed", choices: plate, nonce: 1 }, { type: "back" }]);
    expect(FoodScanSteps_reduce(back, { type: "modePicked", mode: "ai" })).to.deep.equal({
      kind: "camera",
      mode: "ai",
    });
  });

  it("stays on the camera when back is pressed there", () => {
    expect(run([{ type: "back" }])).to.deep.equal({ kind: "camera", mode: "barcode" });
  });
});

describe("FoodScanSteps serving edits", () => {
  const start = (): IScanStep => run([{ type: "photoReviewed", choices: plate, nonce: 1 }]);

  it("changes the grams of one item", () => {
    const serving = servingOf(FoodScanSteps_reduce(start(), { type: "gramsChanged", key: "ai|1|0", grams: 300 }));
    expect(serving.items[0].grams).to.equal(300);
    expect(serving.items[1].grams).to.equal(100);
  });

  it("ignores edits when it is not on the serving step", () => {
    const step: IScanStep = { kind: "camera", mode: "barcode" };
    expect(FoodScanSteps_reduce(step, { type: "gramsChanged", key: "x", grams: 5 })).to.equal(step);
  });

  it("removes an item and updates the default description", () => {
    const serving = servingOf(FoodScanSteps_reduce(start(), { type: "itemRemoved", key: "ai|1|0" }));
    expect(FoodScanSteps_description(serving)).to.equal("Chicken");
  });

  it("keeps an edited description when items change", () => {
    const edited = FoodScanSteps_reduce(start(), { type: "descriptionChanged", text: "Chicken rice bowl" });
    const serving = servingOf(FoodScanSteps_reduce(edited, { type: "itemRemoved", key: "ai|1|0" }));
    expect(FoodScanSteps_description(serving)).to.equal("Chicken rice bowl");
  });

  it("cannot add with no items or a blank description", () => {
    const emptied = servingOf(
      run(
        [
          { type: "itemRemoved", key: "ai|1|0" },
          { type: "itemRemoved", key: "ai|1|1" },
        ],
        start()
      )
    );
    expect(FoodScanSteps_canAdd(emptied)).to.equal(false);
    const blank = servingOf(FoodScanSteps_reduce(start(), { type: "descriptionChanged", text: "  " }));
    expect(FoodScanSteps_canAdd(blank)).to.equal(false);
    expect(FoodScanSteps_canAdd(servingOf(start()))).to.equal(true);
  });
});

describe("FoodScanSteps_entries", () => {
  it("logs one entry per item when the description is untouched", () => {
    const serving = servingOf(run([{ type: "photoReviewed", choices: plate, nonce: 1 }]));
    const entries = FoodScanSteps_entries(serving, where, idCounter(), 5);
    expect(entries.map((e) => [e.id, e.name, e.meal, e.day, e.grams])).to.deep.equal([
      ["id1", "Rice", "lunch", "2026-10-22", 150],
      ["id2", "Chicken", "lunch", "2026-10-22", 100],
    ]);
  });

  it("names a single item by the edited description and keeps its barcode and per-100g values", () => {
    const step = run([
      ...scanNutella,
      { type: "gramsChanged", key: nutella.barcode as string, grams: 30 },
      { type: "descriptionChanged", text: "Hazelnut spread on toast" },
    ]);
    const [entry] = FoodScanSteps_entries(servingOf(step), where, idCounter(), 5);
    expect(entry.name).to.equal("Hazelnut spread on toast");
    expect(entry.barcode).to.equal("3017624010701");
    expect(entry.grams).to.equal(30);
    expect(entry.nutrients.calories).to.equal(162);
    expect(entry.per100g).to.deep.equal(nutella.per100g);
  });

  it("merges several items into one entry when the user edits the description", () => {
    const step = run([
      { type: "photoReviewed", choices: plate, nonce: 1 },
      { type: "descriptionChanged", text: "Chicken and rice" },
    ]);
    const entries = FoodScanSteps_entries(servingOf(step), where, idCounter(), 5);
    expect(entries).to.have.length(1);
    expect(entries[0].name).to.equal("Chicken and rice");
    expect(entries[0].grams).to.equal(250);
    expect(entries[0].nutrients.calories).to.equal(360);
    expect(entries[0].source).to.equal("photo");
  });

  it("logs nothing when every item was removed", () => {
    const step = run([{ type: "photoReviewed", choices: [], nonce: 1 }]);
    expect(FoodScanSteps_entries(servingOf(step), where, idCounter(), 5)).to.deep.equal([]);
  });
});

describe("FoodScanSteps_title", () => {
  it("names each camera mode and the serving step", () => {
    expect(FoodScanSteps_title({ kind: "camera", mode: "ai" })).to.equal("AI Scan");
    expect(FoodScanSteps_title({ kind: "camera", mode: "describe" })).to.equal("Describe");
    expect(FoodScanSteps_title(run(scanNutella))).to.equal("Serving size");
    expect(FoodScanSteps_title({ kind: "browse" })).to.equal(undefined);
  });
});

describe("FoodScanSteps cookbook recipe", () => {
  it("opens a recipe from browse and goes back to browse", () => {
    const step = run([{ type: "browseOpened" }, { type: "catalogRecipeOpened", recipeId: "ginger-beef-broccoli" }]);
    expect(step).to.deep.equal({ kind: "catalogRecipe", recipeId: "ginger-beef-broccoli" });
    expect(FoodScanSteps_title(step)).to.equal("Recipe");
    expect(FoodScanSteps_canLeave(step)).to.equal(false);
    expect(FoodScanSteps_reduce(step, { type: "back" })).to.deep.equal({ kind: "browse" });
  });
});
