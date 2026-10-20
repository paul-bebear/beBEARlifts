import { JSX } from "react";
import { NavScreenContent } from "../NavScreenContent";
import { ScreenFriends } from "../../components/screenFriends";

export function NavScreenFriends(): JSX.Element {
  return (
    <NavScreenContent>
      <ScreenFriends />
    </NavScreenContent>
  );
}
