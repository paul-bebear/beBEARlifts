import { JSX, useEffect, useState } from "react";
import { View } from "react-native";
import { IHistoryRecord, ISettings } from "../types";
import { History_getPersonalRecords } from "../models/history";
import { Feed_shareStatus } from "../models/feed";
import { Friends_forUser } from "../models/friends";
import { MusicLog_sessionForWorkout } from "../models/musicLog";
import { MusicSession_counts } from "../models/musicSession";
import { IWorkoutPostSummary, WorkoutPost_build } from "../models/workoutPost";
import { FeedClient_setShared, FeedClient_shareOnFinish, FeedStore } from "../utils/feedClient";
import { FriendsStore } from "../utils/friendsClient";
import { MusicStore_load } from "../utils/musicStore";
import { CloudStore, ICloudResult } from "../utils/supabaseClient";
import { Switch } from "./primitives/switch";
import { Text } from "./primitives/text";

interface IProps {
  record: IHistoryRecord;
  history: IHistoryRecord[];
  settings: ISettings;
}

const statusText = {
  shared: "Friends can see this workout.",
  sending: "Shares when the phone is back online.",
  notShared: "Only you can see this workout.",
};

export function FeedShareToggle(props: IProps): JSX.Element | null {
  const userId = CloudStore.use().session?.userId;
  const me = Friends_forUser(FriendsStore.use(), userId).me;
  const feed = FeedStore.use();
  const [error, setError] = useState<string | undefined>(undefined);

  const build = async (): Promise<IWorkoutPostSummary> => {
    const session = MusicLog_sessionForWorkout(await MusicStore_load(), props.record);
    const kept = session != null ? MusicSession_counts(session).kept : undefined;
    return WorkoutPost_build(props.record, props.settings, History_getPersonalRecords(props.history), kept);
  };
  const report = (result: ICloudResult<undefined>): void => setError(result.ok ? undefined : result.error);

  useEffect(() => {
    if (userId != null && me != null) {
      FeedClient_shareOnFinish(props.record.id, build).then(report);
    }
  }, [userId, me != null, props.record.id]);

  if (userId == null) {
    return null;
  }
  if (me == null) {
    return (
      <Text className="px-4 py-2 text-sm text-text-secondary">
        Pick a handle in the Friends tab to share workouts with friends.
      </Text>
    );
  }
  const status = Feed_shareStatus(feed, userId, props.record.id);
  return (
    <View className="px-4 py-3 mt-2 rounded-lg bg-background-purpledark" testID="feed-share">
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold">Share with friends</Text>
        <Switch
          testID="feed-share-toggle"
          value={status !== "notShared"}
          onValueChange={async (on) =>
            report(await FeedClient_setShared(props.record.id, on ? await build() : undefined))
          }
        />
      </View>
      <Text className="mt-1 text-sm text-text-secondary">{statusText[status]}</Text>
      {error != null && error !== "No connection" && (
        <Text className="mt-1 text-sm text-text-error" accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
}
