import "mocha";
import { expect } from "chai";
import {
  BearShop_buy,
  BearShop_cards,
  BearShop_equip,
  BearShop_levelLook,
  BearShop_message,
  BearShop_outfits,
  BearShop_select,
  BearShop_stage,
} from "../src/models/bearShop";
import { BearStoreData_empty, BearStoreData_parse } from "../src/models/bearStoreData";

describe("BearShop", () => {
  it("prices gym at 25, fitted at 40 and baggy at 60", () => {
    expect(BearShop_outfits.map(({ id, price }) => [id, price])).to.deep.equal([
      ["gym", 25],
      ["fitted", 40],
      ["baggy", 60],
    ]);
  });

  it("maps both levels of each body stage and excludes cub and space levels", () => {
    expect(Array.from({ length: 12 }, (_, i) => BearShop_stage(i + 1))).to.deep.equal([
      undefined,
      "teen",
      "teen",
      "mid",
      "mid",
      "fit",
      "fit",
      "peak",
      "peak",
      undefined,
      undefined,
      undefined,
    ]);
    for (const level of [0, -1, 2.5, NaN, Infinity, 13]) {
      expect(BearShop_stage(level)).to.equal(undefined);
    }
    expect(BearShop_message(1)).to.equal("Outfits unlock at level 2");
    expect(BearShop_message(10)).to.equal("Space suits only up here");
    expect(BearShop_message(9)).to.equal(undefined);
  });

  for (const outfit of BearShop_outfits) {
    it(`buys ${outfit.id} once at its exact price without equipping it`, () => {
      const empty = BearStoreData_empty();
      const bought = BearShop_buy(empty, outfit.id, outfit.price);
      expect(bought.spent).to.equal(outfit.price);
      expect(bought.owned).to.deep.equal([outfit.id]);
      expect(bought.equipped).to.equal(undefined);
      expect(BearShop_buy(bought, outfit.id, 1000)).to.equal(bought);
      expect(empty).to.deep.equal(BearStoreData_empty());
    });
  }

  it("refuses missing honey, invalid balances and unknown outfit ids", () => {
    const state = BearStoreData_empty();
    for (const balance of [24, -5, NaN, Infinity]) {
      expect(BearShop_buy(state, "gym", balance)).to.equal(state);
    }
    expect(BearShop_buy(state, "unknown", 100)).to.equal(state);
    expect(BearShop_buy(state, BearShop_levelLook, 100)).to.equal(state);
  });

  it("adds spending and preserves the other store fields", () => {
    const state = {
      ...BearStoreData_empty(),
      spent: 40,
      owned: ["fitted"],
      equipped: "fitted",
      line: "female" as const,
    };
    const next = BearShop_buy(state, "gym", 25);
    expect(next).to.deep.equal({ ...state, spent: 65, owned: ["fitted", "gym"] });
  });

  it("wears only owned outfits and always allows the level look", () => {
    const empty = BearStoreData_empty();
    expect(BearShop_equip(empty, "gym")).to.equal(empty);
    expect(BearShop_equip(empty, BearShop_levelLook)).to.equal(empty);
    const bought = BearShop_buy(empty, "gym", 25);
    const wearing = BearShop_equip(bought, "gym");
    expect(wearing.equipped).to.equal("gym");
    expect(BearShop_equip(wearing, "gym")).to.equal(wearing);
    expect(BearShop_equip(wearing, "baggy")).to.equal(wearing);
    expect(BearShop_equip(wearing, BearShop_levelLook)).to.deep.equal(bought);
  });

  it("rechecks saved spending when two purchases use the same displayed balance", () => {
    const first = BearShop_select(BearStoreData_empty(), "gym", 60, 3);
    expect(BearShop_select(first, "fitted", 60, 3)).to.equal(first);
    expect(BearShop_select(first, "gym", 60, 3).equipped).to.equal("gym");
  });

  it("keeps outfits through levels without outfits and lets the user return to the level look", () => {
    const wearing = BearShop_equip(BearShop_buy(BearStoreData_empty(), "gym", 25), "gym");
    for (const level of [1, 10, 11, 12]) {
      expect(BearShop_select(wearing, "baggy", 100, level)).to.equal(wearing);
      const cards = BearShop_cards(wearing, level, 100, false);
      expect(cards[0].button).to.equal("Wearing");
      expect(cards.slice(1).every((card) => card.disabled)).to.equal(true);
      expect(BearShop_select(wearing, BearShop_levelLook, 100, level).equipped).to.equal(undefined);
    }
    expect(BearShop_cards(wearing, 9, 0, false)[1].button).to.equal("Wearing");
  });

  it("renders four cards with missing honey, ownership, wearing and pending states", () => {
    const empty = BearStoreData_empty();
    const cards = BearShop_cards(empty, 2, 24, false);
    expect(cards).to.have.length(4);
    expect(cards[0]).to.include({ name: "Level look", price: "Free", button: "Wearing", disabled: true });
    expect(cards[1]).to.include({ button: "Buy · Need 1 more honey", disabled: true });
    expect(BearShop_cards(empty, 2, 25, false)[1]).to.include({ button: "Buy", disabled: false });
    const bought = BearShop_buy(empty, "gym", 25);
    expect(BearShop_cards(bought, 2, 0, false)[1]).to.include({ button: "Wear", disabled: false });
    const wearing = BearShop_equip(bought, "gym");
    expect(BearShop_cards(wearing, 2, 0, false)[0]).to.include({ button: "Wear", disabled: false });
    expect(BearShop_cards(wearing, 2, 0, true).every((card) => card.disabled)).to.equal(true);
  });
});

describe("BearStoreData wardrobe", () => {
  it("reads old stores with an empty wardrobe and keeps the honey spent", () => {
    const parsed = BearStoreData_parse({ celebratedLevel: 4, seenBadges: [], spent: 40 });
    expect(parsed).to.deep.equal({ ...BearStoreData_empty(), celebratedLevel: 4, spent: 40 });
  });

  it("copies ownership, removes duplicates and refuses an unowned equipped outfit", () => {
    const raw = { ...BearStoreData_empty(), owned: ["gym", "gym", 1, "", "future"], equipped: "baggy" };
    const parsed = BearStoreData_parse(raw);
    expect(parsed.owned).to.deep.equal(["gym", "future"]);
    expect(parsed.owned).not.to.equal(raw.owned);
    expect(parsed.equipped).to.equal(undefined);
    expect(BearStoreData_parse({ ...raw, equipped: "gym" }).equipped).to.equal("gym");
  });

  it("drops malformed share records without losing the wardrobe or spending", () => {
    const raw = {
      ...BearStoreData_empty(),
      spent: 25,
      owned: ["gym"],
      equipped: "gym",
      sharedPosts: [
        null,
        {},
        { id: "bad", day: "2026-13-01" },
        { id: "bad", day: "2026-02-30" },
        { id: "ok", day: "2026-10-22" },
      ],
    };
    const parsed = BearStoreData_parse(raw);
    expect(parsed).to.include({ spent: 25, equipped: "gym" });
    expect(parsed.sharedPosts).to.deep.equal([{ id: "ok", day: "2026-10-22" }]);
  });
});
