import { JSX, useState } from "react";
import { View } from "react-native";
import { lb } from "lens-shmens";
import { Text } from "./primitives/text";
import { MenuItemWrapper } from "./menuItem";
import { MenuItemEditable } from "./menuItemEditable";
import { CloudBackupCard } from "./cloudBackupCard";
import { JournalExportSheet } from "./journalExportSheet";
import { BearLookSheet } from "./bearLookSheet";
import { MenuItem } from "./menuItem";
import { useJournalSources } from "../utils/useJournalSources";
import { useBear } from "../utils/useBear";
import { BearStore } from "../utils/bearStore";
import { BearLook_setFur, BearLook_summary } from "../models/bearLook";
import { BearCelebration_setLine } from "../models/bearCelebration";
import { Thunk_exportEverything } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { EffortRating_isEnabled } from "../models/effortRating";
import { OfflineOnly_isEnabled } from "../utils/offlineOnly";
import { AccountPlan_settingsRow } from "../models/accountPlan";
import { AccountPlanStore } from "../utils/accountPlanClient";
import { PlusOfferClient_open, PlusOfferClient_restore } from "../utils/plusOfferClient";
import { Purchases_isAvailable, Purchases_manage } from "../utils/purchases";
import { CloudStore } from "../utils/supabaseClient";
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

function SettingsPlusRows(): JSX.Element | null {
  const plan = AccountPlanStore.use();
  const userId = CloudStore.use().session?.userId;
  if (!Purchases_isAvailable()) {
    return null;
  }
  const row = AccountPlan_settingsRow(plan, userId);
  const onClick = row.action === "open" ? PlusOfferClient_open : row.action === "manage" ? Purchases_manage : undefined;
  return (
    <>
      <MenuItemWrapper name="bebear-plus" onClick={onClick == null ? undefined : () => onClick()}>
        <View className="py-3">
          <Text className="text-base text-text-primary">{row.title}</Text>
          {row.subtitle != null && <Text className="text-xs text-text-secondary">{row.subtitle}</Text>}
        </View>
      </MenuItemWrapper>
      <MenuItemWrapper name="bebear-plus-restore" onClick={() => PlusOfferClient_restore()}>
        <View className="py-3">
          <Text className="text-base text-text-primary">Restore purchases</Text>
        </View>
      </MenuItemWrapper>
    </>
  );
}

export function SettingsBackupRows(props: { dispatch: IDispatch }): JSX.Element {
  return (
    <>
      <SettingsPlusRows />
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

export function SettingsBearRow(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const { state } = useBear();
  return (
    <>
      <MenuItem
        name="Your bear"
        value={BearLook_summary(state.line, state.fur)}
        shouldShowRightArrow={true}
        onClick={() => setIsOpen(true)}
      />
      {isOpen && (
        <BearLookSheet
          line={state.line}
          fur={state.fur}
          onLine={(line) => BearStore.update((saved) => BearCelebration_setLine(saved, line)).catch(() => undefined)}
          onFur={(fur) => BearStore.update((saved) => BearLook_setFur(saved, fur)).catch(() => undefined)}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
