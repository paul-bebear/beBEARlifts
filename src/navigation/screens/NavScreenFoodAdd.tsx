import { JSX } from "react";
import { useRoute } from "@react-navigation/native";
import { ScreenFoodAdd } from "../../components/screenFoodAdd";
import type { IFoodAddScreenParams } from "../types";

export function NavScreenFoodAdd(): JSX.Element {
  const route = useRoute<{ key: string; name: "foodAdd"; params: IFoodAddScreenParams }>();
  return <ScreenFoodAdd params={route.params} />;
}
