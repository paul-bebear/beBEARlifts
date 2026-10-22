import { JSX, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { IconChevronRight } from "./icons/iconFoodUi";
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
  const [isOpen, setIsOpen] = useState(true);
  const semantic = Tailwind_semantic();
  const { checklist } = props;
  return (
    <View className="px-4 pb-3" testID="daily-checklist" data-testid="daily-checklist">
      <Pressable
        testID="daily-checklist-toggle"
        data-testid="daily-checklist-toggle"
        onPress={() => setIsOpen(!isOpen)}
        className="flex-row items-center mb-2"
      >
        <Text className="text-base font-semibold">{checklist.title}</Text>
        <Text className="flex-1 ml-2 text-sm text-text-secondary">
          {checklist.doneCount}/{checklist.items.length} completed
        </Text>
        <View style={{ transform: [{ rotate: isOpen ? "90deg" : "0deg" }] }}>
          <IconChevronRight size={14} color={semantic.icon.neutral} />
        </View>
      </Pressable>
      {isOpen &&
        checklist.items.map((item) => (
          <Pressable
            key={item.key}
            testID={`daily-checklist-${item.key}`}
            data-testid={`daily-checklist-${item.key}`}
            onPress={() => props.onItemPress(item.key)}
            className="flex-row items-center p-3 mb-2 rounded-2xl bg-background-subtle"
            style={{ opacity: item.isDone ? 0.5 : 1 }}
          >
            <View className="items-center justify-center w-10 h-10 mr-3 border rounded-xl border-border-neutral">
              <ItemIcon item={item.key} color={item.isDone ? semantic.icon.green : semantic.icon.blue} />
            </View>
            <View className="flex-1">
              <Text className={`text-base font-semibold ${item.isDone ? "line-through" : ""}`}>{item.title}</Text>
              <Text className="text-sm text-text-secondary" numberOfLines={1}>
                {item.subtitle}
              </Text>
            </View>
            {item.isDone ? (
              <Text className="mr-2 text-base text-text-success">✓</Text>
            ) : (
              <IconChevronRight size={16} color={semantic.icon.neutral} />
            )}
          </Pressable>
        ))}
    </View>
  );
}
