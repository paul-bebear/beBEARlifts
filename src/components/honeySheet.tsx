import { JSX, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "./primitives/text";
import { BearText_honeyBreakdown, BearText_honeyLine } from "../models/bearText";
import { ShareCardTheme as T } from "./shareCards/shareCardTheme";
import { BearArt_wornSprite } from "../models/bearArt";
import { BearShop_cards, BearShop_message, BearShop_select } from "../models/bearShop";
import { BearStore } from "../utils/bearStore";
import { useBearHoney } from "../utils/useBearHoney";
import { BearShopCard } from "./bearShopCard";

interface IProps {
  onClose: () => void;
}

export function HoneySheet(props: IProps): JSX.Element {
  const { state, store, balance, today, earned } = useBearHoney();
  const [pending, setPending] = useState(false);
  const level = state.level.tier.level;
  const message = BearShop_message(level);
  const cards = BearShop_cards(store, level, balance, pending);
  const select = async (id: string): Promise<void> => {
    setPending(true);
    try {
      await BearStore.update((saved) => BearShop_select(saved, id, earned, level));
    } catch {
      return;
    } finally {
      setPending(false);
    }
  };
  return (
    <Modal visible={true} animationType="slide" transparent={true} onRequestClose={props.onClose}>
      <Pressable
        testID="honey-sheet-backdrop"
        data-testid="honey-sheet-backdrop"
        accessibilityLabel="Close"
        onPress={props.onClose}
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      >
        <SafeAreaView edges={["bottom"]} style={{ backgroundColor: T.cream, maxHeight: "90%" }}>
          <ScrollView bounces={false}>
            <Pressable className="px-6 pt-6 pb-4" testID="honey-sheet" data-testid="honey-sheet">
              <Text className="text-2xl font-bold" style={{ color: T.greenDark }}>
                {BearText_honeyLine(balance)}
              </Text>
              <Text className="mt-3 text-sm font-bold tracking-wide uppercase" style={{ color: T.greenDark }}>
                Today
              </Text>
              <Text
                className="mt-1 text-base"
                style={{ color: T.greenDark }}
                testID="honey-breakdown"
                data-testid="honey-breakdown"
              >
                {BearText_honeyBreakdown(today)}
              </Text>
              <Text className="mt-5 text-xl font-bold" style={{ color: T.greenDark }}>
                Outfit shop
              </Text>
              {message != null && (
                <Text className="mt-2 text-base" style={{ color: T.greenDark }}>
                  {message}
                </Text>
              )}
              {cards.map((card) => (
                <BearShopCard
                  key={card.id}
                  card={card}
                  sprite={BearArt_wornSprite(state.line, level, "normal", card.id)}
                  onPress={() => select(card.id)}
                />
              ))}
              <View className="mt-5">
                <Pressable
                  testID="honey-sheet-close"
                  data-testid="honey-sheet-close"
                  accessibilityRole="button"
                  onPress={props.onClose}
                  className="items-center py-4 rounded-full"
                  style={{ backgroundColor: T.honey }}
                >
                  <Text className="text-base font-semibold" style={{ color: T.greenDark }}>
                    Got it
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}
