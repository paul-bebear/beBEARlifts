import { Dispatch, JSX } from "react";
import { launchImageLibrary } from "react-native-image-picker";
import { IOnboardingEvent } from "../models/onboarding";
import { FoodCapture_options, FoodCapture_photo } from "../models/foodCapture";
import { OnboardingCommand_pickImage } from "../utils/onboardingCommand";
import { OnboardingAction } from "./onboardingControls";

export function OnboardingImages(props: { busy: boolean; emit: Dispatch<IOnboardingEvent> }): JSX.Element {
  return (
    <OnboardingAction
      disabled={props.busy}
      onPress={() =>
        OnboardingCommand_pickImage(
          () => launchImageLibrary(FoodCapture_options("meal")).then(FoodCapture_photo),
          props.emit
        )
      }
    >
      Add a screenshot
    </OnboardingAction>
  );
}
