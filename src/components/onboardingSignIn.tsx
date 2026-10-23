import { JSX } from "react";
import { IDispatch } from "../ducks/types";
import { CloudBackupCard } from "./cloudBackupCard";

export function OnboardingSignIn(props: { dispatch: IDispatch }): JSX.Element {
  return <CloudBackupCard dispatch={props.dispatch} compact />;
}
