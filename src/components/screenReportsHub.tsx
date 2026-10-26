import { JSX, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { useTrackedDispatch } from "../navigation/TrackedStateContext";
import { NavScreenContent } from "../navigation/NavScreenContent";
import { useNavOptions } from "../navigation/useNavOptions";
import { navigateToModal } from "../navigation/navigationService";
import { Thunk_pushScreen } from "../ducks/thunks";
import { FoodLog_dayKey } from "../models/foodLog";
import { Notes_canEditCheckIn, Notes_checkIn } from "../models/notes";
import { IReportsHubRow, ReportsHub_actionEffect, ReportsHub_groups, ReportsHub_title } from "../models/reportsHub";
import { NotesStore } from "../utils/notesStore";
import { OfflineOnly_isEnabled } from "../utils/offlineOnly";
import { RunSensors_isAvailable } from "../utils/runSensors";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { useBearHoney } from "../utils/useBearHoney";
import { IconChevronRight } from "./icons/iconFoodUi";
import { CheckInChart } from "./checkInChart";
import { HoneySheet } from "./honeySheet";
import { JournalCheckIn } from "./journalCheckIn";
import { ProgramCardSection, StatsSections } from "./screenProgressDashboard";

function GroupTitle(props: { title: string }): JSX.Element {
  return (
    <Text className="px-4 pt-4 pb-2 text-xs font-semibold tracking-wide uppercase text-text-secondary">
      {props.title}
    </Text>
  );
}

function HubRow(props: { row: IReportsHubRow; onPress: () => void }): JSX.Element {
  const { row } = props;
  return (
    <Pressable
      testID={`reports-hub-${row.id}`}
      data-testid={`reports-hub-${row.id}`}
      onPress={props.onPress}
      className="flex-row items-center px-4 py-4 mx-4 mb-2 rounded-2xl bg-background-subtle"
    >
      <View className="flex-1">
        <Text className="text-base font-semibold">{row.title}</Text>
        <Text className="text-sm text-text-secondary">{row.subtitle}</Text>
      </View>
      <IconChevronRight size={16} color={Tailwind_semantic().icon.neutral} />
    </Pressable>
  );
}

function HoneySheetHost(props: { onClose: () => void }): JSX.Element {
  const honey = useBearHoney();
  return <HoneySheet balance={honey.balance} today={honey.today} onClose={props.onClose} />;
}

function TodayCheckIn(props: { day: string }): JSX.Element {
  const checkIn = Notes_checkIn(NotesStore.use(), props.day);
  return (
    <View testID="reports-hub-check-ins-panel" data-testid="reports-hub-check-ins-panel" className="pb-2">
      <JournalCheckIn day={props.day} checkIn={checkIn} isEditable={Notes_canEditCheckIn(props.day, props.day)} />
      <View className="pt-4">
        <CheckInChart />
      </View>
    </View>
  );
}

export function ScreenReportsHub(): JSX.Element {
  const dispatch = useTrackedDispatch();
  const [isHoneyOpen, setIsHoneyOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  useNavOptions({ navTitle: ReportsHub_title });
  const today = FoodLog_dayKey(new Date());
  const groups = ReportsHub_groups({
    isOffline: OfflineOnly_isEnabled(),
    hasRunSensors: RunSensors_isAvailable(),
    today,
  });

  const open = (row: IReportsHubRow): void => {
    const effect = ReportsHub_actionEffect(row);
    switch (effect.type) {
      case "pushScreen":
        dispatch(Thunk_pushScreen(effect.screen, undefined, effect.opts));
        return;
      case "modal":
        navigateToModal(effect.name);
        return;
      case "noteModal":
        navigateToModal("noteEditorModal", { day: effect.day });
        return;
      case "openHoney":
        setIsHoneyOpen(true);
        return;
      case "toggleCheckIn":
        setIsCheckInOpen(!isCheckInOpen);
        return;
    }
  };

  return (
    <NavScreenContent>
      <View className="pt-2 pb-6" testID="reports-hub" data-testid="reports-hub">
        {groups.map((group) => (
          <View key={group.id} testID={`reports-hub-group-${group.id}`} data-testid={`reports-hub-group-${group.id}`}>
            <GroupTitle title={group.title} />
            {group.hasProgramCard && <ProgramCardSection />}
            {group.hasStatsSections && <StatsSections />}
            {group.rows.map((row) => (
              <View key={row.id}>
                <HubRow row={row} onPress={() => open(row)} />
                {row.action.kind === "checkIn" && isCheckInOpen && <TodayCheckIn day={today} />}
              </View>
            ))}
          </View>
        ))}
      </View>
      {isHoneyOpen && <HoneySheetHost onClose={() => setIsHoneyOpen(false)} />}
    </NavScreenContent>
  );
}
