import { JSX } from "react";
import { useNavigation } from "@react-navigation/native";
import { SheetScreenContainer } from "../navigation/SheetScreenContainer";
import { FormSheet } from "../navigation/FormSheet";
import { BearPanel } from "./bearPanel";
import { useBear } from "../utils/useBear";
import { BearStore } from "../utils/bearStore";
import { BearCelebration_setLine } from "../models/bearCelebration";
import { IBearLine } from "../models/bearStoreData";
import { CubNumber_mine } from "../models/cubNumber";
import { CubStore } from "../utils/cubStore";
import { CloudStore } from "../utils/supabaseClient";

function setLine(line: IBearLine): void {
  BearStore.update((store) => BearCelebration_setLine(store, line)).catch(() => undefined);
}

export function BearPanelSheetModal(): JSX.Element {
  const navigation = useNavigation();
  const { state } = useBear();
  const cub = CubNumber_mine(CubStore.use(), CloudStore.use().session);
  return (
    <SheetScreenContainer onClose={() => navigation.goBack()} shouldShowClose={true}>
      <FormSheet>
        <BearPanel state={state} now={Date.now()} cub={cub} onLine={setLine} />
      </FormSheet>
    </SheetScreenContainer>
  );
}
