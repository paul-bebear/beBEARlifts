import { JSX, useState } from "react";
import { View } from "react-native";
import { lb } from "lens-shmens";
import { Text } from "./primitives/text";
import { MenuItemWrapper } from "./menuItem";
import { MenuItemEditable } from "./menuItemEditable";
import { CloudBackupCard } from "./cloudBackupCard";
import { JournalExportSheet } from "./journalExportSheet";
import { useJournalSources } from "../utils/useJournalSources";
import { Thunk_exportEverything } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { EffortRating_isEnabled } from "../models/effortRating";
import { OfflineOnly_isEnabled } from "../utils/offlineOnly";
import { ISettings } from "../types";

export function SettingsRateEachSet(props: { settings: ISettings; dispatch: IDispatch }): JSX.Element {
  return (
    <MenuItemEditable
      type="boolean"
      name="Rate each set"
      value={EffortRating_isEnabled(props.settings) ? "true" : "false"}
      onChange={(newValue) => {
        props.dispatch({
          type: "UpdateSettings",
          lensRecording: lb<ISettings>()
            .p("rateEachSet")
            .record(newValue === "true"),
          desc: "Toggle rate each set",
        });
      }}
    />
  );
}

export function SettingsBackupRows(props: { dispatch: IDispatch }): JSX.Element {
  return (
    <>
      {OfflineOnly_isEnabled() && <CloudBackupCard dispatch={props.dispatch} />}
      <MenuItemWrapper name="Export everything" onClick={() => props.dispatch(Thunk_exportEverything())}>
        <View className="py-3">
          <Text className="text-base text-text-primary">Export everything</Text>
          <Text className="text-xs text-text-secondary">
            Workouts, body stats, food and music in one file. Save it to iCloud, or give it to an AI.
          </Text>
        </View>
      </MenuItemWrapper>
      <SettingsJournalExport />
    </>
  );
}

function SettingsJournalExportSheet(props: { onClose: () => void }): JSX.Element {
  return <JournalExportSheet sources={useJournalSources()} onClose={props.onClose} />;
}

function SettingsJournalExport(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <MenuItemWrapper name="Export journal" onClick={() => setIsOpen(true)}>
        <View className="py-3">
          <Text className="text-base text-text-primary">Export journal</Text>
          <Text className="text-xs text-text-secondary">A day, a week or every day, as Markdown or CSV.</Text>
        </View>
      </MenuItemWrapper>
      {isOpen && <SettingsJournalExportSheet onClose={() => setIsOpen(false)} />}
    </>
  );
}
