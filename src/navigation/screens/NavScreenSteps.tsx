import { JSX } from "react";
import { NavScreenContent } from "../NavScreenContent";
import { ScreenSteps } from "../../components/screenSteps";

export function NavScreenSteps(): JSX.Element {
  return (
    <NavScreenContent avoidSystemKeyboard>
      <ScreenSteps />
    </NavScreenContent>
  );
}
