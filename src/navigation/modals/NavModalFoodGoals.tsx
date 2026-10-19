import { JSX } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { FoodGoalsContent } from "../../components/foodGoalsContent";

export function NavModalFoodGoals(): JSX.Element {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const onClose = (): void => navigation.goBack();
  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
      <View className="w-full px-4 pt-4" style={{ paddingBottom: insets.bottom + 24 }}>
        <FoodGoalsContent onClose={onClose} />
      </View>
    </SheetScreenContainer>
  );
}
