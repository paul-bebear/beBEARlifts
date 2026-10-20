import { JSX } from "react";
import { View } from "react-native";
import { Feed_ago, IFeedItem } from "../models/feed";
import { WorkoutPost_setText, WorkoutPost_statsLine } from "../models/workoutPost";
import { Text } from "./primitives/text";

interface IProps {
  items: IFeedItem[];
  loadedAt?: number;
  now: number;
}

function Post(props: { item: IFeedItem; now: number }): JSX.Element {
  const { post, author, isMine } = props.item;
  const summary = post.summary;
  return (
    <View className="p-4 my-2 rounded-2xl bg-background-subtle" testID="feed-post">
      <View className="flex-row items-baseline justify-between">
        <Text className="flex-1 text-sm">
          <Text className="font-bold">{isMine ? "You" : author.displayName}</Text>
          {!isMine && <Text className="text-text-secondary"> @{author.handle}</Text>}
        </Text>
        <Text className="text-xs text-text-secondary">{Feed_ago(post.postedAt, props.now)}</Text>
      </View>
      <Text className="mt-1 text-base font-semibold">
        {summary.programName != null ? `${summary.programName} · ${summary.dayName}` : summary.dayName}
      </Text>
      <Text className="text-sm text-text-secondary">{WorkoutPost_statsLine(summary)}</Text>
      {summary.prs.length > 0 && (
        <View className="mt-2">
          {summary.prs.map((set, i) => (
            <Text key={`pr-${i}`} className="text-sm text-text-success">
              {"\u{1F3C6}"} {WorkoutPost_setText(set)}
            </Text>
          ))}
        </View>
      )}
      {summary.topSets.length > 0 && (
        <View className="mt-2">
          {summary.topSets.map((set, i) => (
            <Text key={`top-${i}`} className="text-sm">
              {WorkoutPost_setText(set)}
            </Text>
          ))}
        </View>
      )}
      {summary.keptSongs != null && (
        <Text className="mt-2 text-sm text-text-secondary">
          {"\u{1F3B5}"} {summary.keptSongs} {summary.keptSongs === 1 ? "song" : "songs"} kept
        </Text>
      )}
    </View>
  );
}

export function FriendsFeed(props: IProps): JSX.Element {
  return (
    <View className="my-3" testID="friends-feed">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-base font-semibold">Feed</Text>
        {props.loadedAt != null && (
          <Text className="text-xs text-text-secondary">Updated {Feed_ago(props.loadedAt, props.now)}</Text>
        )}
      </View>
      {props.items.length === 0 ? (
        <Text className="mt-2 text-sm text-text-secondary">
          No workouts yet. Turn on "Share with friends" when you finish a workout.
        </Text>
      ) : (
        props.items.map((item) => (
          <Post key={`${item.post.userId}-${item.post.workoutId}`} item={item} now={props.now} />
        ))
      )}
    </View>
  );
}
