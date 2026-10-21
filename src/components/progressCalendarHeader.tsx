import { JSX } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { IconDumbbellBadge, IconFlame } from "./progressIcons";
import {
  ICalendarCell,
  IMonthCalendar,
  MonthCalendar_visibleWeeks,
  MonthCalendar_weekdayLabels,
} from "../models/monthCalendar";
import { Tailwind_semantic } from "../utils/tailwindConfig";

const flameOrange = "#F97316";
const cellSize = 38;

function DayCell(props: { cell: ICalendarCell; onPress: () => void }): JSX.Element {
  const { cell } = props;
  const semantic = Tailwind_semantic();
  const ring = cell.isSelected ? "border-2 border-blue-400" : cell.isToday ? "border border-blue-400" : "";
  const fill = cell.isToday ? "bg-blue-400" : "bg-background-subtle";
  return (
    <Pressable
      testID={`calendar-day-${cell.day}`}
      data-testid={`calendar-day-${cell.day}`}
      onPress={props.onPress}
      disabled={cell.isFuture}
      className="items-center flex-1"
      style={{ opacity: cell.isInMonth ? 1 : 0.35 }}
    >
      <View
        className={`items-center justify-center rounded-full ${fill} ${ring}`}
        style={{ width: cellSize, height: cellSize }}
      >
        <Text
          className={`text-sm ${cell.isToday ? "font-bold text-black" : cell.isFuture ? "text-text-secondary" : ""}`}
        >
          {cell.dayNumber}
        </Text>
        {cell.hasWorkout && (
          <View
            className="absolute items-center justify-center rounded-full bg-background-default"
            style={{ right: -3, bottom: -3, width: 16, height: 16 }}
          >
            <IconDumbbellBadge size={11} color={semantic.icon.blue} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

export function ProgressCalendarHeader(props: {
  streak: number;
  calendar: IMonthCalendar;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onShiftMonth: (delta: number) => void;
  onSelectDay: (day: string) => void;
  onStreakPress: () => void;
}): JSX.Element {
  const semantic = Tailwind_semantic();
  return (
    <View className="px-4 pb-2" testID="progress-calendar" data-testid="progress-calendar">
      <View className="flex-row items-center mb-3">
        <Pressable
          testID="progress-streak"
          data-testid="progress-streak"
          onPress={props.onStreakPress}
          className="flex-row items-center px-3 py-1.5 rounded-full bg-background-subtle"
        >
          <IconFlame size={18} color={props.streak > 0 ? flameOrange : semantic.icon.neutral} />
          <Text className="ml-1 text-base font-bold">{props.streak}</Text>
        </Pressable>
        <View className="flex-row items-center justify-end flex-1">
          <Pressable
            testID="calendar-prev"
            data-testid="calendar-prev"
            onPress={() => props.onShiftMonth(-1)}
            className="px-3 py-1"
          >
            <Text className="text-xl text-text-link">‹</Text>
          </Pressable>
          <Text className="text-base font-semibold">{props.calendar.title}</Text>
          <Pressable
            testID="calendar-next"
            data-testid="calendar-next"
            onPress={() => props.onShiftMonth(1)}
            className="px-3 py-1"
          >
            <Text className="text-xl text-text-link">›</Text>
          </Pressable>
        </View>
      </View>
      <View className="flex-row mb-1">
        {MonthCalendar_weekdayLabels.map((label, i) => (
          <Text key={i} className="flex-1 text-xs text-center text-text-secondary">
            {label}
          </Text>
        ))}
      </View>
      {MonthCalendar_visibleWeeks(props.calendar, props.isCollapsed).map((week) => (
        <View key={week[0].day} className="flex-row mb-1.5">
          {week.map((cell) => (
            <DayCell key={cell.day} cell={cell} onPress={() => props.onSelectDay(cell.day)} />
          ))}
        </View>
      ))}
      <Pressable
        testID="calendar-handle"
        data-testid="calendar-handle"
        onPress={props.onToggleCollapse}
        className="items-center py-2"
      >
        <View className="w-10 h-1 rounded-full bg-border-neutral" />
        <Text className="mt-1 text-xs text-text-secondary">{props.isCollapsed ? "Show month" : "Show week"}</Text>
      </Pressable>
    </View>
  );
}
