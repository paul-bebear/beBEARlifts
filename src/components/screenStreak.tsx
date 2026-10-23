import { JSX, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { IconFlame } from "./progressIcons";
import { BadgeGrid } from "./badgeGrid";
import { useNavOptions } from "../navigation/useNavOptions";
import { MonthCalendar_build, MonthCalendar_monthOf, MonthCalendar_shift } from "../models/monthCalendar";
import { useTrackedState } from "../navigation/TrackedStateContext";
import { useBearBadges } from "../utils/useBearBadges";
import { useBearHoney } from "../utils/useBearHoney";
import { BearStore } from "../utils/bearStore";
import { HibernationPass_holdLimit, HibernationPass_offer, HibernationPass_purchase } from "../models/hibernationPass";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { ShareCardTheme as T } from "./shareCards/shareCardTheme";

interface IStreakCalendarProps {
  today: string;
  doneDays: Set<string>;
  coveredDays: Set<string>;
  startsMonday: boolean;
}

function StreakCalendar(props: IStreakCalendarProps): JSX.Element {
  const { today, doneDays, coveredDays, startsMonday } = props;
  const [month, setMonth] = useState(() => MonthCalendar_monthOf(today));
  const calendar = useMemo(
    () => MonthCalendar_build({ month, today, selected: today, workoutDays: doneDays, startsMonday }),
    [month, today, doneDays, startsMonday]
  );
  const isCurrentMonth = month >= MonthCalendar_monthOf(today);
  return (
    <View className="w-full mb-8" testID="streak-calendar" data-testid="streak-calendar">
      <View className="flex-row items-center justify-between mb-2">
        <Pressable
          testID="streak-month-prev"
          data-testid="streak-month-prev"
          accessibilityLabel="Previous month"
          className="px-3 py-1"
          onPress={() => setMonth(MonthCalendar_shift(month, -1))}
        >
          <Text className="text-xl">‹</Text>
        </Pressable>
        <Text className="text-base font-semibold">{calendar.title}</Text>
        <Pressable
          testID="streak-month-next"
          data-testid="streak-month-next"
          accessibilityLabel="Next month"
          disabled={isCurrentMonth}
          className="px-3 py-1"
          style={{ opacity: isCurrentMonth ? 0.25 : 1 }}
          onPress={() => setMonth(MonthCalendar_shift(month, 1))}
        >
          <Text className="text-xl">›</Text>
        </Pressable>
      </View>
      <View className="flex-row mb-1">
        {calendar.weekdayLabels.map((label, i) => (
          <Text key={i} className="text-xs text-center text-text-secondary" style={{ width: "14.285%" }}>
            {label}
          </Text>
        ))}
      </View>
      {calendar.weeks.map((week) => (
        <View key={week[0].day} className="flex-row">
          {week.map((cell) => (
            <View key={cell.day} className="items-center justify-center py-1" style={{ width: "14.285%" }}>
              <View
                testID={cell.hasWorkout ? `streak-day-${cell.day}` : undefined}
                data-testid={cell.hasWorkout ? `streak-day-${cell.day}` : undefined}
                className="items-center justify-center rounded-full"
                style={{
                  width: 34,
                  height: 34,
                  backgroundColor:
                    cell.hasWorkout && cell.isInMonth
                      ? coveredDays.has(cell.day)
                        ? "#DBEAFE"
                        : T.honey
                      : "transparent",
                  borderWidth: cell.isToday ? 2 : 0,
                  borderColor: T.green,
                }}
              >
                <Text
                  className={`text-sm ${cell.hasWorkout && cell.isInMonth ? "font-bold" : ""} ${
                    cell.isInMonth && !cell.isFuture ? "" : "text-text-disabled"
                  }`}
                  style={cell.hasWorkout && cell.isInMonth ? { color: T.greenDark } : undefined}
                >
                  {cell.dayNumber}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function ScreenStreak(): JSX.Element {
  const { streak, doneDays, coveredDays, today, grid } = useBearBadges();
  const store = BearStore.use();
  const honey = useBearHoney();
  const offer = HibernationPass_offer(store, honey.balance);
  const startsMonday = !!useTrackedState().storage.settings.startWeekFromMonday;

  useNavOptions({ navTitle: "Streak" });

  return (
    <View className="items-center px-6 pt-10 pb-8" testID="streak-screen" data-testid="streak-screen">
      <IconFlame size={96} color={streak > 0 ? "#F97316" : Tailwind_semantic().icon.neutral} />
      <Text testID="streak-count" className="mt-4 font-bold" style={{ fontSize: 72, lineHeight: 80 }}>
        {streak}
      </Text>
      <Text className="mb-2 text-lg text-text-secondary">day streak</Text>
      <Text className="mb-8 text-sm text-center text-text-secondary">
        Train or log one meal a day to keep it going.
      </Text>
      <StreakCalendar today={today} doneDays={doneDays} coveredDays={coveredDays} startsMonday={startsMonday} />
      <BadgeGrid grid={grid} />
      <View className="w-full mt-8" testID="hibernation-passes" data-testid="hibernation-passes">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-bold">Hibernation passes</Text>
          <Text className="text-base" testID="hibernation-pass-count" data-testid="hibernation-pass-count">
            {store.passes} of {HibernationPass_holdLimit}
          </Text>
        </View>
        <Text className="mt-2 text-sm text-text-secondary">
          Miss a day and your bear sleeps through it. Works on streaks of 3 days or more.
        </Text>
        <Pressable
          testID="hibernation-pass-buy"
          data-testid="hibernation-pass-buy"
          accessibilityRole="button"
          accessibilityState={{ disabled: offer.disabled }}
          disabled={offer.disabled}
          className="items-center px-4 py-4 mt-4 rounded-full"
          style={{ backgroundColor: T.honey, opacity: offer.disabled ? 0.5 : 1 }}
          onPress={() =>
            BearStore.update((saved) => HibernationPass_purchase(saved, honey.sources, Date.now())).catch(
              () => undefined
            )
          }
        >
          <Text className="text-base font-semibold" style={{ color: T.greenDark }}>
            {offer.label}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
