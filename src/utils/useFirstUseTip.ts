import { useCallback, useRef, useState } from "react";
import { lb } from "lens-shmens";
import { IDispatch } from "../ducks/types";
import { IState, updateState } from "../models/state";
import {
  FirstUseTips_recordSeen,
  FirstUseTips_transition,
  IFirstUseEvent,
  IFirstUseTipsState,
} from "../models/firstUseTips";

export function useFirstUseTip(
  helps: string[],
  dispatch: IDispatch
): {
  tip: IFirstUseTipsState["tip"];
  reportTip: (event: IFirstUseEvent | "close") => void;
} {
  const stateRef = useRef<IFirstUseTipsState>({ helps });
  const helpsRef = useRef(helps);
  helpsRef.current = helps;
  const [tip, setTip] = useState<IFirstUseTipsState["tip"]>();
  const reportTip = useCallback(
    (event: IFirstUseEvent | "close") => {
      const next = FirstUseTips_transition(stateRef.current, event, helpsRef.current);
      stateRef.current = next.state;
      setTip(next.state.tip);
      if (next.shownId != null) {
        const id = next.shownId;
        updateState(
          dispatch,
          [
            lb<IState>()
              .p("storage")
              .p("helps")
              .recordModify((hs) => FirstUseTips_recordSeen(hs, id)),
          ],
          "Show first-use tip"
        );
      }
    },
    [dispatch]
  );
  return { tip, reportTip };
}
