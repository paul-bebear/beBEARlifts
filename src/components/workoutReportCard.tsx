import { JSX, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord, ISettings } from "../types";
import { Thunk_pushScreen } from "../ducks/thunks";
import { ReportApi_summary, ReportStore } from "../utils/reportStore";
import {
  IWorkoutReport,
  WorkoutReport_answer,
  WorkoutReport_answerLabels,
  WorkoutReport_build,
  WorkoutReport_find,
  WorkoutReport_options,
  WorkoutReport_previous,
  WorkoutReport_put,
} from "../models/workoutReport";

function save(report: IWorkoutReport): Promise<void> {
  return ReportStore.update((log) => WorkoutReport_put(log, report));
}

export function WorkoutReportView(props: { report: IWorkoutReport }): JSX.Element {
  const { report } = props;
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const writeSummary = async (): Promise<void> => {
    setIsBusy(true);
    const result = await ReportApi_summary(report);
    setError(result.ok ? undefined : result.error);
    if (result.ok) {
      await save({ ...report, summary: result.text });
    }
    setIsBusy(false);
  };

  if (report.items.length === 0) {
    return (
      <Text className="text-sm text-text-secondary">
        Nothing unusual. Same weights and effort as your last 4 weeks.
      </Text>
    );
  }
  return (
    <View>
      {report.summary != null && <Text className="mb-3 text-sm">{report.summary}</Text>}
      {report.items.map((item) => (
        <View key={item.key} className="mb-2">
          <Text className="text-sm">{item.text}</Text>
          {WorkoutReport_options(item).length > 0 && (
            <View className="flex-row flex-wrap mt-1" style={{ gap: 6 }}>
              {WorkoutReport_options(item).map((answer) => {
                const isPicked = report.answers[item.key] === answer;
                return (
                  <Pressable
                    key={answer}
                    testID={`report-answer-${answer}`}
                    onPress={() => save(WorkoutReport_answer(report, item.key, answer))}
                    className={`px-3 py-1 rounded-full border ${
                      isPicked ? "bg-button-primarybackground border-button-primarybackground" : "border-border-neutral"
                    }`}
                  >
                    <Text className={`text-xs ${isPicked ? "text-text-alwayswhite" : ""}`}>
                      {WorkoutReport_answerLabels[answer]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      ))}
      <Pressable onPress={writeSummary} disabled={isBusy} testID="report-summary" className="mt-1">
        <Text className="text-sm font-semibold text-text-link">
          {isBusy ? "Writing…" : report.summary != null ? "Rewrite the coach's note" : "Get the coach's note"}
        </Text>
      </Pressable>
      {error != null && <Text className="mt-1 text-xs text-text-error">{error}</Text>}
    </View>
  );
}

export function WorkoutReportCard(props: {
  record: IHistoryRecord;
  history: IHistoryRecord[];
  settings: ISettings;
  dispatch: IDispatch;
}): JSX.Element | null {
  const log = ReportStore.use();
  const report = WorkoutReport_find(log, props.record.id);

  useEffect(() => {
    ReportStore.update((current) => {
      if (WorkoutReport_find(current, props.record.id) != null) {
        return current;
      }
      const previous = WorkoutReport_previous(current, props.record.startTime);
      return WorkoutReport_put(current, WorkoutReport_build(props.record, props.history, previous, props.settings));
    });
  }, [props.record.id]);

  if (report == null) {
    return null;
  }
  return (
    <View className="p-4 mx-4 mb-4 rounded-2xl bg-background-subtle" testID="workout-report">
      <View className="flex-row items-center mb-2">
        <Text className="flex-1 text-base font-semibold">Workout report</Text>
        <Pressable onPress={() => props.dispatch(Thunk_pushScreen("reports"))} testID="report-all">
          <Text className="text-sm text-text-link">All reports</Text>
        </Pressable>
      </View>
      <WorkoutReportView report={report} />
    </View>
  );
}
