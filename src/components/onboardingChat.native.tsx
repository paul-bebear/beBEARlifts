import { JSX, ReactNode } from "react";
import { IDispatch } from "../ducks/types";

export function OnboardingChat(props: { dispatch: IDispatch; children: ReactNode }): JSX.Element {
  return <>{props.children}</>;
}
