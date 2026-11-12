import { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { SheetScreenContainer } from "../navigation/SheetScreenContainer";
import { FormSheet } from "../navigation/FormSheet";
import { BearPanel } from "./bearPanel";
import { useBear } from "../utils/useBear";

export function BearPanelSheetModal(): JSX.Element {
  const navigation = useNavigation();
  const { state } = useBear();
  return (
    <SheetScreenContainer onClose={() => navigation.goBack()} shouldShowClose={true}>
      <FormSheet>
        <BearPanel state={state} now={Date.now()} />
      </FormSheet>
    </SheetScreenContainer>
  );
}
