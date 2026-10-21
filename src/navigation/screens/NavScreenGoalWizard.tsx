import { JSX } from "react";
import { useRoute } from "@react-navigation/native";
import { NavScreenContent } from "../NavScreenContent";
import { ScreenGoalWizard } from "../../components/screenGoalWizard";
import type { IGoalWizardScreenParams } from "../types";

export function NavScreenGoalWizard(): JSX.Element {
  const route = useRoute<{ key: string; name: "goalWizard"; params?: IGoalWizardScreenParams }>();
  return (
    <NavScreenContent avoidSystemKeyboard>
      <ScreenGoalWizard mode={route.params?.mode ?? "goal"} />
    </NavScreenContent>
  );
}
