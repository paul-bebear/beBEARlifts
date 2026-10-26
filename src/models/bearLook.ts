import { IBearFur, IBearLine, IBearStoreData } from "./bearStoreData";

export const BearLook_lines: readonly { value: IBearLine; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

export const BearLook_furs: readonly { value: IBearFur; label: string }[] = [
  { value: "brown", label: "Brown" },
  { value: "black", label: "Black" },
  { value: "polar", label: "Polar" },
];

function labelOf<T extends string>(options: readonly { value: T; label: string }[], value: T): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function BearLook_summary(line: IBearLine, fur: IBearFur): string {
  return `${labelOf(BearLook_lines, line)} · ${labelOf(BearLook_furs, fur)}`;
}

export function BearLook_setFur(store: IBearStoreData, fur: IBearFur): IBearStoreData {
  return store.fur === fur ? store : { ...store, fur };
}
