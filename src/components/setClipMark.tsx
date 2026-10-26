import { JSX, useState } from "react";
import { ISetClip, SetClips_keepNote, SetClips_savedLabel } from "../models/setClips";
import { IconCamera } from "./icons/iconCamera";
import { Modal } from "./modal";

export function SetClipMark(props: { clip: ISetClip }): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-label="Show filmed set"
        aria-expanded={open}
        data-testid="set-clip-mark"
        className="p-2"
        onClick={() => setOpen(!open)}
      >
        <IconCamera size={16} />
      </button>
      {open && (
        <Modal name="set-clip" shouldShowClose={true} onClose={() => setOpen(false)}>
          <div data-testid="set-clip-details" className="p-2 text-xs">
            {props.clip.thumbnail && <img src={props.clip.thumbnail} width={160} alt="Filmed set thumbnail" />}
            <div>{SetClips_savedLabel(props.clip)}</div>
            <div className="mt-1 text-text-secondary">{SetClips_keepNote}</div>
          </div>
        </Modal>
      )}
    </div>
  );
}
