import { JSX } from "react";
import { View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { FoodAddContent } from "../../components/foodAddContent";
import type { IFoodAddModalParams } from "../types";

export function NavModalFoodAdd(): JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<{ key: string; name: "foodAddModal"; params: IFoodAddModalParams }>();
  const insets = useSafeAreaInsets();
  const onClose = (): void => navigation.goBack();
  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      <View className="w-full px-4 pt-4" style={{ paddingBottom: insets.bottom + 24, minHeight: 420 }}>
        <FoodAddContent params={route.params} onClose={onClose} />
      </View>
    </SheetScreenContainer>
  );
}
