import { JSX, ReactNode } from "react";

export const ForkSheet_input =
  "w-full p-3 text-base border rounded-lg bg-background-default border-border-prominent text-text-primary";

export function ForkSheet(props: { title: string; testId: string; children: ReactNode }): JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
      data-testid={props.testId}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        className="w-full max-w-lg mx-auto p-5 space-y-4 rounded-t-2xl bg-background-default text-text-primary"
        style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
      >
        <h2 className="text-xl font-bold">{props.title}</h2>
        {props.children}
      </section>
    </div>
  );
}

export function ForkSheetButton(props: {
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      className={
        props.primary
          ? "w-full p-4 text-base font-semibold rounded-xl bg-purple-600 text-white disabled:opacity-50"
          : "w-full p-3 text-base text-text-link disabled:opacity-50"
      }
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.label}
    </button>
  );
}
