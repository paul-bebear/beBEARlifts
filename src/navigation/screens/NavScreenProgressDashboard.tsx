import { JSX } from "react";
import { NavScreenContent } from "../NavScreenContent";
import { ScreenProgressDashboard } from "../../components/screenProgressDashboard";

export function NavScreenProgressDashboard(): JSX.Element {
  return (
    <NavScreenContent>
      <ScreenProgressDashboard />
    </NavScreenContent>
  );
}
