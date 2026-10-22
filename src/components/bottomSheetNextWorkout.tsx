import { JSX, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./primitives/text";
import { IProgram, ISettings, IStats } from "../types";
import {
  emptyProgramId,
  Program_evaluate,
  Program_getProgramDay,
  Program_nextHistoryRecord,
  Program_isEmpty,
} from "../models/program";
import { HistoryRecordView } from "./historyRecord";
import { IDispatch } from "../ducks/types";
import { LinkButton } from "./linkButton";
import { IconSwap } from "./icons/iconSwap";
import { Tailwind_colors } from "../utils/tailwindConfig";
import { IconPlus2 } from "./icons/iconPlus2";
import { Thunk_startProgramDay } from "../ducks/thunks";
import { navigateToModal } from "../navigation/navigationService";
import { useTrackedState } from "../navigation/TrackedStateContext";
import { Button } from "./button";
import { EditProgram_setNextDay } from "../models/editProgram";
import { Progress_getCurrentProgress } from "../models/progress";
import { WeekScheduleStore } from "../utils/weekScheduleStore";
import {
  IStartChoice,
  WeekSchedule_startChoice,
  WeekSchedule_todayFor,
  WeekSchedule_workedOutToday,
} from "../models/weekSchedule";

export interface IBottomSheetNextWorkoutContentProps {
  currentProgram?: IProgram;
  allPrograms: IProgram[];
  settings: ISettings;
  stats: IStats;
  dispatch: IDispatch;
  onClose: () => void;
}

export function BottomSheetNextWorkoutContent(props: IBottomSheetNextWorkoutContentProps): JSX.Element {
  const insets = useSafeAreaInsets();
  const evaluatedProgram = props.currentProgram ? Program_evaluate(props.currentProgram, props.settings) : undefined;
  const trackedState = useTrackedState();
  const schedule = WeekScheduleStore.use();
  const [isTodayDismissed, setIsTodayDismissed] = useState(false);
  const now = Date.now();
  const choice: IStartChoice =
    evaluatedProgram && props.currentProgram && !Program_isEmpty(props.currentProgram)
      ? WeekSchedule_startChoice(evaluatedProgram, WeekSchedule_todayFor(schedule, evaluatedProgram, now), {
          workedOutToday: WeekSchedule_workedOutToday(trackedState.storage.history, now),
          hasProgress: Progress_getCurrentProgress(trackedState) != null,
        })
      : { kind: "next" };
  const programId = props.currentProgram?.id;
  const startToday = (day: number): void => {
    if (programId != null) {
      EditProgram_setNextDay(props.dispatch, programId, day);
      props.dispatch(Thunk_startProgramDay());
    }
  };

  if (choice.kind === "today" && !isTodayDismissed) {
    return (
      <View style={{ paddingBottom: insets.bottom }}>
        <Text className="pb-4 text-lg font-semibold text-center">New Workout</Text>
        <Button
          name="start-today-day"
          testID="start-today-day"
          data-testid="start-today-day"
          kind="purple"
          buttonSize="lg"
          className="w-full"
          onClick={() => startToday(choice.day)}
        >
          {`Today is ${choice.todayName}`}
        </Button>
        <View className="items-center pt-4">
          <LinkButton
            name="start-next-instead"
            data-testid="start-next-instead"
            testID="start-next-instead"
            onClick={() => setIsTodayDismissed(true)}
          >
            {`Do ${choice.nextName} instead`}
          </LinkButton>
        </View>
      </View>
    );
  }

  const programDay = evaluatedProgram ? Program_getProgramDay(evaluatedProgram, evaluatedProgram.nextDay) : undefined;
  const nextHistoryRecord = props.currentProgram
    ? Program_nextHistoryRecord(props.currentProgram, props.settings, props.stats)
    : undefined;

  const doesProgressNotMatchProgram =
    nextHistoryRecord &&
    (nextHistoryRecord.programId !== props.currentProgram?.id ||
      nextHistoryRecord.day !== props.currentProgram.nextDay);

  return (
    <View>
      <Text className="pb-4 text-lg font-semibold text-center">New Workout</Text>
      {doesProgressNotMatchProgram && (
        <Text className="mb-1 text-xs text-center text-text-secondary">
          You currently have ongoing workout. Finish it first to see newly chosen program or a different day.
        </Text>
      )}
      {choice.kind === "rest" && (
        <Text
          className="mb-1 text-sm text-center text-text-secondary"
          testID="start-rest-day"
          data-testid="start-rest-day"
        >
          {`Today is a rest day. Next in order: ${choice.nextName}.`}
        </Text>
      )}
      {Program_isEmpty(props.currentProgram) && (
        <Text className="mb-1 text-xs text-center text-text-secondary">No program currently selected.</Text>
      )}
      {programDay && nextHistoryRecord && (
        <HistoryRecordView
          historyRecord={nextHistoryRecord}
          programDay={programDay}
          isOngoing={false}
          settings={props.settings}
          dispatch={props.dispatch}
        />
      )}
      <View
        className="flex-row flex-wrap justify-around pt-4 gap-x-3 gap-y-2 bg-background-default"
        style={{ paddingBottom: insets.bottom }}
      >
        <LinkButton
          name="change-next-day"
          data-testid="change-next-day"
          testID="change-next-day"
          onClick={() => navigateToModal("changeNextDayModal")}
        >
          <View className="flex-row items-center">
            <IconSwap color={Tailwind_colors().blue[400]} size={16} />
            <Text className="pl-1 text-sm font-bold underline text-text-link">Select next workout</Text>
          </View>
        </LinkButton>
        <LinkButton
          name="start-empty-workout"
          data-testid="start-empty-workout"
          testID="start-empty-workout"
          onClick={() => {
            props.dispatch(Thunk_startProgramDay(emptyProgramId));
          }}
        >
          <View className="flex-row items-center">
            <IconPlus2 color={Tailwind_colors().blue[400]} size={16} />
            <Text className="pl-1 text-sm font-bold underline text-text-link">Ad-Hoc Workout</Text>
          </View>
        </LinkButton>
      </View>
    </View>
  );
}
