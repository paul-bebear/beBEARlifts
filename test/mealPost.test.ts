import "mocha";
import { expect } from "chai";
import {
  MealPost_build,
  MealPost_fromServing,
  MealPost_isId,
  MealPost_shareSwitch,
  MealPost_jpegBytes,
  MealPost_macrosCard,
  MealPost_newId,
  MealPost_parse,
  MealPost_photoPath,
  MealPost_withPhotoUrls,
} from "../src/models/mealPost";
import { FoodScanSteps_reduce, IScanServing, IScanStep } from "../src/models/foodScanSteps";
import { IFoodPhotoChoice } from "../src/models/foodAddFlow";

const id = "0f8fad5b-d9cb-469f-a165-70867728950e";
const userId = "6a1d5e4c-1111-4222-8333-944455556666";
const origin = "https://example.supabase.co";

describe("MealPost", () => {
  it("makes a version 4 uuid from random bytes", () => {
    const made = MealPost_newId(new Uint8Array(16).fill(255));
    expect(made).to.equal("ffffffff-ffff-4fff-bfff-ffffffffffff");
    expect(MealPost_isId(made)).to.equal(true);
    expect(MealPost_isId(MealPost_newId(new Uint8Array(16)))).to.equal(true);
    expect(MealPost_isId("../other-user/x")).to.equal(false);
  });

  it("builds a draft with rounded macros and a trimmed description", () => {
    const draft = MealPost_build(id, "  Rice and chicken  ", { calories: 640.4, protein: 42.6, carbs: 60, fat: -3 });
    expect(draft).to.deep.equal({
      id,
      description: "Rice and chicken",
      macros: { kcal: 640, protein: 43, carbs: 60, fat: 0 },
    });
    expect(MealPost_build(id, "   ", { calories: 1, protein: 1, carbs: 1, fat: 1 })).to.equal(undefined);
    expect(MealPost_build("not-a-uuid", "Rice", { calories: 1, protein: 1, carbs: 1, fat: 1 })).to.equal(undefined);
    expect(
      MealPost_build(id, "x".repeat(500), { calories: 1, protein: 1, carbs: 1, fat: 1 })?.description
    ).to.have.length(200);
  });

  it("stores the photo under the owner's folder, named by the post id", () => {
    expect(MealPost_photoPath(userId, id)).to.equal(`${userId}/${id}.jpg`);
  });

  it("decodes a JPEG data URL and rejects anything else", () => {
    const bytes = MealPost_jpegBytes("data:image/jpeg;base64,/9j/", (b) => Buffer.from(b, "base64").toString("binary"));
    expect(Array.from(bytes!)).to.deep.equal([255, 216, 255]);
    expect(MealPost_jpegBytes("data:image/png;base64,AAAA", (b) => b)).to.equal(undefined);
    expect(
      MealPost_jpegBytes("data:image/jpeg;base64,AAAA", () => {
        throw new Error("bad");
      })
    ).to.equal(undefined);
  });

  it("checks a friend's row field by field and keeps only a photo path that matches the row", () => {
    const row = {
      id,
      user_id: userId,
      posted_at: "2026-10-22T08:00:00Z",
      description: "Oats",
      macros: { kcal: 400, protein: 20, carbs: 60, fat: 8 },
      photo_path: `${userId}/${id}.jpg`,
    };
    const post = MealPost_parse(row)!;
    expect(post).to.deep.equal({
      id,
      userId,
      postedAt: Date.parse("2026-10-22T08:00:00Z"),
      description: "Oats",
      macros: { kcal: 400, protein: 20, carbs: 60, fat: 8 },
      photoPath: `${userId}/${id}.jpg`,
    });
    expect(MealPost_parse(JSON.parse(JSON.stringify({ ...post, photoUrl: "https://x" })))).to.deep.equal({
      ...post,
      photoUrl: "https://x",
    });
    expect(MealPost_parse({ ...row, photo_path: `someone-else/${id}.jpg` })?.photoPath).to.equal(undefined);
    expect(MealPost_parse({ ...row, macros: { kcal: "400", protein: 1, carbs: 1, fat: 1 } })).to.equal(undefined);
    expect(MealPost_parse({ ...row, macros: { kcal: 1e9, protein: 1, carbs: 1, fat: 1 } })).to.equal(undefined);
    expect(MealPost_parse({ ...row, description: "" })).to.equal(undefined);
    expect(MealPost_parse({ ...row, posted_at: "never" })).to.equal(undefined);
  });

  it("attaches signed photo URLs by path and ignores answers it cannot use", () => {
    const post = MealPost_parse({
      id,
      user_id: userId,
      posted_at: "2026-10-22T08:00:00Z",
      description: "Oats",
      macros: { kcal: 400, protein: 20, carbs: 60, fat: 8 },
      photo_path: `${userId}/${id}.jpg`,
    })!;
    const signed = [
      { path: `${userId}/${id}.jpg`, signedURL: `/object/sign/meal-photos/${userId}/${id}.jpg?token=t` },
      { path: "x", signedURL: "https://evil.example/x" },
    ];
    expect(MealPost_withPhotoUrls([post], origin, signed)[0].photoUrl).to.equal(
      `${origin}/storage/v1/object/sign/meal-photos/${userId}/${id}.jpg?token=t`
    );
    expect(MealPost_withPhotoUrls([post], origin, { error: "nope" })[0].photoUrl).to.equal(undefined);
  });

  it("lists the macros card in kcal, protein, carbs, fat order", () => {
    expect(MealPost_macrosCard({ kcal: 1240, protein: 84, carbs: 130, fat: 40 })).to.deep.equal([
      { label: "kcal", value: "1,240" },
      { label: "Protein", value: "84 g" },
      { label: "Carbs", value: "130 g" },
      { label: "Fat", value: "40 g" },
    ]);
  });
});

