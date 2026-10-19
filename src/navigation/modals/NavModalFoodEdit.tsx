import { JSX } from "react";
import { View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { FoodEditEntry } from "../../components/foodEditEntry";
import type { IFoodEditModalParams } from "../types";

export function NavModalFoodEdit(): JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<{ key: string; name: "foodEditModal"; params: IFoodEditModalParams }>();
  const insets = useSafeAreaInsets();
  const onClose = (): void => navigation.goBack();
  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      <View className="w-full px-4 pt-4" style={{ paddingBottom: insets.bottom + 24 }}>
        <FoodEditEntry entryId={route.params.entryId} onClose={onClose} />
      </View>
    </SheetScreenContainer>
  );
}
