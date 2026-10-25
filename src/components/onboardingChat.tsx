import { JSX, ReactNode } from "react";
import { IDispatch } from "../ducks/types";
import { OnboardingFlow } from "./onboardingFlow";
import { InviteClient_current } from "../utils/inviteClient";

export function OnboardingChat(props: { dispatch: IDispatch; children: ReactNode }): JSX.Element {
  return <OnboardingFlow dispatch={props.dispatch} language={navigator.language} invite={InviteClient_current()} />;
}
