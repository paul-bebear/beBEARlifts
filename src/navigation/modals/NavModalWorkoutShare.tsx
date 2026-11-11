import { JSX, useEffect } from "react";
import { View, Platform } from "react-native";
import { Dialog_alert } from "../../utils/dialog";
import { useRoute, useNavigation, StackActions } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { FormSheet } from "../FormSheet";
import { BottomSheetItem } from "../../components/bottomSheetItem";
import { IconPicture } from "../../components/icons/iconPicture";
import { IconLink } from "../../components/icons/iconLink";
import { IconDoc } from "../../components/icons/iconDoc";
import { IconHeart } from "../../components/icons/iconHeart";
import { ClipboardUtils_copy } from "../../utils/clipboard";
import { Share_generateLink } from "../../models/share";
import { WorkoutOutcome_healthPayload } from "../../models/workoutOutcome";
import { IWorkoutShareRow, WorkoutShareMenu_record, WorkoutShareMenu_rows } from "../../models/workoutShareMenu";
import { Thunk_saveWorkoutToHealth } from "../../ducks/thunks";
import { LiftohistorySerializer_serialize } from "../../liftohistory/liftohistorySerializer";
import { HealthSync_eligibleForAppleHealth, HealthSync_eligibleForGoogleHealth } from "../../lib/healthSync";
import type { IRootStackParamList } from "../types";

export function NavModalWorkoutShare(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "workoutShareModal";
    params: IRootStackParamList["workoutShareModal"];
  }>();
  const { progressId } = route.params;

  const progress = WorkoutShareMenu_record({
    progressId,
    history: state.storage.history,
    storedProgress: state.storage.progress?.[0],
    progress: state.progress,
  });

  const shouldGoBack = !progress;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack || !progress) {
    return <></>;
  }

  const onClose = (): void => {
    navigation.goBack();
  };

  const healthName = Platform.OS === "ios" ? "Apple Health" : "Google Health";
  const rows = WorkoutShareMenu_rows({
    isMobile: Platform.OS === "ios" || Platform.OS === "android",
    healthEligible: HealthSync_eligibleForAppleHealth() || HealthSync_eligibleForGoogleHealth(),
  });

  const renderRow = (row: IWorkoutShareRow, isFirst: boolean): JSX.Element => {
    switch (row) {
      case "shareCards":
        return (
          <BottomSheetItem
            name="share-cards"
            title="Share cards"
            isFirst={isFirst}
            description={""}
            icon={<IconPicture size={24} />}
            onClick={() => navigation.dispatch(StackActions.replace("socialShareModal", { progressId }))}
          />
        );
      case "health":
        return (
          <BottomSheetItem
            name="submit-to-health"
            title={`Sync to ${healthName}`}
            isFirst={isFirst}
            description={""}
            icon={<IconHeart size={24} />}
            onClick={() => {
              dispatch(
                Thunk_saveWorkoutToHealth({
                  ...WorkoutOutcome_healthPayload(progress),
                  source: "finish",
                  successAlert: true,
                })
              );
              onClose();
            }}
          />
        );
      case "link":
        return (
          <BottomSheetItem
            name="share-to-link"
            title="Copy link to workout"
            isFirst={isFirst}
            description={""}
            icon={<IconLink />}
            onClick={() => {
              if (state.user?.id) {
                const link = Share_generateLink(state.user.id, progress.id);
                ClipboardUtils_copy(link);
                Dialog_alert("Copied!");
              } else {
                Dialog_alert("You should be logged in to copy link to a workout");
              }
            }}
          />
        );
      case "text":
        return (
          <BottomSheetItem
            name="share-to-text"
            title="Copy as Text"
            isFirst={isFirst}
            description={""}
            icon={<IconDoc width={24} height={24} />}
            onClick={() => {
              const text = LiftohistorySerializer_serialize(progress, state.storage.settings);
              ClipboardUtils_copy(text);
              Dialog_alert("Copied!");
              onClose();
            }}
          />
        );
    }
  };

  return (
    <SheetScreenContainer onClose={onClose} shouldShowClose={true} fitContent={true}>
      <FormSheet>
        <View className="pb-4">
          {rows.map((row, i) => (
            <View key={row}>{renderRow(row, i === 0)}</View>
          ))}
        </View>
      </FormSheet>
    </SheetScreenContainer>
  );
}
