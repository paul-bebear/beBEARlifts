import { JSX, useRef, useState } from "react";
import { ISetClipTarget } from "../models/setClips";
import { SetClipVideo_save } from "../utils/setClipVideo";
import { IconCamera } from "./icons/iconCamera";

export function SetClipCapture(props: ISetClipTarget): JSX.Element {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState<File>();
  const save = (file: File): void => {
    setPending(file);
    setBusy(true);
    setError(false);
    SetClipVideo_save(file, props)
      .then(() => setPending(undefined))
      .catch(() => setError(true))
      .finally(() => setBusy(false));
  };
  return (
    <div>
      <button
        type="button"
        aria-label="Film this set"
        data-testid="film-set"
        className="px-3 py-2"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <IconCamera size={24} />
      </button>
      <input
        ref={input}
        type="file"
        accept="video/*"
        capture="environment"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file == null) {
            return;
          }
          save(file);
        }}
      />
      {error && pending && (
        <div role="alert">
          Could not finish saving the clip.
          <button type="button" disabled={busy} onClick={() => save(pending)}>
            Save clip again
          </button>
        </div>
      )}
    </div>
  );
}
