import { Dispatch, JSX } from "react";
import { IOnboardingEvent } from "../models/onboarding";
import { OnboardingCommand_images } from "../utils/onboardingCommand";
import { OnboardingControls_field } from "./onboardingControls";

export function OnboardingImages(props: { busy: boolean; emit: Dispatch<IOnboardingEvent> }): JSX.Element {
  return (
    <input
      aria-label="Screenshots"
      className={OnboardingControls_field}
      type="file"
      accept="image/*"
      multiple
      disabled={props.busy}
      onChange={(e) => {
        OnboardingCommand_images(e.currentTarget.files, props.emit);
        e.currentTarget.value = "";
      }}
    />
  );
}
