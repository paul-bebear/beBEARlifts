import { JSX } from "react";
import { NavScreenContent } from "../NavScreenContent";
import { ScreenBodyScans } from "../../components/screenBodyScans";

export function NavScreenBodyScans(): JSX.Element {
  return (
    <NavScreenContent>
      <ScreenBodyScans />
    </NavScreenContent>
  );
}
