import { JSX } from "react";
import { Image, Linking, Pressable, View } from "react-native";
import { Feed_ago, Feed_itemKey, IFeedItem, IFeedPost } from "../models/feed";
import { BearTv_sprite } from "../models/bearTv";
import { CubNumber_label } from "../models/cubNumber";
import { IMealPost, MealPost_macrosCard } from "../models/mealPost";
import { WorkoutPost_feedLine, WorkoutPost_levelText, WorkoutPost_setText } from "../models/workoutPost";
import { Text } from "./primitives/text";
import { FeedPostMenu } from "./feedPostMenu";
import { BearHead } from "./bearTv";
import { Support_email } from "../utils/support";
import { Dialog_alert } from "../utils/dialog";

interface IProps {
  items: IFeedItem[];
  loadedAt?: number;
  now: number;
}

function PostHeader(props: { item: IFeedItem; now: number }): JSX.Element {
  const { author, isMine, bear, post, cub } = props.item;
  return (
    <View className="flex-row items-center" style={{ gap: 10 }}>
      <BearHead sprite={BearTv_sprite(bear)} size={40} />
      <View className="flex-1">
        <Text className="text-sm" numberOfLines={1}>
          <Text className="font-bold">{isMine ? "You" : author.displayName}</Text>
          {bear != null && <Text className="text-text-secondary"> · {WorkoutPost_levelText(bear)}</Text>}
        </Text>
        <Text className="text-xs text-text-secondary">
          {isMine ? "" : `@${author.handle} · `}
          {isMine || cub == null ? "" : `${CubNumber_label(cub)} · `}
          {Feed_ago(post.postedAt, props.now)}
        </Text>
      </View>
    </View>
  );
}

function WorkoutBody(props: { post: IFeedPost }): JSX.Element {
  const summary = props.post.summary;
  return (
    <>
      <Text className="mt-2 text-base font-semibold">{WorkoutPost_feedLine(summary)}</Text>
      {summary.songs.length > 0 && (
        <View className="mt-1">
          {summary.songs.map((song, i) => (
            <Text key={`song-${i}`} className="text-sm text-text-secondary" numberOfLines={1}>
              {"\u{1F3B5}"} {song}
            </Text>
          ))}
        </View>
      )}
      {summary.prs.length > 0 && (
        <View className="mt-2">
          {summary.prs.map((set, i) => (
            <Text key={`pr-${i}`} className="text-sm text-text-success">
              {"\u{1F3C6}"} {WorkoutPost_setText(set)}
            </Text>
          ))}
        </View>
      )}
    </>
  );
}

function MealBody(props: { post: IMealPost }): JSX.Element {
  const { post } = props;
  return (
    <>
      {post.photoUrl != null && (
        <Image
          testID="feed-meal-photo"
          source={{ uri: post.photoUrl }}
          accessibilityLabel={post.description}
          className="mt-3 rounded-xl"
          style={{ width: "100%", aspectRatio: 4 / 3 }}
          resizeMode="cover"
        />
      )}
      <Text className="mt-2 text-base">{post.description}</Text>
      <View className="flex-row mt-2" style={{ gap: 6 }} testID="feed-meal-macros">
        {MealPost_macrosCard(post.macros).map((cell) => (
          <View key={cell.label} className="items-center flex-1 py-2 rounded-lg bg-background-default">
            <Text className="text-sm font-bold">{cell.value}</Text>
            <Text className="text-xs text-text-secondary">{cell.label}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

function Post(props: { item: IFeedItem; now: number }): JSX.Element {
  const { item } = props;
  return (
    <View
      className="p-4 my-2 rounded-2xl bg-background-subtle"
      testID={item.kind === "meal" ? "feed-meal" : "feed-post"}
    >
      <PostHeader item={item} now={props.now} />
      {item.kind === "workout" ? <WorkoutBody post={item.post} /> : <MealBody post={item.post} />}
      <FeedPostMenu item={item} />
    </View>
  );
}

export function FriendsFeed(props: IProps): JSX.Element {
  return (
    <View className="my-3" testID="friends-feed">
      {props.loadedAt != null && (
        <Text className="text-xs text-right text-text-secondary">Updated {Feed_ago(props.loadedAt, props.now)}</Text>
      )}
      {props.items.length === 0 ? (
        <Text className="mt-2 text-sm text-text-secondary">
          No posts yet. Turn on "Share with friends" when you finish a workout or log a meal.
        </Text>
      ) : (
        props.items.map((item) => <Post key={Feed_itemKey(item)} item={item} now={props.now} />)
      )}
      <Pressable
        className="py-4"
        testID="feed-contact"
        onPress={() =>
          Linking.openURL(`mailto:${Support_email}`).catch(() => Dialog_alert(`Email us at ${Support_email}`))
        }
      >
        <Text className="text-sm text-text-link">Contact us</Text>
      </Pressable>
    </View>
  );
}
