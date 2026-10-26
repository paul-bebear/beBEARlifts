import { JSX, useState } from "react";
import { View } from "react-native";
import { IDispatch } from "../ducks/types";
import { ICloudRestoreOffer } from "../models/cloudBackup";
import {
  CloudBackupCompare_offerText,
  CloudBackupCompare_offerTitle,
  CloudBackupCompare_when,
} from "../models/cloudBackupCompare";
import { Thunk_cloudKeepPhone, Thunk_cloudRestore } from "../ducks/cloudBackupThunks";
import { CloudStore, ICloudResult } from "../utils/supabaseClient";
import { Dialog_alert } from "../utils/dialog";
import { Button } from "./button";
import { Text } from "./primitives/text";

export function CloudRestoreChoice(props: {
  offer: ICloudRestoreOffer;
  busy: boolean;
  onRestore: () => void;
  onKeep: () => void;
}): JSX.Element {
  return (
    <View className="p-3 border rounded-lg border-border-prominent" style={{ gap: 12 }} testID="cloud-restore-offer">
      <Text className="text-sm font-semibold">{CloudBackupCompare_offerTitle(props.offer)}</Text>
      <Text className="text-sm">
        {CloudBackupCompare_offerText(props.offer, CloudBackupCompare_when(props.offer.cloud.exportedAt))}
      </Text>
      <Button name="cloud-offer-restore" kind="purple" disabled={props.busy} onClick={props.onRestore}>
        Restore cloud backup
      </Button>
      <Button name="cloud-offer-keep" kind="lightgrayv3" disabled={props.busy} onClick={props.onKeep}>
        Keep this phone's data
      </Button>
    </View>
  );
}

export function CloudRestoreBanner(props: { dispatch: IDispatch }): JSX.Element | null {
  const offer = CloudStore.use().restoreOffer;
  const [busy, setBusy] = useState(false);
  if (offer == null) {
    return null;
  }
  const done = (result: ICloudResult<boolean>): void => {
    setBusy(false);
    if (!result.ok) {
      Dialog_alert(result.error);
    }
  };
  return (
    <View className="mx-4 mb-3">
      <CloudRestoreChoice
        offer={offer}
        busy={busy}
        onRestore={() => {
          setBusy(true);
          props.dispatch(Thunk_cloudRestore("latest", done));
        }}
        onKeep={() => {
          setBusy(true);
          props.dispatch(Thunk_cloudKeepPhone(done));
        }}
      />
    </View>
  );
}
