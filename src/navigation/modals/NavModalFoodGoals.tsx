import { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { FormSheet } from "../FormSheet";
import { useAppState } from "../StateContext";
import { FoodGoalsContent } from "../../components/foodGoalsContent";
import { Stats_getCurrentBodyweight } from "../../models/stats";

export function NavModalFoodGoals(): JSX.Element {
  const { state } = useAppState();
  const navigation = useNavigation();
  const onClose = (): void => navigation.goBack();
  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      <FormSheet>
        <FoodGoalsContent
          onClose={onClose}
          latestWeight={Stats_getCurrentBodyweight(state.storage.stats)}
          units={state.storage.settings.units}
        />
      </FormSheet>
    </SheetScreenContainer>
  );
}
