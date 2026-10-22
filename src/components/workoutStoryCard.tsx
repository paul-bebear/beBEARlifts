import { JSX, useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { IHistoryRecord, ISettings, IStats } from "../types";
import {
  IShareCardPage,
  IWorkoutShareData,
  WorkoutStoryCard_build,
  WorkoutStoryCard_pageLabel,
  WorkoutStoryCard_pages,
} from "../models/workoutStoryCard";
import { History_getPersonalRecords } from "../models/history";
import { ShareAchievements_build } from "../models/shareAchievements";
import { DailyChecklist_doneDays } from "../models/dailyChecklist";
import { useFoodLog } from "../utils/foodLogStore";
import { BearStore } from "../utils/bearStore";
import { BearTier_setFor } from "../models/bearTier";
import { BearGrowth_history } from "../models/bearGrowth";
import { ProgressPhotoPick_pick } from "../utils/progressPhotoPick";
import { Dialog_alert } from "../utils/dialog";
import { ShareCardImage_prepareAhead } from "../utils/shareCardImage";
import { Text } from "./primitives/text";
import { IconCamera } from "./icons/iconCamera";
import { IconShare } from "./icons/iconShare";
import { IconSpeaker } from "./icons/iconSpeaker";
import { FinishDayActions_list } from "../models/finishDayActions";
import { GroupHeader } from "./groupHeader";
import { ShareCardPager } from "./shareCards/shareCardPager";
import { ShareCardExportSurface } from "./shareCards/shareCardExportSurface";
import { WorkoutSharePage } from "./shareCards/workoutSharePage";
import { useShareCardExport } from "./shareCards/useShareCardExport";

interface IProps {
  record: IHistoryRecord;
  history: IHistoryRecord[];
  settings: ISettings;
  stats: IStats;
  musicEnabled: boolean;
  onMusic: () => void;
}

interface IFrozen {
  data: IWorkoutShareData;
  photo?: string;
}

export function WorkoutStoryCardSection(props: IProps): JSX.Element {
  const [page, setPage] = useState<IShareCardPage>("rank");
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [seed] = useState(() => Math.floor(Date.now() / 1000));
  const foodLog = useFoodLog();
  const tierSet = BearTier_setFor(foodLog.profile.sex, BearStore.use().line);
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
    () => WorkoutStoryCard_build({ record: props.record, settings: props.settings, prs, achievements, tierSet, seed }),
    [props.record, props.settings, prs, achievements, tierSet, seed]
  );
  const actions = FinishDayActions_list({ musicEnabled: props.musicEnabled, exportAvailable: true });
  const frozen = exporter.job.frozen;
  const dataKey = JSON.stringify(data);
  const { prepare } = exporter;
  useEffect(() => {
    if (ShareCardImage_prepareAhead) {
      prepare([...WorkoutStoryCard_pages], { data, photo }, photo);
    }
  }, [dataKey, photo]);
  const share = (pages: IShareCardPage[]): void => {
    const usesPhoto = pages.some((p) => p === "photo" || p === "collage");
    exporter.share(pages, { data, photo }, usesPhoto ? photo : undefined);
  };

  const pickPhoto = async (): Promise<void> => {
    try {
      setPhoto(await ProgressPhotoPick_pick("photo-library"));
    } catch {
      Dialog_alert("Couldn't open that photo. Try another one.");
    }
  };

  return (
    <View className="py-4" testID="workout-story" data-testid="workout-story">
      <View className="px-gutter">
        <GroupHeader name="Share cards" />
      </View>
      <ShareCardPager
        pages={WorkoutStoryCard_pages}
        page={page}
        label={(p) => WorkoutStoryCard_pageLabel(p as IShareCardPage)}
        onPageChange={(p) => setPage(p as IShareCardPage)}
        renderPage={(p) => <WorkoutSharePage page={p as IShareCardPage} data={data} photo={photo} />}
      />
      <View className="flex-row justify-center px-gutter mt-3" style={{ gap: 24 }}>
        {actions.map((action) => {
          if (action === "photo") {
            return (
              <FinishActionButton
                key={action}
                testID="workout-story-photo"
                label={photo == null ? "Add photo" : "Change photo"}
                icon={<IconCamera size={22} />}
                disabled={exporter.isBusy}
                onPress={pickPhoto}
              />
            );
          }
          if (action === "share") {
            return (
              <FinishActionButton
                key={action}
                testID="workout-story-share"
                label={exporter.title("Share")}
                icon={<IconShare size={26} />}
                disabled={exporter.isBusy}
                onPress={() => share([page])}
              />
            );
          }
          return (
            <FinishActionButton
              key={action}
              testID="finish-day-music"
              label="Music"
              icon={<IconSpeaker size={22} />}
              onPress={props.onMusic}
            />
          );
        })}
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
            <WorkoutSharePage
              page={p as IShareCardPage}
              data={frozen.data}
              photo={frozen.photo}
              onPhotoLoad={exporter.onPhotoLoad}
            />
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
