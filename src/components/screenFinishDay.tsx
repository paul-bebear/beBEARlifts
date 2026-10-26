import { Fragment, JSX, useCallback, useEffect } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { IDispatch } from "../ducks/types";
import {
  History_getPersonalRecords,
  History_totalRecordWeight,
  History_getStartedEntries,
  History_totalRecordReps,
  History_totalRecordSets,
  History_collectMuscleGroups,
  History_workoutTime,
} from "../models/history";
import { Weight_display } from "../models/weight";
import { Confetti } from "./confetti";
import { IHistoryRecord, IProgram, IScreenMuscle, ISettings, IStats } from "../types";
import { useNavOptions } from "../navigation/useNavOptions";
import { Thunk_maybeRequestReview, Thunk_maybeRequestSignup, Thunk_pushScreen } from "../ducks/thunks";
import { GroupHeader } from "./groupHeader";
import { HistoryEntryView } from "./historyEntry";
import { Collector } from "../utils/collector";
import { CollectionUtils_splitIntoNGroups } from "../utils/collection";
import { ObjectUtils_keys } from "../utils/object";
import { TimeUtils_formatHHMM } from "../utils/time";
import { PersonalRecords } from "./personalRecords";
import { n } from "../utils/math";
import { Muscle_getMuscleGroupName } from "../models/muscle";
import { OfflineOnly_isEnabled } from "../utils/offlineOnly";
import { WorkoutStoryCardSection } from "./workoutStoryCard";
import { CloudBackupAfterWorkout } from "./cloudBackupAfterWorkout";
import { FeedShareToggle } from "./feedShareToggle";
import { BearFinishBanner } from "./bearFinishBanner";
import {
  FinishDayActions_hasFriends,
  FinishDayActions_list,
  FinishDayActions_saveReport,
  IFinishDayAction,
} from "../models/finishDayActions";
import { FriendsClient_load, FriendsStore } from "../utils/friendsClient";
import { CloudStore } from "../utils/supabaseClient";
import { ReportStore } from "../utils/reportStore";

interface IProps {
  history: IHistoryRecord[];
  historyRecordId?: number;
  settings: ISettings;
  userId?: string;
  dispatch: IDispatch;
  stats: IStats;
  allPrograms: IProgram[];
  currentProgramId?: string;
}

