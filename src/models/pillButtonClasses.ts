export type IPillButtonKind = "pill" | "pill-outline" | "pill-danger";

const pillKinds: readonly string[] = ["pill", "pill-outline", "pill-danger"];

const kindClasses: Record<IPillButtonKind, { container: string; text: string }> = {
  pill: { container: "bg-button-primarybackground", text: "text-button-primarylabel" },
  "pill-outline": { container: "border border-button-primarybackground", text: "text-text-link" },
  "pill-danger": { container: "border border-text-error", text: "text-text-error" },
};

export function PillButtonClasses_isPill(kind: string): kind is IPillButtonKind {
  return pillKinds.includes(kind);
}

export function PillButtonClasses_for(kind: IPillButtonKind, disabled: boolean): { container: string; text: string } {
  const classes = kindClasses[kind];
  return {
    container: `items-center justify-center px-4 py-3 rounded-full ${classes.container}${disabled ? " opacity-40" : ""}`,
    text: `text-base font-semibold text-center ${classes.text}`,
  };
}