describe("Serving step share switch", () => {
  const plate: IFoodPhotoChoice[] = [
    { name: "Rice", grams: 200, nutrients: { calories: 260, protein: 5, carbs: 56, fat: 1 }, isSelected: true },
  ] as IFoodPhotoChoice[];
  const camera: IScanStep = { kind: "camera", mode: "ai" };

  it("starts off every time and keeps the photo as taken", () => {
    const first = FoodScanSteps_reduce(camera, { type: "photoReviewed", choices: plate, nonce: 1, photo: "data:p" });
    expect(first.kind === "serving" && first.serving.isShared).to.not.equal(true);
    expect(first.kind === "serving" && first.serving.photo).to.equal("data:p");
    const on = FoodScanSteps_reduce(first, { type: "shareToggled", isShared: true });
    expect(on.kind === "serving" && on.serving.isShared).to.equal(true);
    const again = FoodScanSteps_reduce(FoodScanSteps_reduce(on, { type: "back" }), {
      type: "photoReviewed",
      choices: plate,
      nonce: 2,
    });
    expect(again.kind === "serving" && again.serving.isShared).to.not.equal(true);
    expect(again.kind === "serving" && again.serving.photo).to.equal(undefined);
  });

  it("needs a sign-in and a handle before the switch works", () => {
    expect(MealPost_shareSwitch(false, false, false).enabled).to.equal(false);
    expect(MealPost_shareSwitch(true, false, false).enabled).to.equal(false);
    expect(MealPost_shareSwitch(true, true, false)).to.deep.equal({ enabled: true, note: "Only you see this meal." });
    expect(MealPost_shareSwitch(true, true, true).note).to.equal(
      "Friends see the photo, the description and the macros."
    );
  });

  it("builds a post from the serving step only when the switch is on and allowed", () => {
    const first = FoodScanSteps_reduce(camera, { type: "photoReviewed", choices: plate, nonce: 1 });
    const on = FoodScanSteps_reduce(first, { type: "shareToggled", isShared: true });
    const serving = (step: IScanStep): IScanServing => (step.kind === "serving" ? step.serving : ({} as IScanServing));
    const allowed = MealPost_shareSwitch(true, true, true);
    expect(MealPost_fromServing(serving(first), allowed, id)).to.equal(undefined);
    expect(MealPost_fromServing(serving(on), MealPost_shareSwitch(false, true, true), id)).to.equal(undefined);
    expect(MealPost_fromServing(serving(on), allowed, id)).to.deep.equal({
      id,
      description: "Rice",
      macros: { kcal: 260, protein: 5, carbs: 56, fat: 1 },
    });
  });
});
