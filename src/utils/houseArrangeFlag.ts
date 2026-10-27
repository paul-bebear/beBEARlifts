import { HouseArrange_isOn } from "../models/houseArrange";

export function HouseArrangeFlag_isOn(): boolean {
  return typeof window !== "undefined" && HouseArrange_isOn(window.location.search);
}
