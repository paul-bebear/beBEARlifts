import { JSX, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { Circle, Polyline, Rect, Svg } from "./primitives/svg";
import { ShareCardTheme as T } from "./shareCards/shareCardTheme";
import { useTrackedState } from "../navigation/TrackedStateContext";
import { FoodLog_dayKey } from "../models/foodLog";
import { ICheckInField } from "../models/notes";
import { MonthCalendar_workoutDays } from "../models/monthCalendar";
import {
  CheckInTrend_build,
  CheckInTrend_longDays,
  CheckInTrend_segments,
  CheckInTrend_shortDays,
  CheckInTrend_summary,
} from "../models/checkInTrend";
import { NotesStore } from "../utils/notesStore";

const lineColors: Record<ICheckInField, string> = {
  energy: T.honey,
  soreness: T.green,
  mood: "#5B8DEF",
};

const width = 300;
const lineHeight = 36;

function TrendLine(props: { values: (number | undefined)[]; color: string; workoutDays?: boolean[] }): JSX.Element {
  const segments = CheckInTrend_segments(props.values, width, lineHeight);
  const step = props.values.length > 1 ? width / (props.values.length - 1) : 0;
  return (
    <Svg viewBox={`-4 -4 ${width + 8} ${lineHeight + 8}`} width="100%" height={lineHeight + 8}>
      {props.workoutDays?.map((isWorkout, i) =>
        isWorkout ? <Rect key={i} x={i * step - 1} y={-4} width={2} height={lineHeight + 8} fill="#E5E1D8" /> : null
      )}
      {segments.map((points, i) => (
        <Polyline
          key={i}
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke={props.color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {segments.flat().map((p, i) => (
        <Circle key={`d${i}`} cx={p.x} cy={p.y} r={2.5} fill={props.color} />
      ))}
    </Svg>
  );
}

export function CheckInChart(): JSX.Element {
  const history = useTrackedState().storage.history;
  const notes = NotesStore.use();
  const [isLong, setIsLong] = useState(false);
  const workoutDays = useMemo(() => MonthCalendar_workoutDays(history), [history]);
  const trend = CheckInTrend_build({
    notes,
    today: FoodLog_dayKey(new Date()),
    length: isLong ? CheckInTrend_longDays : CheckInTrend_shortDays,
    workoutDays,
  });
  return (
    <Pressable
      testID="checkin-chart"
      data-testid="checkin-chart"
      accessibilityRole="button"
      accessibilityLabel={isLong ? "Show the last 30 days" : "Show the last 90 days"}
      onPress={() => setIsLong(!isLong)}
      className="p-4 mx-4 mb-4 border rounded-2xl border-border-neutral bg-background-default"
    >
      <View className="flex-row items-center">
        <Text className="flex-1 text-lg font-bold">How he's doing</Text>
        <Text className="text-sm text-text-link">{isLong ? "30 days" : "90 days"}</Text>
      </View>
      <Text className="pb-2 text-sm text-text-secondary">{CheckInTrend_summary(trend)}</Text>
      {trend.lines.map((line) => (
        <View key={line.field} className="pt-2">
          <View className="flex-row items-center">
            <View
              className="mr-2 rounded-full"
              style={{ width: 10, height: 10, backgroundColor: lineColors[line.field] }}
            />
            <Text className="flex-1 text-sm font-semibold">{line.label}</Text>
            {line.average != null && <Text className="text-sm text-text-secondary">avg {line.average} of 5</Text>}
          </View>
          <TrendLine
            values={line.values}
            color={lineColors[line.field]}
            workoutDays={isLong ? trend.workoutDays : undefined}
          />
        </View>
      ))}
      {isLong && <Text className="pt-2 text-xs text-text-secondary">Grey bars are workout days.</Text>}
    </Pressable>
  );
}
