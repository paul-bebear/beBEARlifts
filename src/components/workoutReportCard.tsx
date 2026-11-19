import { JSX, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { ReportApi_summary, ReportStore } from "../utils/reportStore";
import { AiConsent_showFeatures } from "../models/aiConsent";
import { AiConsentStore } from "../utils/aiConsentClient";
import { useTrackedState } from "../navigation/TrackedStateContext";
import { WorkoutPost_hasEarlierExercise } from "../models/workoutPost";
import {
  IWorkoutReport,
  WorkoutReport_answerLabels,
  WorkoutReport_options,
  WorkoutReport_withAnswer,
  WorkoutReport_withSummary,
} from "../models/workoutReport";

export function WorkoutReportView(props: { report: IWorkoutReport }): JSX.Element {
  const history = useTrackedState().storage.history;
  const showAi = AiConsent_showFeatures(AiConsentStore.use());
  const { report } = props;
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const writeSummary = async (): Promise<void> => {
    setIsBusy(true);
    const result = await ReportApi_summary(report);
    setError(result.ok ? undefined : result.error);
    if (result.ok) {
      await ReportStore.update((log) => WorkoutReport_withSummary(log, report.workoutId, result.text));
    }
    setIsBusy(false);
  };

  if (report.items.length === 0) {
    return (
      <Text className="text-sm text-text-secondary">
        {WorkoutPost_hasEarlierExercise(report.workoutId, history)
          ? "Nothing unusual. Same weights and effort as your last 4 weeks."
          : "First workout logged. Reports compare from the second one."}
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
                    onPress={() =>
                      ReportStore.update((log) => WorkoutReport_withAnswer(log, report.workoutId, item.key, answer))
                    }
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
      {showAi && (
        <Pressable onPress={writeSummary} disabled={isBusy} testID="report-summary" className="mt-1">
          <Text className="text-sm font-semibold text-text-link">
            {isBusy ? "Writing…" : report.summary != null ? "Rewrite the coach's note" : "Get the coach's note"}
          </Text>
        </Pressable>
      )}
      {error != null && <Text className="mt-1 text-xs text-text-error">{error}</Text>}
    </View>
  );
}
