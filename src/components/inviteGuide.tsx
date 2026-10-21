import { JSX } from "react";

export function InviteGuide(props: { handle: string }): JSX.Element {
  return (
    <main
      className="fixed inset-0 z-50 flex flex-col justify-center gap-6 overflow-auto p-6 bg-background-default text-text-primary"
      style={{ paddingBottom: "max(32px, env(safe-area-inset-bottom))" }}
    >
      <h1 className="text-3xl font-bold">Train with {props.handle}</h1>
      <p className="text-lg">Add beBEARlifts to your Home Screen before setting up your program.</p>
      <ol className="list-decimal pl-6 space-y-5 text-lg">
        <li>
          In Safari, tap Share <span aria-label="Share icon">↑</span> (the square with an arrow).
        </li>
        <li>Tap “Add to Home Screen”, then “Add”.</li>
        <li>Open beBEARlifts from your Home Screen.</li>
      </ol>
      <p>
        When the chat asks who invited you, enter <strong>{props.handle}</strong>.
      </p>
      <p className="text-sm text-text-secondary">Safari and the Home Screen app keep separate data.</p>
      <div aria-hidden="true" className="text-center text-5xl">
        ↓
      </div>
      <p className="text-center text-sm">Safari’s Share button is in the toolbar. You may need to open its menu.</p>
    </main>
  );
}
