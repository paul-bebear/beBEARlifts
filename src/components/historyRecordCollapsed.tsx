import { JSX } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { IconArrowDown2 } from "./icons/iconArrowDown2";
import { IDispatch } from "../ducks/types";
import { Thunk_startProgramDay } from "../ducks/thunks";
import { IHistoryRecord } from "../types";
import { IPersonalRecords } from "../models/history";
import { HistoryCollapse_summary } from "../models/historyCollapse";
import { StringUtils_pluralize } from "../utils/string";

interface IProps {
  historyRecord: IHistoryRecord;
  title: string;
  isCurrent: boolean;
  prs?: IPersonalRecords;
  cardStyle: Record<string, unknown>;
  onToggle: () => void;
  dispatch: IDispatch;
}

export function HistoryRecordCollapsed(props: IProps): JSX.Element {
  const { historyRecord, title } = props;
  if (props.isCurrent) {
    return (
      <View data-testid="history-record" testID="history-record" className="pt-2">
        <Pressable
          data-testid="next-workout-collapsed"
          testID="next-workout-collapsed"
          className="flex-row items-center px-4 py-3 border rounded-2xl bg-background-cardpurple border-border-cardpurple"
          style={props.cardStyle}
          onPress={props.onToggle}
        >
          <CollapsedNextWorkout historyRecord={historyRecord} title={title} />
          <Button
            name="start-next-workout"
            kind="purple"
            buttonSize="md"
            data-testid="start-next-workout"
            testID="start-next-workout"
            onClick={() => props.dispatch(Thunk_startProgramDay())}
          >
            Start
          </Button>
        </Pressable>
      </View>
    );
  }
  return (
    <View data-testid="history-record" testID="history-record" className="pt-2">
      <Pressable
        data-testid="history-record-collapsed"
        testID="history-record-collapsed"
        className="px-4 py-3 border rounded-2xl bg-background-cardpurple border-border-cardpurple"
        style={props.cardStyle}
        onPress={props.onToggle}
      >
        <CollapsedRecord historyRecord={historyRecord} title={title} prs={props.prs} />
      </Pressable>
    </View>
  );
}

function CollapsedNextWorkout(props: { historyRecord: IHistoryRecord; title: string }): JSX.Element {
  const { historyRecord } = props;
  const summary = HistoryCollapse_summary(historyRecord);
  return (
    <View className="flex-1 mr-3">
      <Text className="text-xs font-semibold tracking-wide uppercase text-text-secondary">{props.title}</Text>
      <Text className="text-xl font-bold" numberOfLines={1}>
        {historyRecord.dayName}
      </Text>
      <Text className="text-sm text-text-secondary">
        {`${summary.exercises} ${StringUtils_pluralize("exercise", summary.exercises)}  ·  ${summary.sets} ${StringUtils_pluralize("set", summary.sets)}`}
      </Text>
    </View>
  );
}

function CollapsedRecord(props: { historyRecord: IHistoryRecord; title: string; prs?: IPersonalRecords }): JSX.Element {
  const { historyRecord } = props;
  const summary = HistoryCollapse_summary(historyRecord, props.prs);
  const exercisesUnit = StringUtils_pluralize("exercise", summary.exercises);
  const setsUnit = StringUtils_pluralize("set", summary.sets);
  return (
    <View>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <Text className="text-base font-semibold">{props.title}</Text>
          {summary.hasPr && (
            <View
              data-testid="history-record-pr"
              testID="history-record-pr"
              className="px-2 ml-2 rounded-full bg-background-cardyellow"
            >
              <Text className="text-xs font-semibold">{"\u{1F3C6} PR"}</Text>
            </View>
          )}
        </View>
        <IconArrowDown2 />
      </View>
      <Text className="text-sm text-text-secondary">{historyRecord.dayName}</Text>
      <Text className="mt-1 text-sm">
        {`${summary.duration}  ·  ${summary.exercises} ${exercisesUnit}  ·  ${summary.sets} ${setsUnit}`}
      </Text>
    </View>
  );
}
