import "mocha";
import { expect } from "chai";
import {
  FoodDescribeEstimate_canSend,
  FoodDescribeEstimate_entries,
  FoodDescribeEstimate_hasChoices,
  FoodDescribeEstimate_initial,
  FoodDescribeEstimate_reduce,
  IFoodDescribeEvent,
  IFoodDescribeState,
} from "../src/models/foodDescribeEstimate";

const eggs = { name: "Egg", grams: 100, nutrients: { calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5 } };

function run(events: IFoodDescribeEvent[], from = FoodDescribeEstimate_initial()): IFoodDescribeState {
  return events.reduce(FoodDescribeEstimate_reduce, from);
}

describe("FoodDescribeEstimate", () => {
  it("starts empty and cannot send", () => {
    const state = FoodDescribeEstimate_initial();
    expect(state).to.deep.equal({ text: "", isLoading: false });
    expect(FoodDescribeEstimate_canSend(state)).to.equal(false);
  });

  it("cannot send blank text or while loading", () => {
    expect(FoodDescribeEstimate_canSend(run([{ type: "typed", text: "   " }]))).to.equal(false);
    expect(FoodDescribeEstimate_canSend(run([{ type: "typed", text: "eggs" }]))).to.equal(true);
    expect(FoodDescribeEstimate_canSend(run([{ type: "typed", text: "eggs" }, { type: "sent" }]))).to.equal(false);
  });

  it("clears the old error and auth error when a send starts", () => {
    const failed = run([{ type: "typed", text: "eggs" }, { type: "sent" }, { type: "failed", error: "Offline" }]);
    const again = FoodDescribeEstimate_reduce(failed, { type: "sent" });
    expect(again.isLoading).to.equal(true);
    expect(again.error).to.equal(undefined);
    expect(again.authError).to.equal(undefined);
  });

  it("stops loading and shows the auth error when signed out", () => {
    const state = run([{ type: "sent" }, { type: "signedOut", error: "Sign in first" }]);
    expect(state.isLoading).to.equal(false);
    expect(state.authError).to.equal("Sign in first");
  });

  it("turns an estimate into selected choices and keeps the note", () => {
    const state = run([{ type: "sent" }, { type: "estimated", estimate: { items: [eggs], note: "Guessed sizes" } }]);
    expect(state.isLoading).to.equal(false);
    expect(state.note).to.equal("Guessed sizes");
    expect(state.choices).to.deep.equal([{ ...eggs, isSelected: true }]);
    expect(FoodDescribeEstimate_hasChoices(state)).to.equal(true);
  });

  it("reports no choices for an estimate with no items", () => {
    const state = run([{ type: "estimated", estimate: { items: [], note: "Nothing found" } }]);
    expect(state.choices).to.deep.equal([]);
    expect(FoodDescribeEstimate_hasChoices(state)).to.equal(false);
  });

  it("drops old choices and note when the next send fails", () => {
    const state = run([
      { type: "estimated", estimate: { items: [eggs], note: "Old" } },
      { type: "sent" },
      { type: "failed", error: "Try different words." },
    ]);
    expect(state.error).to.equal("Try different words.");
    expect(state.choices).to.equal(undefined);
    expect(state.note).to.equal(undefined);
  });

  it("keeps the choices the user edits", () => {
    const estimated = run([{ type: "estimated", estimate: { items: [eggs] } }]);
    const unticked = [{ ...eggs, isSelected: false }];
    expect(FoodDescribeEstimate_reduce(estimated, { type: "choicesChanged", choices: unticked }).choices).to.equal(
      unticked
    );
  });

  it("resets the box after the choices are added", () => {
    const state = run([
      { type: "typed", text: "two eggs" },
      { type: "estimated", estimate: { items: [eggs] } },
      { type: "added" },
    ]);
    expect(state).to.deep.equal(FoodDescribeEstimate_initial());
  });
});

describe("FoodDescribeEstimate_entries", () => {
  const toast = { name: "Toast", grams: 30, nutrients: { calories: 80, protein: 3, carbs: 15, fat: 1 } };
  const ids = ["a", "b"];

  it("makes one manual entry per ticked choice under the given meal", () => {
    const choices = [
      { ...eggs, isSelected: true },
      { ...toast, isSelected: false },
      { ...toast, name: "Rye toast", isSelected: true },
    ];
    const entries = FoodDescribeEstimate_entries(
      choices,
      { day: "2026-10-22", meal: "breakfast" },
      () => ids.shift() as string,
      9
    );
    expect(entries.map((e) => [e.id, e.name, e.meal, e.source, e.grams, e.nutrients.calories])).to.deep.equal([
      ["a", "Egg", "breakfast", "manual", 100, 143],
      ["b", "Rye toast", "breakfast", "manual", 30, 80],
    ]);
  });
});