export function ScreenFinishDay(props: IProps): JSX.Element {
  const userId = CloudStore.use().session?.userId;
  const friends = FriendsStore.use();
  const isOfflineBuild = OfflineOnly_isEnabled();
  useEffect(() => {
    if (isOfflineBuild && userId != null) {
      FriendsClient_load().catch(() => undefined);
    }
  }, [isOfflineBuild, userId]);
  const recordById =
    props.historyRecordId != null ? props.history.find((h) => h.id === props.historyRecordId) : undefined;
  const record = recordById ?? props.history[0];
  useEffect(() => {
    ReportStore.update((log) =>
      FinishDayActions_saveReport(log, record, props.history, props.settings, isOfflineBuild)
    ).catch(() => undefined);
  }, [record?.id, isOfflineBuild]);

  const { dispatch } = props;
  const onClose = useCallback((): boolean => {
    dispatch(Thunk_pushScreen("main", undefined, { tab: "home" }));
    dispatch(Thunk_maybeRequestReview());
    dispatch(Thunk_maybeRequestSignup());
    return false;
  }, [dispatch]);

  useNavOptions({ navTitle: record?.dayName ?? "", navOnBack: onClose });

  // On the very first workout, history is momentarily empty between the
  // navigate-to-finishDay and the FinishProgramDayAction commit, so `record`
  // is undefined for one render until the committed record arrives.
  if (record == null) {
    return <></>;
  }

  const allPrs = History_getPersonalRecords(props.history);
  const totalWeight = History_totalRecordWeight(record, props.settings);

  const startedEntries = History_getStartedEntries(record);
  const totalReps = History_totalRecordReps(record);
  const totalSets = History_totalRecordSets(record);

  const historyCollector = Collector.build([record]).addFn(History_collectMuscleGroups(props.settings));
  const [muscleGroupsData] = historyCollector.run();
  const muscleGroups = ObjectUtils_keys(muscleGroupsData).reduce<[IScreenMuscle, number][]>((memo, mg) => {
    const values = muscleGroupsData[mg];
    if (values[2][0] > 0 && mg !== "total") {
      memo.push([mg, values[2][0]]);
    }
    return memo;
  }, []);
  muscleGroups.sort((a, b) => b[1] - a[1]);
  const muscleGroupsGrouped = CollectionUtils_splitIntoNGroups(muscleGroups, 2);
  const actions = FinishDayActions_list({
    hasFriends: FinishDayActions_hasFriends(friends, userId),
    isOfflineBuild,
    exportAvailable: true,
    hasExercises: startedEntries.length > 0,
  });

  const blocks: Record<IFinishDayAction, JSX.Element> = {
    cloudBackup: <CloudBackupAfterWorkout dispatch={props.dispatch} />,
    bear: <BearFinishBanner record={record} />,
    workout: (
      <View className="items-center px-gutter pb-2">
        <Text className="text-sm text-text-secondary">{record.programName}</Text>
        <Text className="text-base">{record.dayName}</Text>
      </View>
    ),
    share: (
      <WorkoutStoryCardSection
        record={record}
        history={props.history}
        settings={props.settings}
        stats={props.stats}
        musicEnabled={true}
        onMusic={() => props.dispatch(Thunk_pushScreen("music"))}
      />
    ),
    feedShare: <FeedShareToggle record={record} history={props.history} settings={props.settings} />,
    totals: (
      <View className="px-4 pt-2 pb-3 rounded-lg bg-background-purpledark" testID="totals-summary">
        <GroupHeader name="Totals" />
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Text className="text-sm">
              <Text className="mr-1">🕐</Text> Time:{" "}
              <Text className="font-bold">{TimeUtils_formatHHMM(History_workoutTime(record))} h</Text>
            </Text>
            <Text className="text-sm">
              <Text className="mr-1">🏋</Text> Volume: <Text className="font-bold">{Weight_display(totalWeight)}</Text>
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm">
              <Text className="mr-1">💪</Text> Sets: <Text className="font-bold">{totalSets}</Text>
            </Text>
            <Text className="text-sm">
              <Text className="mr-1">🔄</Text> Reps: <Text className="font-bold">{totalReps}</Text>
            </Text>
          </View>
        </View>
      </View>
    ),
    exercises: (
      <View className="px-4 py-2 mt-2 rounded-lg bg-background-purpledark" testID="completed-exercises">
        <GroupHeader name="Exercises" />
        {startedEntries.map((entry, i) => {
          return (
            <HistoryEntryView
              key={`${entry.exercise.id}_${entry.exercise.equipment}`}
              showNotes={false}
              entry={entry}
              isNext={false}
              isLast={i === startedEntries.length - 1}
              settings={props.settings}
            />
          );
        })}
      </View>
    ),
    muscleGroups: (
      <View className="px-4 py-2 mt-2 rounded-lg bg-background-purpledark" testID="sets-per-muscle-group">
        <GroupHeader name="Sets per muscle group" />
        <View className="flex-row gap-4">
          {muscleGroupsGrouped.map((group, gi) => {
            return (
              <View key={gi} className="flex-1">
                {group.map(([mg, value]) => {
                  return (
                    <Text key={mg} className="text-sm">
                      {Muscle_getMuscleGroupName(mg, props.settings)}: <Text className="font-bold">{n(value)}</Text>
                    </Text>
                  );
                })}
              </View>
            );
          })}
        </View>
      </View>
    ),
    personalRecords: (
      <View className="px-gutter py-4 mt-4">
        <PersonalRecords prs={allPrs} historyRecords={[record]} settings={props.settings} />
      </View>
    ),
  };

  return (
    <>
      <View className="px-gutter pb-6">
        {actions.map((action) => (
          <Fragment key={action}>{blocks[action]}</Fragment>
        ))}
      </View>
      <Confetti />
    </>
  );
}
