import { JSX } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { BadgeCoin } from "./badgeCoin";
import { IBearBadgeGrid } from "../models/bearBadges";

interface IProps {
  grid: IBearBadgeGrid;
}

export function BadgeGrid(props: IProps): JSX.Element {
  const { grid } = props;
  return (
    <View className="w-full" testID="badge-grid" data-testid="badge-grid">
      <View className="flex-row items-baseline justify-between mb-3">
        <Text className="text-lg font-bold">Badges</Text>
        <Text className="text-sm text-text-secondary" testID="badge-count" data-testid="badge-count">
          {grid.earned} of {grid.total}
        </Text>
      </View>
      <View className="flex-row flex-wrap">
        {grid.entries.map((entry) => {
          const isEarned = entry.badge != null;
          return (
            <View
              key={entry.info.id}
              testID={`badge-${entry.info.id}`}
              data-testid={`badge-${entry.info.id}`}
              className="items-center mb-4"
              style={{ width: "33.33%" }}
            >
              <BadgeCoin info={entry.info} isEarned={isEarned} size={76} />
              <Text className={`mt-1 text-xs font-semibold text-center ${isEarned ? "" : "text-text-secondary"}`}>
                {entry.info.name}
              </Text>
              <Text className="px-1 text-center text-text-secondary" style={{ fontSize: 10, lineHeight: 13 }}>
                {entry.info.description}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
