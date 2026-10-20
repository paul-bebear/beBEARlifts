import { JSX } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { useAppState } from "../StateContext";
import { FoodGoalsContent } from "../../components/foodGoalsContent";
import { Stats_getCurrentBodyweight } from "../../models/stats";

export function NavModalFoodGoals(): JSX.Element {
  const { state } = useAppState();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const onClose = (): void => navigation.goBack();
  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      <View className="w-full px-4 pt-4" style={{ paddingBottom: insets.bottom + 24 }}>
        <FoodGoalsContent
          onClose={onClose}
          latestWeight={Stats_getCurrentBodyweight(state.storage.stats)}
          units={state.storage.settings.units}
        />
      </View>
    </SheetScreenContainer>
  );
}
