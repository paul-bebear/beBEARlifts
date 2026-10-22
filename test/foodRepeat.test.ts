import "mocha";
import { expect } from "chai";
import { FoodLog_dayKey, FoodLog_empty, IFoodEntry } from "../src/models/foodLog";
import {
  FoodRepeat_begin,
  FoodRepeat_copy,
  FoodRepeat_details,
  FoodRepeat_fallback,
  FoodRepeat_groups,
  FoodRepeat_initial,
  FoodRepeat_offer,
  FoodRepeat_retry,
  FoodRepeat_selected,
  FoodRepeat_toggle,
} from "../src/models/foodRepeat";

function entry(id: string, overrides: Partial<IFoodEntry> = {}): IFoodEntry {
  return {
    id,
    day: "2026-10-21",
    meal: "breakfast",
    name: "Protein coffee",
    grams: 250,
    source: "manual",
    nutrients: { calories: 150, protein: 25, carbs: 8, fat: 2 },
    createdAt: 1,
    ...overrides,
  };
}

describe("FoodRepeat", () => {
  const today = "2026-10-22";
  const now = new Date(2026, 9, 22, 10, 30).getTime();
  const initial = FoodRepeat_initial(today);

  it("opens yesterday with nothing selected", () => {
    expect(initial).to.deep.equal({ day: "2026-10-21", selected: [], isSaving: false });
    expect(FoodRepeat_initial("2027-01-01").day).to.equal("2026-12-31");
  });

  it("groups only the source day's entries in meal order", () => {
    const log = {
      ...FoodLog_empty(),
      entries: [entry("d", { meal: "dinner" }), entry("b"), entry("t", { day: today })],
    };
    expect(
      FoodRepeat_groups(log, initial.day).map((group) => [group.meal, group.entries.map((e) => e.id)])
    ).to.deep.equal([
      ["breakfast", ["b"]],
      ["dinner", ["d"]],
    ]);
  });

  it("toggles duplicate foods separately and removes deselected entries", () => {
    const selected = FoodRepeat_toggle(FoodRepeat_toggle(initial, "a"), "b");
    expect(FoodRepeat_toggle(selected, "a").selected).to.deep.equal(["b"]);
    expect(initial.selected).to.deep.equal([]);
  });

  it("ignores selection changes during saving", () => {
    const saving = { ...initial, isSaving: true };
    expect(FoodRepeat_toggle(saving, "a")).to.equal(saving);
  });

  it("prevents empty submissions and duplicate saves, and allows retry after failure", () => {
    const log = { ...FoodLog_empty(), entries: [entry("a")] };
    expect(FoodRepeat_begin(log, initial)).to.equal(undefined);
    const selected = FoodRepeat_toggle(initial, "a");
    const saving = FoodRepeat_begin(log, selected)!;
    expect(saving.isSaving).to.equal(true);
    expect(FoodRepeat_begin(log, saving)).to.equal(undefined);
    expect(FoodRepeat_retry(saving)).to.deep.equal(selected);
  });

  it("offers the closest day with food when yesterday is empty", () => {
    const log = {
      ...FoodLog_empty(),
      entries: [entry("older", { day: "2026-10-17" }), entry("recent", { day: "2026-10-20" })],
    };
    expect(FoodRepeat_fallback(log, today)).to.equal("2026-10-20");
    expect(FoodRepeat_offer("2026-10-20")).to.equal("Nothing yesterday. Show Tuesday?");
  });

  it("includes seven days ago and excludes eight days ago and today", () => {
    const log = { ...FoodLog_empty(), entries: [entry("old", { day: "2026-10-15" })] };
    expect(FoodRepeat_fallback(log, today)).to.equal("2026-10-15");
    log.entries = [entry("older", { day: "2026-10-14" }), entry("today", { day: today })];
    expect(FoodRepeat_fallback(log, today)).to.equal(undefined);
    expect(FoodRepeat_fallback(FoodLog_empty(), today)).to.equal(undefined);
  });

  it("does not offer another day when yesterday has food", () => {
    const log = { ...FoodLog_empty(), entries: [entry("a"), entry("b", { day: "2026-10-20" })] };
    expect(FoodRepeat_fallback(log, today)).to.equal(undefined);
  });

  it("shows the amount and kcal, with a serving when grams are absent", () => {
    expect(FoodRepeat_details(entry("a"))).to.equal("250 g · 150 kcal");
    expect(FoodRepeat_details(entry("a", { grams: undefined }))).to.equal("1 serving · 150 kcal");
  });

  it("copies only selected source entries with new ids and today's time", () => {
    const log = {
      ...FoodLog_empty(),
      entries: [entry("a"), entry("b", { meal: "lunch" }), entry("c", { meal: "dinner" })],
    };
    let nextId = 0;
    const result = FoodRepeat_copy(log, { ...initial, selected: ["a", "c", "missing", "a"] }, now, () => {
      nextId += 1;
      return `new${nextId}`;
    });
    expect(result.entries.slice(3).map((e) => [e.id, e.day, e.meal, e.createdAt])).to.deep.equal([
      ["new1", FoodLog_dayKey(new Date(now)), "breakfast", now],
      ["new2", today, "dinner", now],
    ]);
    expect(log.entries).to.have.length(3);
    expect(result.recents).to.have.length(1);
  });

  it("puts every selected entry into an explicit destination meal", () => {
    const log = { ...FoodLog_empty(), entries: [entry("a"), entry("b", { meal: "dinner" })] };
    let nextId = 0;
    const result = FoodRepeat_copy(
      log,
      { ...initial, selected: ["a", "b"] },
      now,
      () => "new" + (nextId += 1),
      "snacks"
    );
    expect(result.entries.slice(2).map((e) => e.meal)).to.deep.equal(["snacks", "snacks"]);
  });

  it("keeps copies independent while preserving food data", () => {
    const source = entry("a", {
      brand: "Brand",
      barcode: "123",
      per100g: { calories: 60, protein: 10, carbs: 3, fat: 1 },
    });
    const log = { ...FoodLog_empty(), entries: [source] };
    const copy = FoodRepeat_copy(log, { ...initial, selected: ["a"] }, now, () => "new").entries[1];
    expect(copy).to.deep.equal({ ...source, id: "new", day: today, createdAt: now });
    copy.nutrients.calories = 0;
    copy.per100g!.calories = 0;
    expect(source.nutrients.calories).to.equal(150);
    expect(source.per100g!.calories).to.equal(60);
  });

  it("ignores deleted entries and selections from other days", () => {
    const log = { ...FoodLog_empty(), entries: [entry("a", { day: today })] };
    const state = { ...initial, selected: ["a", "deleted"] };
    expect(FoodRepeat_selected(log, state)).to.deep.equal([]);
    expect(FoodRepeat_copy(log, state, now, () => "unused").entries).to.deep.equal(log.entries);
  });
});
