import "mocha";
import { expect } from "chai";
import {
  FoodAiEstimate_canSend,
  FoodAiEstimate_hasChoices,
  FoodAiEstimate_initial,
  FoodAiEstimate_reduce,
  FoodAiEstimate_request,
  IFoodAiEvent,
  IFoodAiState,
} from "../src/models/foodAiEstimate";

const eggs = { name: "Egg", grams: 100, nutrients: { calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5 } };
const photo = "data:image/jpeg;base64,YWJj";

function run(events: IFoodAiEvent[], from = FoodAiEstimate_initial()): IFoodAiState {
  return events.reduce(FoodAiEstimate_reduce, from);
}

describe("FoodAiEstimate sending", () => {
  it("starts empty and cannot send", () => {
    const state = FoodAiEstimate_initial();
    expect(state).to.deep.equal({ text: "", isSending: false });
    expect(FoodAiEstimate_canSend(state)).to.equal(false);
    expect(FoodAiEstimate_request(state)).to.equal(undefined);
  });

  it("sends text alone as a describe request, trimmed", () => {
    const state = run([{ type: "typed", text: "  two eggs  " }]);
    expect(FoodAiEstimate_canSend(state)).to.equal(true);
    expect(FoodAiEstimate_request(state)).to.deep.equal({ kind: "describe", text: "two eggs" });
  });

  it("sends a photo alone as a photo request with an empty note", () => {
    const state = run([{ type: "picked", result: { kind: "photo", dataUrl: photo } }]);
    expect(FoodAiEstimate_canSend(state)).to.equal(true);
    expect(FoodAiEstimate_request(state)).to.deep.equal({ kind: "photo", photo, text: "" });
  });

  it("sends a photo with the text as the note when both are there", () => {
    const state = run([
      { type: "typed", text: "half the rice was left" },
      { type: "picked", result: { kind: "photo", dataUrl: photo } },
    ]);
    expect(FoodAiEstimate_request(state)).to.deep.equal({ kind: "photo", photo, text: "half the rice was left" });
  });

  it("cannot send blank text, or while a request is in flight", () => {
    expect(FoodAiEstimate_canSend(run([{ type: "typed", text: "   " }]))).to.equal(false);
    expect(FoodAiEstimate_canSend(run([{ type: "typed", text: "eggs" }, { type: "sent" }]))).to.equal(false);
    expect(
      FoodAiEstimate_canSend(run([{ type: "picked", result: { kind: "photo", dataUrl: photo } }, { type: "sent" }]))
    ).to.equal(false);
  });

  it("falls back to a text request after the photo is removed", () => {
    const state = run([
      { type: "typed", text: "eggs" },
      { type: "picked", result: { kind: "photo", dataUrl: photo } },
      { type: "photoRemoved" },
    ]);
    expect(state.photo).to.equal(undefined);
    expect(FoodAiEstimate_request(state)).to.deep.equal({ kind: "describe", text: "eggs" });
    expect(FoodAiEstimate_canSend(run([{ type: "photoRemoved" }]))).to.equal(false);
  });
});

describe("FoodAiEstimate photo", () => {
  it("keeps the typed text when a photo is attached", () => {
    const state = run([
      { type: "typed", text: "chicken and rice" },
      { type: "picked", result: { kind: "photo", dataUrl: photo } },
    ]);
    expect(state.text).to.equal("chicken and rice");
    expect(state.photo).to.equal(photo);
  });

  it("ignores a cancelled pick and shows the error of a failed one without losing the photo", () => {
    const withPhoto = run([{ type: "picked", result: { kind: "photo", dataUrl: photo } }]);
    expect(FoodAiEstimate_reduce(withPhoto, { type: "picked", result: { kind: "cancelled" } })).to.equal(withPhoto);
    const failed = FoodAiEstimate_reduce(withPhoto, { type: "picked", result: { kind: "error", error: "No access" } });
    expect(failed.error).to.equal("No access");
    expect(failed.photo).to.equal(photo);
  });

  it("drops an old estimate when the photo changes, because it described another plate", () => {
    const estimated = run([
      { type: "typed", text: "eggs" },
      { type: "estimated", estimate: { items: [eggs], note: "Old" } },
    ]);
    const replaced = FoodAiEstimate_reduce(estimated, { type: "picked", result: { kind: "photo", dataUrl: photo } });
    expect(replaced.choices).to.equal(undefined);
    expect(replaced.note).to.equal(undefined);
    expect(replaced.text).to.equal("eggs");
    const removed = FoodAiEstimate_reduce(estimated, { type: "photoRemoved" });
    expect(removed.choices).to.equal(undefined);
  });
});

