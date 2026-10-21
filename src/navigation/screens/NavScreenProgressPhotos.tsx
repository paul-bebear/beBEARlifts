import { JSX } from "react";
import { NavScreenContent } from "../NavScreenContent";
import { ScreenProgressPhotos } from "../../components/screenProgressPhotos";

export function NavScreenProgressPhotos(): JSX.Element {
  return (
    <NavScreenContent>
      <ScreenProgressPhotos />
    </NavScreenContent>
  );
}
