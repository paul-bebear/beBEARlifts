import { JSX, useEffect } from "react";
import { Image, Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { useTrackedDispatch } from "../navigation/TrackedStateContext";
import { Thunk_pushScreen } from "../ducks/thunks";
import { BearScene_headCrop, IBearBox } from "../models/bearScene";
import { BearTv_screen } from "../models/bearTv";
import { Feed_items, Feed_needsRefresh } from "../models/feed";
import { FeedModeration_items, FeedModeration_users } from "../models/feedModeration";
import { Friends_forUser, Friends_lists } from "../models/friends";
import { BearImage_uri } from "../utils/bearImage";
import { FeedStore } from "../utils/feedClient";
import { FriendsStore } from "../utils/friendsClient";
import { FriendsCommand_run } from "../utils/friendsCommand";
import { BlocksStore } from "../utils/moderationStore";
import { CloudStore } from "../utils/supabaseClient";

const screenInk = "#F8FAFC";
const screenGlass = "rgba(15, 23, 42, 0.85)";

export function BearHead(props: { sprite: string; size: number }): JSX.Element {
  return (
    <View
      className="overflow-hidden rounded-full bg-background-subtle"
      style={{ width: props.size, height: props.size }}
    >
      <Image
        source={{ uri: BearImage_uri(props.sprite) }}
        style={{ position: "absolute", ...BearScene_headCrop(props.sprite, props.size) }}
        resizeMode="contain"
      />
    </View>
  );
}

export function BearTv(props: { box: IBearBox }): JSX.Element {
  const dispatch = useTrackedDispatch();
  const userId = CloudStore.use().session?.userId;
  const friends = Friends_forUser(FriendsStore.use(), userId);
  const feed = FeedStore.use();
  const blocked = FeedModeration_users(BlocksStore.use(), userId);
  const now = Date.now();
  const screen = BearTv_screen({
    signedIn: userId != null,
    friendCount: Friends_lists(friends).friends.length,
    items: FeedModeration_items(Feed_items(feed, friends), blocked),
    now,
  });

  useEffect(() => {
    if (Feed_needsRefresh(feed, userId, now)) {
      FriendsCommand_run({ type: "load" }, () => undefined);
    }
  }, [userId]);

  const { width, height } = props.box;
  const font = Math.max(7, Math.round(width * 0.15));
  return (
    <Pressable
      testID="bear-tv"
      data-testid="bear-tv"
      accessibilityRole="button"
      accessibilityLabel={screen.label}
      onPress={() => dispatch(Thunk_pushScreen("friends", undefined, { tab: "friends" }))}
      className="items-center justify-center"
      style={{ width, height, padding: 2, borderRadius: 4, backgroundColor: screenGlass, gap: 2 }}
    >
      {screen.kind === "post" && <BearHead sprite={screen.sprite} size={Math.round(Math.min(width, height) * 0.62)} />}
      <Text
        numberOfLines={screen.kind === "post" ? 1 : 3}
        style={{ color: screenInk, fontSize: font, lineHeight: Math.round(font * 1.2), textAlign: "center" }}
      >
        {screen.text}
      </Text>
    </Pressable>
  );
}
