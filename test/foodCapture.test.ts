import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import {
  FoodCapture_options,
  FoodCapture_photo,
  FoodLabel_empty,
  FoodLabel_reduce,
  FoodPhoto_empty,
  FoodPhoto_reduce,
} from "../src/models/foodCapture";
import { FoodCapture_meal, FoodCapture_label, IFoodCaptureDependencies } from "../src/utils/foodCaptureRequest";
import { NutritionLabel_toProduct } from "../src/models/nutritionLabel";

const nutrients = { calories: 100, protein: 5, carbs: 10, fat: 4 };
const estimate = { items: [{ name: "Rice", grams: 100, nutrients }], note: "Check portions" };
const photo = { assets: [{ type: "image/jpeg", base64: "YWJj" }] };

function dependencies(): IFoodCaptureDependencies {
  return {
    allow: sinon.stub().resolves(true),
    cameraPermission: sinon.stub().resolves(true),
    pick: sinon.stub().resolves(photo),
    estimate: sinon.stub().resolves({ ok: true, value: estimate }),
    readLabel: sinon.stub().resolves({ ok: true, value: { name: "Rice", servingGrams: 50, perServing: nutrients } }),
  };
}

describe("Native food capture", () => {
  it("bounds image size and requests base64 without saving personal photos to the library", () => {
    expect(FoodCapture_options("meal")).to.include({
      maxWidth: 1024,
      maxHeight: 1024,
      includeBase64: true,
      saveToPhotos: false,
    });
    expect(FoodCapture_options("label")).to.include({
      maxWidth: 1600,
      maxHeight: 1600,
      assetRepresentationMode: "compatible",
    });
  });

  it("accepts image data and handles cancellation, missing data, unsupported formats, and permissions", () => {
    expect(FoodCapture_photo(photo)).to.deep.equal({ kind: "photo", dataUrl: "data:image/jpeg;base64,YWJj" });
    expect(FoodCapture_photo({ didCancel: true })).to.deep.equal({ kind: "cancelled" });
    expect(FoodCapture_photo({})).to.have.property("kind", "error");
    expect(FoodCapture_photo({ assets: [{ type: "image/heic", base64: "a" }] })).to.have.property("kind", "error");
    expect(FoodCapture_photo({ errorCode: "permission" }))
      .to.have.property("error")
      .that.includes("Settings");
  });

  it("never opens the picker, requests camera access, or sends data after Not now", async () => {
    const deps = dependencies();
    (deps.allow as sinon.SinonStub).resolves(false);
    expect(await FoodCapture_meal("camera", "", deps)).to.deep.equal({ type: "cancelled" });
    expect(await FoodCapture_label("photo-library", deps)).to.deep.equal({ type: "cancelled" });
    for (const fn of [deps.cameraPermission, deps.pick, deps.estimate, deps.readLabel]) {
      expect((fn as sinon.SinonStub).called).to.equal(false);
    }
  });

  it("waits for consent before opening the camera and then estimates that photo", async () => {
    const deps = dependencies();
    let allow!: (value: boolean) => void;
    (deps.allow as sinon.SinonStub).returns(
      new Promise<boolean>((resolve) => {
        allow = resolve;
      })
    );
    const pending = FoodCapture_meal("camera", "half the rice", deps);
    expect((deps.pick as sinon.SinonStub).called).to.equal(false);
    allow(true);
    const event = await pending;
    expect(event.type).to.equal("estimated");
    sinon.assert.callOrder(
      deps.allow as sinon.SinonStub,
      deps.cameraPermission as sinon.SinonStub,
      deps.pick as sinon.SinonStub,
      deps.estimate as sinon.SinonStub
    );
    expect((deps.estimate as sinon.SinonStub).firstCall.args).to.deep.equal([
      "data:image/jpeg;base64,YWJj",
      "half the rice",
    ]);
  });

  it("does not call AI on camera denial, cancellation, picker errors, or missing base64", async () => {
    for (const result of [{ didCancel: true }, { errorCode: "permission" }, { assets: [{ uri: "file:///a.jpg" }] }]) {
      const deps = dependencies();
      (deps.pick as sinon.SinonStub).resolves(result);
      await FoodCapture_meal("camera", "", deps);
      expect((deps.estimate as sinon.SinonStub).called).to.equal(false);
    }
    const deps = dependencies();
    (deps.cameraPermission as sinon.SinonStub).resolves(false);
    expect(await FoodCapture_label("camera", deps)).to.have.property("type", "failed");
    expect((deps.pick as sinon.SinonStub).called).to.equal(false);
    (deps.pick as sinon.SinonStub).rejects(new Error("picker failed"));
    expect(await FoodCapture_label("photo-library", deps)).to.have.property("type", "failed");
  });

  it("reads a label from the library without a camera request and keeps it editable before saving", async () => {
    const deps = dependencies();
    const event = await FoodCapture_label("photo-library", deps);
    expect((deps.cameraPermission as sinon.SinonStub).called).to.equal(false);
    const state = FoodLabel_reduce(FoodLabel_empty(), event);
    expect(state.form?.name).to.equal("Rice");
    const edited = FoodLabel_reduce(state, { type: "edit", form: { ...state.form!, name: "Brown rice" } });
    const product = NutritionLabel_toProduct(edited.form!, "1234567890123");
    expect(product.ok).to.equal(true);
    if (product.ok) {
      expect(product.product.name).to.equal("Brown rice");
      expect(product.product.per100g.calories).to.equal(200);
      expect(product.product.barcode).to.equal("1234567890123");
    }
    expect(FoodLabel_reduce(FoodLabel_reduce(edited, { type: "start" }), { type: "cancelled" }).form).to.deep.equal(
      edited.form
    );
    expect(FoodLabel_reduce(edited, { type: "read", result: { ok: false, error: "offline" } })).to.include({
      busy: false,
      error: "offline",
    });
    expect(FoodLabel_reduce(FoodLabel_empty(), { type: "manual" }).form?.calories).to.equal("");
  });

  it("reviews meal items and clears stale estimates after a failed new photo", async () => {
    const event = await FoodCapture_meal("photo-library", "", dependencies());
    const ready = FoodPhoto_reduce(FoodPhoto_empty(), event);
    expect(ready.choices?.[0]).to.include({ name: "Rice", grams: 100, isSelected: true });
    expect(ready.note).to.equal("Check portions");
    const edited = FoodPhoto_reduce(ready, { type: "choices", choices: [] });
    expect(edited.choices).to.deep.equal([]);
    expect(FoodPhoto_reduce(FoodPhoto_reduce(ready, { type: "start" }), { type: "cancelled" }).choices).to.deep.equal(
      ready.choices
    );
    const failed = FoodPhoto_reduce(ready, {
      type: "estimated",
      photo: "new",
      result: { ok: false, error: "offline" },
    });
    expect(failed).to.deep.equal({ busy: false, preview: "new", error: "offline" });
  });
});
