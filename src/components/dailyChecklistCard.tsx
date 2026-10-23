import { JSX } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { IconStats } from "./icons/iconStats";
import { IconFood } from "./icons/iconFood";
import { IconBarbell2 } from "./icons/iconBarbell2";
import { IChecklistDay, IChecklistItemKey } from "../models/dailyChecklist";
import { Tailwind_semantic } from "../utils/tailwindConfig";

function ItemIcon(props: { item: IChecklistItemKey; color: string }): JSX.Element {
  if (props.item === "weight") {
    return <IconStats size={20} color={props.color} />;
  }
  if (props.item === "train") {
    return <IconBarbell2 size={20} color={props.color} />;
  }
  return <IconFood size={20} color={props.color} />;
}

export function DailyChecklistCard(props: {
  checklist: IChecklistDay;
  onItemPress: (item: IChecklistItemKey) => void;
}): JSX.Element {
  const semantic = Tailwind_semantic();
  return (
    <View className="flex-row px-4 pb-3" style={{ gap: 8 }} testID="daily-checklist" data-testid="daily-checklist">
      {props.checklist.items.map((item) => (
        <Pressable
          key={item.key}
          testID={`daily-checklist-${item.key}`}
          data-testid={`daily-checklist-${item.key}`}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}, ${item.subtitle}`}
          accessibilityState={{ checked: item.isDone }}
          onPress={() => props.onItemPress(item.key)}
          className="items-center flex-1 py-3 rounded-2xl bg-background-subtle"
        >
          {item.isDone ? (
            <Text className="text-lg text-text-success">✓</Text>
          ) : (
            <ItemIcon item={item.key} color={semantic.icon.blue} />
          )}
          <Text numberOfLines={1} className={`pt-1 text-sm font-semibold ${item.isDone ? "text-text-secondary" : ""}`}>
            {item.title}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
