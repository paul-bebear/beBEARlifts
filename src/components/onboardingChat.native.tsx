import { JSX, ReactNode } from "react";
import { IDispatch } from "../ducks/types";
import { OnboardingFlow } from "./onboardingFlow";

export function OnboardingChat(props: { dispatch: IDispatch; children: ReactNode }): JSX.Element {
  return <OnboardingFlow dispatch={props.dispatch} language={Intl.DateTimeFormat().resolvedOptions().locale} />;
}
