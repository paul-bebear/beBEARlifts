import { BearHoney_balance } from "./bearHoney";
import { IBearStoreData } from "./bearStoreData";

export const BearShop_outfits = [
  { id: "gym", name: "Gym outfit", price: 25 },
  { id: "fitted", name: "Fitted outfit", price: 40 },
  { id: "baggy", name: "Baggy outfit", price: 60 },
] as const;

export type IBearOutfitId = (typeof BearShop_outfits)[number]["id"];
export type IBearOutfitStage = "teen" | "mid" | "fit" | "peak";
export const BearShop_levelLook = "level";

export function BearShop_isOutfit(id: unknown): id is IBearOutfitId {
  return BearShop_outfits.some((outfit) => outfit.id === id);
}

export function BearShop_stage(level: number): IBearOutfitStage | undefined {
  if (!Number.isInteger(level) || level < 2 || level > 9) {
    return undefined;
  }
  return (["teen", "mid", "fit", "peak"] as const)[Math.floor((level - 2) / 2)];
}

export function BearShop_message(level: number): string | undefined {
  return level < 2 ? "Outfits unlock at level 2" : level >= 10 ? "Space suits only up here" : undefined;
}

export function BearShop_buy(state: IBearStoreData, outfitId: string, balance: number): IBearStoreData {
  const outfit = BearShop_outfits.find((item) => item.id === outfitId);
  if (outfit == null || state.owned.includes(outfitId) || !Number.isFinite(balance) || balance < outfit.price) {
    return state;
  }
  return { ...state, spent: state.spent + outfit.price, owned: [...state.owned, outfitId] };
}

export function BearShop_equip(state: IBearStoreData, outfitId: string): IBearStoreData {
  if (outfitId === BearShop_levelLook) {
    if (state.equipped == null) {
      return state;
    }
    const { equipped, ...next } = state;
    return next;
  }
  return BearShop_isOutfit(outfitId) && state.owned.includes(outfitId) && state.equipped !== outfitId
    ? { ...state, equipped: outfitId }
    : state;
}

export function BearShop_select(
  state: IBearStoreData,
  outfitId: string,
  earned: number,
  level: number
): IBearStoreData {
  if (outfitId === BearShop_levelLook) {
    return BearShop_equip(state, outfitId);
  }
  if (BearShop_stage(level) == null) {
    return state;
  }
  return state.owned.includes(outfitId)
    ? BearShop_equip(state, outfitId)
    : BearShop_buy(state, outfitId, BearHoney_balance(earned, state.spent));
}

export interface IBearShopCard {
  id: string;
  name: string;
  price: string;
  button: string;
  disabled: boolean;
}

export function BearShop_cards(
  state: IBearStoreData,
  level: number,
  balance: number,
  pending: boolean
): IBearShopCard[] {
  const stage = BearShop_stage(level);
  const levelLook = stage == null || !BearShop_isOutfit(state.equipped);
  const looks = [{ id: BearShop_levelLook, name: "Level look", price: 0 }, ...BearShop_outfits];
  return looks.map((outfit) => {
    const isLevel = outfit.id === BearShop_levelLook;
    const owned = isLevel || state.owned.includes(outfit.id);
    const wearing = isLevel ? levelLook : !levelLook && state.equipped === outfit.id;
    const missing = Math.max(0, outfit.price - balance);
    const unavailable = !isLevel && stage == null;
    return {
      id: outfit.id,
      name: outfit.name,
      price: isLevel ? "Free" : `${outfit.price} honey · ${owned ? "Owned" : "All body stages"}`,
      button: wearing ? "Wearing" : owned ? "Wear" : missing > 0 ? `Buy · Need ${missing} more honey` : "Buy",
      disabled: pending || wearing || unavailable || (!owned && missing > 0),
    };
  });
}