describe("FoodAiEstimate answers", () => {
  it("clears the old error and auth error when a send starts", () => {
    const failed = run([{ type: "typed", text: "eggs" }, { type: "sent" }, { type: "failed", error: "Offline" }]);
    const again = FoodAiEstimate_reduce(failed, { type: "sent" });
    expect(again.isSending).to.equal(true);
    expect(again.error).to.equal(undefined);
    expect(again.authError).to.equal(undefined);
  });

  it("stops sending and shows the auth error when signed out", () => {
    const state = run([{ type: "sent" }, { type: "signedOut", error: "Sign in first" }]);
    expect(state.isSending).to.equal(false);
    expect(state.authError).to.equal("Sign in first");
  });

  it("turns an estimate into selected choices and keeps the note, the text and the photo", () => {
    const state = run([
      { type: "typed", text: "eggs" },
      { type: "picked", result: { kind: "photo", dataUrl: photo } },
      { type: "sent" },
      { type: "estimated", estimate: { items: [eggs], note: "Guessed sizes" } },
    ]);
    expect(state.isSending).to.equal(false);
    expect(state.note).to.equal("Guessed sizes");
    expect(state.choices).to.deep.equal([{ ...eggs, isSelected: true }]);
    expect(state.photo).to.equal(photo);
    expect(state.text).to.equal("eggs");
    expect(FoodAiEstimate_hasChoices(state)).to.equal(true);
  });

  it("reports no choices for an estimate with no items", () => {
    const state = run([{ type: "estimated", estimate: { items: [], note: "Nothing found" } }]);
    expect(state.choices).to.deep.equal([]);
    expect(FoodAiEstimate_hasChoices(state)).to.equal(false);
  });

  it("drops old choices and note when the next send fails, and keeps the photo for a retry", () => {
    const state = run([
      { type: "picked", result: { kind: "photo", dataUrl: photo } },
      { type: "estimated", estimate: { items: [eggs], note: "Old" } },
      { type: "sent" },
      { type: "failed", error: "Try another photo." },
    ]);
    expect(state.error).to.equal("Try another photo.");
    expect(state.choices).to.equal(undefined);
    expect(state.note).to.equal(undefined);
    expect(state.photo).to.equal(photo);
  });

  it("keeps the choices the user edits", () => {
    const estimated = run([{ type: "estimated", estimate: { items: [eggs] } }]);
    const unticked = [{ ...eggs, isSelected: false }];
    expect(FoodAiEstimate_reduce(estimated, { type: "choicesChanged", choices: unticked }).choices).to.equal(unticked);
  });

  it("resets the text and the photo after the choices are added", () => {
    const state = run([
      { type: "typed", text: "two eggs" },
      { type: "picked", result: { kind: "photo", dataUrl: photo } },
      { type: "estimated", estimate: { items: [eggs] } },
      { type: "added" },
    ]);
    expect(state).to.deep.equal(FoodAiEstimate_initial());
  });
});

describe("FoodAiEstimate resume", () => {
  const choices = [{ ...eggs, isSelected: true }] as unknown as NonNullable<IFoodAiState["choices"]>;

  it("starts from the kept text, photo and estimate after Back from Serving size", () => {
    const state = FoodAiEstimate_initial({ choices, text: "two eggs", photo });
    expect(state).to.deep.equal({ text: "two eggs", isSending: false, choices, photo });
    expect(FoodAiEstimate_hasChoices(state)).to.equal(true);
  });

  it("starts with empty text and no photo when the kept scan had none", () => {
    expect(FoodAiEstimate_initial({ choices })).to.deep.equal({ text: "", isSending: false, choices });
  });
});
