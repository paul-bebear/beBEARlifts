import { JSX } from "react";
import { NavScreenContent } from "../NavScreenContent";
import { ScreenMusic } from "../../components/screenMusic";

export function NavScreenMusic(): JSX.Element {
  return (
    <NavScreenContent>
      <ScreenMusic />
    </NavScreenContent>
  );
}
