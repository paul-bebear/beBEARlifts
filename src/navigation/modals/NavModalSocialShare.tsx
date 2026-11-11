import { JSX, useEffect } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { FormSheet } from "../FormSheet";
import { WorkoutStoryCardSection } from "../../components/workoutStoryCard";
import { WorkoutShareMenu_record } from "../../models/workoutShareMenu";
import type { IRootStackParamList } from "../types";

export function NavModalSocialShare(): JSX.Element {
  const { state } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{ key: string; name: "socialShareModal"; params: IRootStackParamList["socialShareModal"] }>();
  const { progressId, historyRecordId } = route.params;

  const record = WorkoutShareMenu_record({
    progressId,
    historyRecordId,
    history: state.storage.history,
    storedProgress: state.storage.progress?.[0],
    progress: state.progress,
  });

  const shouldGoBack = record == null;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (record == null) {
    return <></>;
  }

  return (
    <SheetScreenContainer onClose={() => navigation.goBack()} shouldShowClose={true}>
      <FormSheet>
        <WorkoutStoryCardSection
          record={record}
          history={state.storage.history}
          settings={state.storage.settings}
          stats={state.storage.stats}
          musicEnabled={false}
        />
      </FormSheet>
    </SheetScreenContainer>
  );
}
