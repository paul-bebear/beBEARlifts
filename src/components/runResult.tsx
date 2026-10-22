import { JSX } from "react";
import { View } from "react-native";
import { IRun, RunLog_date, RunLog_fastestSplit, RunLog_pace, RunLog_splitBars } from "../models/runLog";
import { RunTrack_formatDuration, RunTrack_formatKm, RunTrack_formatPace } from "../models/runTrack";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { RunRouteSvg } from "./runRouteSvg";
import { RunShareCard } from "./runShareCard";

export function RunResult(props: { run: IRun; onDelete: () => void; onClose: () => void }): JSX.Element {
  const run = props.run;
  const bars = RunLog_splitBars(run.splits);
  const fastest = RunLog_fastestSplit(run);
  return (
    <View testID="run-result">
      <Text className="text-lg font-bold">{RunLog_date(run.startedAt)}</Text>
      <Text className="mt-4 text-4xl font-bold">{RunTrack_formatKm(run.distanceM)} km</Text>
      <Text className="mt-2 text-lg">
        {RunTrack_formatDuration(run.movingMs)} moving · {RunTrack_formatPace(RunLog_pace(run))}
      </Text>
      <Text className="mt-2 text-text-secondary">{run.elevationGainM} m climb</Text>
      <View className="my-4 rounded-2xl bg-background-subtle">
        <RunRouteSvg route={run.route} />
      </View>
      <Text className="mb-3 text-lg font-semibold">Kilometre splits</Text>
      {run.splits.length === 0 && (
        <Text className="text-text-secondary">Splits appear after your first full kilometre.</Text>
      )}
      {run.splits.map((split, index) => (
        <View key={split.km} className="mb-3">
          <View className="flex-row justify-between mb-1">
            <Text>
              Km {split.km}
              {split.km === fastest?.km ? " · Fastest" : ""}
            </Text>
            <Text>{RunTrack_formatPace(split.ms / 1000)}</Text>
          </View>
          <View className="h-2 overflow-hidden rounded-full bg-background-subtle">
            <View className="h-2 rounded-full bg-blue-400" style={{ width: `${bars[index] * 100}%` }} />
          </View>
        </View>
      ))}
      <RunShareCard run={run} />
      <View className="flex-row mt-4" style={{ gap: 8 }}>
        <Button name="run-result-all-runs" kind="pill-outline" className="flex-1" onPress={props.onClose}>
          All runs
        </Button>
        <Button name="run-delete" kind="pill-danger" className="flex-1" onPress={props.onDelete}>
          Delete run
        </Button>
      </View>
    </View>
  );
}
