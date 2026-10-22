import { JSX } from "react";

export function InviteGuide(props: { handle?: string; isIos: boolean; onOpenHere: () => void }): JSX.Element {
  return (
    <main
      className="fixed inset-0 z-50 flex flex-col justify-center gap-6 overflow-auto p-6 bg-background-default text-text-primary"
      style={{ paddingBottom: "max(32px, env(safe-area-inset-bottom))" }}
    >
      <h1 className="text-3xl font-bold">
        {props.handle != null ? `Train with ${props.handle}` : "Add beBEAR to your Home Screen"}
      </h1>
      {props.isIos ? (
        <>
          <p className="text-lg">Add beBEAR to your Home Screen before you set it up.</p>
          <ol className="list-decimal pl-6 space-y-5 text-lg">
            <li>
              In Safari, tap Share <span aria-label="Share icon">↑</span> (the square with an arrow).
            </li>
            <li>Tap “Add to Home Screen”, then “Add”.</li>
            <li>Open beBEAR from your Home Screen.</li>
          </ol>
          {props.handle != null && (
            <p>
              When the setup asks who invited you, enter <strong>{props.handle}</strong>.
            </p>
          )}
          <p className="text-sm text-text-secondary">
            Safari and the Home Screen app keep separate data. What you set up in this tab does not move to the Home
            Screen app.
          </p>
          <p className="text-center text-sm">Safari’s Share button is in the toolbar. You may need to open its menu.</p>
        </>
      ) : (
        <>
          <p className="text-lg">beBEAR is made for the iPhone Home Screen.</p>
          <p>
            On an iPhone, open this link in Safari and add it to the Home Screen. On this device you can use it in the
            browser.
          </p>
          {props.handle != null && (
            <p>
              When the setup asks who invited you, enter <strong>{props.handle}</strong>.
            </p>
          )}
        </>
      )}
      <button
        className={props.isIos ? "p-3 text-text-link" : "w-full p-4 rounded-xl bg-purple-600 text-white"}
        onClick={props.onOpenHere}
      >
        {props.isIos ? "Open here in Safari anyway" : "Open beBEAR here"}
      </button>
    </main>
  );
}
