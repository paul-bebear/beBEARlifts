import { JSX } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { useNavOptions } from "../navigation/useNavOptions";
import { useTrackedState } from "../navigation/TrackedStateContext";
import { ReportStore } from "../utils/reportStore";
import { WorkoutReport_weekLine, WorkoutReport_weeks } from "../models/workoutReport";
import { WorkoutReportView } from "./workoutReportCard";

function date(timestamp: number, withWeekday: boolean): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: withWeekday ? "short" : undefined,
    month: "short",
    day: "numeric",
  });
}

export function ScreenReports(): JSX.Element {
  const state = useTrackedState();
  const log = ReportStore.use();
  const weeks = WorkoutReport_weeks(log, !!state.storage.settings.startWeekFromMonday);

  useNavOptions({ navTitle: "Workout reports" });

  return (
    <View className="px-4 pt-2 pb-8" testID="reports-screen" data-testid="reports-screen">
      {log.reports.length === 0 && (
        <Text className="text-sm text-text-secondary">Finish a workout to get your first report.</Text>
      )}
      {weeks.length > 0 && (
        <View className="mb-6">
          <Text className="mb-2 text-base font-semibold">Week by week</Text>
          {weeks.slice(0, 12).map((week) => (
            <View key={week.weekStart} className="flex-row py-1">
              <Text className="w-20 text-sm text-text-secondary">{date(week.weekStart, false)}</Text>
              <Text className="flex-1 text-sm">{WorkoutReport_weekLine(week)}</Text>
            </View>
          ))}
        </View>
      )}
      {log.reports.map((report) => (
        <View key={report.workoutId} className="p-4 mb-3 rounded-2xl bg-background-subtle">
          <Text className="mb-2 text-base font-semibold">
            {date(report.timestamp, true)} · {report.dayName}
          </Text>
          <WorkoutReportView report={report} />
        </View>
      ))}
    </View>
  );
}
