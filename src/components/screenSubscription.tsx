import { JSX } from "react";
import { View, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./primitives/text";
import { Tailwind_colors, Tailwind_semantic } from "../utils/tailwindConfig";
import { IDispatch } from "../ducks/types";
import { NavScreenContent } from "../navigation/NavScreenContent";
import { useNavOptions } from "../navigation/useNavOptions";
import { IconClose } from "./icons/iconClose";
import { IconCrown } from "./icons/iconCrown";
import { goBack } from "../navigation/navigationService";
import { IPlusFeatureInfo, PlusAccess_list, PlusAccess_prices } from "../models/plusAccess";
import { useHasPlus } from "../utils/usePlusAccess";
import { StoreBuild_showsProCodes } from "../models/storeBuild";
import { StoreReceipt_name } from "../utils/storeReceipt";

interface IProps {
  dispatch: IDispatch;
}

export function ScreenSubscription(props: IProps): JSX.Element {
  const insets = useSafeAreaInsets();
  const hasPlus = useHasPlus();
  useNavOptions({ navHidden: true });

  return (
    <NavScreenContent>
      <PlusHero hasPlus={hasPlus} />
      <View className="flex-1 px-gutter" style={{ paddingBottom: insets.bottom + 16 }}>
        <FeatureGroup title="What beBEAR+ adds" features={PlusAccess_list("plus")} testID="plus-features" />
        <FeatureGroup title="Free for everyone" features={PlusAccess_list("free")} testID="free-features" />
        {!hasPlus && (
          <View className="p-4 mb-4 rounded-xl bg-background-cardpurple" testID="plus-prices">
            <Text className="text-base font-semibold">{PlusAccess_prices}</Text>
            <Text className="mt-1 text-sm text-text-secondary">Purchases open soon.</Text>
            {StoreBuild_showsProCodes(Platform.OS, StoreReceipt_name(), __DEV__) && (
              <Text className="mt-1 text-sm text-text-secondary">
                Have a beBEAR+ code? Sign in to the backup card on the Me tab and enter it there.
              </Text>
            )}
          </View>
        )}
      </View>
    </NavScreenContent>
  );
}

function PlusHero(props: { hasPlus: boolean }): JSX.Element {
  const insets = useSafeAreaInsets();
  return (
    <View className="w-full pb-6 bg-background-cardpurple px-gutter" style={{ paddingTop: insets.top + 48 }}>
      <Pressable
        className="absolute z-10 p-2"
        style={{ top: insets.top + 4, right: 8 }}
        data-testid="subscription-close"
        testID="subscription-close"
        onPress={() => goBack()}
      >
        <IconClose size={20} color={Tailwind_semantic().icon.neutral} />
      </Pressable>
      <View className="flex-row items-center gap-2">
        <IconCrown size={28} color={Tailwind_colors().yellow[600]} />
        <Text className="text-3xl font-bold" data-testid="subscription-status-title" testID="subscription-status-title">
          {props.hasPlus ? "beBEAR+ is on" : "beBEAR+"}
        </Text>
      </View>
      <Text className="mt-2 text-base text-text-secondary">
        {props.hasPlus
          ? "Insights, AI and the API are unlocked. Thanks for backing the bear."
          : "Logging stays free. beBEAR+ adds the tools that analyze, use AI or connect to other apps."}
      </Text>
    </View>
  );
}

function FeatureGroup(props: { title: string; features: IPlusFeatureInfo[]; testID: string }): JSX.Element {
  return (
    <View className="pt-6" testID={props.testID}>
      <Text className="pb-3 text-lg font-semibold">{props.title}</Text>
      {props.features.map((f) => (
        <View key={f.key} className="flex-row mb-4">
          <Text className="w-6 text-base font-bold text-icon-yellow">✓</Text>
          <View className="flex-1">
            <Text className="text-base font-bold">{f.title}</Text>
            <Text className="text-sm text-text-secondary">{f.description}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
