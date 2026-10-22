import { JSX, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { IHistoryRecord, ISettings, IStats } from "../types";
import {
  IShareCardPage,
  IWorkoutShareData,
  WorkoutStoryCard_build,
  WorkoutStoryCard_pageLabel,
  WorkoutStoryCard_pages,
  WorkoutStoryCard_styles,
} from "../models/workoutStoryCard";
import { History_getPersonalRecords } from "../models/history";
import { ShareAchievements_build } from "../models/shareAchievements";
import { DailyChecklist_doneDays } from "../models/dailyChecklist";
import { useFoodLog } from "../utils/foodLogStore";
import { ChecklistStore } from "../utils/checklistStore";
import { ProgressPhotoPick_pick } from "../utils/progressPhotoPick";
import { Dialog_alert } from "../utils/dialog";
import { ShareCardImage_prepareAhead } from "../utils/shareCardImage";
import { Text } from "./primitives/text";
import { FoodPrimaryButton } from "./foodUi";
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
}

interface IFrozen {
  data: IWorkoutShareData;
  photo?: string;
}

export function WorkoutStoryCardSection(props: IProps): JSX.Element {
  const [page, setPage] = useState<IShareCardPage>("rank");
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [seed, setSeed] = useState(() => Math.floor(Date.now() / 1000));
  const foodLog = useFoodLog();
  const checklistLog = ChecklistStore.use();
  const exporter = useShareCardExport<IFrozen>("bebear-workout");
  const prs = useMemo(() => History_getPersonalRecords(props.history), [props.history]);

  const achievements = useMemo(
    () =>
      ShareAchievements_build({
        history: props.history,
        prs,
        doneDays: DailyChecklist_doneDays({ stats: props.stats, foodLog, log: checklistLog }),
        foodLog,
        settings: props.settings,
      }),
    [props.history, prs, props.stats, foodLog, checklistLog, props.settings]
  );
  const data = useMemo(
    () => WorkoutStoryCard_build({ record: props.record, settings: props.settings, prs, achievements, seed }),
    [props.record, props.settings, prs, achievements, seed]
  );
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
      <View className="px-gutter">
        <View className="flex-row mt-3" style={{ gap: 8 }}>
          <FoodPrimaryButton
            testID="workout-story-photo"
            kind="outline"
            title={photo == null ? "Add photo" : "Change photo"}
            disabled={exporter.isBusy}
            onPress={pickPhoto}
          />
          {data.equivalent != null && (
            <FoodPrimaryButton
              testID="workout-story-shuffle"
              kind="outline"
              title="Shuffle"
              disabled={exporter.isBusy}
              onPress={() => setSeed((value) => value + 1)}
            />
          )}
        </View>
        <View className="flex-row mt-2" style={{ gap: 8 }}>
          <FoodPrimaryButton
            testID="workout-story-share"
            title={exporter.title("Share")}
            disabled={exporter.isBusy}
            onPress={() => share([page])}
          />
          <FoodPrimaryButton
            testID="workout-story-share-all"
            kind="outline"
            title={
              exporter.job.phase === "ready" || exporter.job.phase === "failed" ? exporter.title("") : "Share all 4"
            }
            disabled={exporter.isBusy}
            onPress={() => share([...WorkoutStoryCard_styles])}
          />
        </View>
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
