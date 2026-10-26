import { JSX, useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { IHistoryRecord, ISettings, IStats } from "../types";
import {
  IShareCardPage,
  IWorkoutShareData,
  WorkoutStoryCard_build,
  WorkoutStoryCard_exportImages,
  WorkoutStoryCard_pages,
} from "../models/workoutStoryCard";
import { History_getPersonalRecords } from "../models/history";
import { ShareAchievements_build } from "../models/shareAchievements";
import { DailyChecklist_doneDays } from "../models/dailyChecklist";
import { useFoodLog } from "../utils/foodLogStore";
import { BearStore } from "../utils/bearStore";
import { BearTier_setFor } from "../models/bearTier";
import { BearGrowth_history } from "../models/bearGrowth";
import { ShareCardImage_prepareAhead } from "../utils/shareCardImage";
import { Text } from "./primitives/text";
import { IconShare } from "./icons/iconShare";
import { ShareCardExportSurface } from "./shareCards/shareCardExportSurface";
import { WorkoutSharePage } from "./shareCards/workoutSharePage";
import { useShareCardExport } from "./shareCards/useShareCardExport";

interface IProps {
  record: IHistoryRecord;
  history: IHistoryRecord[];
  settings: ISettings;
  stats: IStats;
}

interface IFrozen {
  data: IWorkoutShareData;
}

const firstPage: IShareCardPage[] = [WorkoutStoryCard_pages[0]];

export function WorkoutStoryCardSection(props: IProps): JSX.Element {
  const [seed] = useState(() => Math.floor(Date.now() / 1000));
  const foodLog = useFoodLog();
  const { line, fur } = BearStore.use();
  const tierSet = BearTier_setFor(foodLog.profile.sex, line);
  const growth = useMemo(
    () => BearGrowth_history(props.history, props.settings, props.stats),
    [props.history, props.settings, props.stats]
  );
  const exporter = useShareCardExport<IFrozen>("bebear-workout");
  const prs = useMemo(() => History_getPersonalRecords(props.history), [props.history]);

  const achievements = useMemo(
    () =>
      ShareAchievements_build({
        history: props.history,
        prs,
        doneDays: DailyChecklist_doneDays({ foodLog, workouts: growth.workouts }),
        foodLog,
        workouts: growth.workouts,
        settings: props.settings,
        tierSet,
      }),
    [props.history, prs, growth, foodLog, props.settings, tierSet]
  );
  const data = useMemo(
    () =>
      WorkoutStoryCard_build({
        record: props.record,
        settings: props.settings,
        prs,
        achievements,
        tierSet,
        line,
        fur,
        seed,
      }),
    [props.record, props.settings, prs, achievements, tierSet, line, fur, seed]
  );
  const frozen = exporter.job.frozen;
  const dataKey = JSON.stringify(data);
  const { prepare } = exporter;
  useEffect(() => {
    if (ShareCardImage_prepareAhead) {
      prepare(firstPage, { data }, WorkoutStoryCard_exportImages(data, firstPage));
    }
  }, [dataKey]);
  const share = (): void => {
    exporter.share(firstPage, { data }, WorkoutStoryCard_exportImages(data, firstPage));
  };

  return (
    <View className="py-4" testID="workout-story" data-testid="workout-story">
      <View className="flex-row justify-center px-gutter">
        <FinishActionButton
          testID="workout-story-share"
          label={exporter.title("Share")}
          icon={<IconShare size={26} />}
          disabled={exporter.isBusy}
          onPress={share}
        />
      </View>
      {exporter.job.error != null && (
        <View className="px-gutter">
          <Text className="mt-2 text-sm text-text-error">{exporter.job.error}</Text>
        </View>
      )}
      {frozen != null && exporter.needsSurface && (
        <ShareCardExportSurface
          key={exporter.job.id}
          pages={exporter.job.pages}
          setRef={exporter.setRef}
          onLayout={exporter.onLayout}
          renderPage={(p) => (
            <WorkoutSharePage page={p as IShareCardPage} data={frozen.data} onImageLoad={exporter.onImageLoad} />
          )}
        />
      )}
    </View>
  );
}

interface IFinishActionButtonProps {
  testID: string;
  label: string;
  icon: JSX.Element;
  disabled?: boolean;
  onPress: () => void;
}

function FinishActionButton(props: IFinishActionButtonProps): JSX.Element {
  return (
    <View className="items-center" style={{ width: 72 }}>
      <Pressable
        testID={props.testID}
        data-testid={props.testID}
        disabled={props.disabled}
        accessibilityRole="button"
        accessibilityLabel={props.label}
        onPress={props.onPress}
        className="items-center justify-center rounded-full bg-background-subtle"
        style={{ width: 48, height: 48, opacity: props.disabled ? 0.4 : 1 }}
      >
        {props.icon}
      </Pressable>
      <Text className="mt-1 text-xs text-center text-text-secondary">{props.label}</Text>
    </View>
  );
}
