import { createContext } from "react";
import { IFirstUseEvent, IFirstUseTip } from "../models/firstUseTips";

export const FirstUseTipContext = createContext<
  { reportTip: (event: IFirstUseEvent) => void; tip?: IFirstUseTip } | undefined
>(undefined);
