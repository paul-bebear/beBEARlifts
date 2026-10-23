import { JSX } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { FormSheet } from "../FormSheet";
import { FoodEditEntry } from "../../components/foodEditEntry";
import type { IFoodEditModalParams } from "../types";

export function NavModalFoodEdit(): JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<{ key: string; name: "foodEditModal"; params: IFoodEditModalParams }>();
  const onClose = (): void => navigation.goBack();
  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      <FormSheet>
        <FoodEditEntry entryId={route.params.entryId} onClose={onClose} />
      </FormSheet>
    </SheetScreenContainer>
  );
}
