import { JSX, useContext, useEffect, useReducer, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { NavScreenScrollContext } from "../navigation/NavScreenScrollContext";
import { FeedStore } from "../utils/feedClient";
import { Feed_cubs, Feed_items, Feed_screenView, IFeedScreenView } from "../models/feed";
import { FeedModeration_items, FeedModeration_users } from "../models/feedModeration";
import { BlocksStore } from "../utils/moderationStore";
import {
  IPullState,
  PullToRefresh_end,
  PullToRefresh_idle,
  PullToRefresh_isReady,
  PullToRefresh_move,
  PullToRefresh_start,
} from "../models/pullToRefresh";
import { FriendsFeed } from "./friendsFeed";
import { Text } from "./primitives/text";
import { TextInput } from "./primitives/textInput";
import { Button } from "./button";
import { useNavOptions } from "../navigation/useNavOptions";
import { useTrackedDispatch } from "../navigation/TrackedStateContext";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { IconFriends } from "./icons/iconFriends";
import { CloudStore } from "../utils/supabaseClient";
import { CloudBackupCard } from "./cloudBackupCard";
import { InviteClient_share } from "../utils/inviteClient";
import { Invite_shareMessage } from "../models/invite";
import { FriendsStore } from "../utils/friendsClient";
import { FriendsCommand_run } from "../utils/friendsCommand";
import { Friends_forUser, Friends_lists, IProfile } from "../models/friends";
import { FriendsForm_empty, FriendsForm_reduce, IFriendsForm, IFriendsFormEvent } from "../models/friendsForm";
import { FriendsAdd, FriendsLists, FriendsRequests } from "./friendsPeople";

const inputClass =
  "px-4 py-3 text-base border rounded-lg bg-background-default border-border-prominent text-text-primary";

function ViewTabs(props: {
  view: IFeedScreenView;
  friendCount: number;
  onView: (view: IFeedScreenView) => void;
}): JSX.Element {
  const tabs: [IFeedScreenView, string][] = [
    ["feed", "Feed"],
    ["people", props.friendCount > 0 ? `Friends · ${props.friendCount}` : "Friends"],
  ];
  return (
    <View className="flex-row p-1 mt-3 rounded-full bg-background-subtle" accessibilityRole="tablist">
      {tabs.map(([view, label]) => (
        <Pressable
          key={view}
          testID={`friends-view-${view}`}
          data-testid={`friends-view-${view}`}
          accessibilityRole="tab"
          accessibilityState={{ selected: props.view === view }}
          className={`flex-1 items-center py-2 rounded-full ${props.view === view ? "bg-background-default" : ""}`}
          onPress={() => props.onView(view)}
        >
          <Text className={`text-sm ${props.view === view ? "font-bold" : "text-text-secondary"}`}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function ScreenFriends(): JSX.Element {
  const dispatch = useTrackedDispatch();
  const cloud = CloudStore.use();
  const userId = cloud.session?.userId;
  const friends = Friends_forUser(FriendsStore.use(), userId);
  const feed = FeedStore.use();
  const blocked = FeedModeration_users(BlocksStore.use(), userId);
  const [form, emit] = useReducer(FriendsForm_reduce, undefined, FriendsForm_empty);
  const [chosenView, setChosenView] = useState<IFeedScreenView>();
  const lists = Friends_lists(friends);
  const view = Feed_screenView(chosenView, lists.friends.length);
  useNavOptions({ navTitle: view === "feed" ? "Feed" : "Friends" });
  const isFocused = useIsFocused();
  const scroll = useContext(NavScreenScrollContext);
  const pull = useRef<IPullState>(PullToRefresh_idle());
  const [pullReady, setPullReady] = useState(false);

  useEffect(() => {
    if (userId != null && isFocused) {
      emit({ type: "load" });
    }
  }, [userId, isFocused]);

  useEffect(() => {
    if (form.command != null) {
      FriendsCommand_run(form.command, emit);
    }
  }, [form.command]);

  if (userId == null) {
    return (
      <View className="px-4 pt-12" testID="friends-signed-out" data-testid="friends-signed-out">
        <View className="items-center px-4">
          <IconFriends size={56} color={Tailwind_semantic().icon.neutral} />
          <Text className="pt-4 text-xl font-bold text-center">Sign in to add friends</Text>
          <Text className="pt-2 text-base text-center text-text-secondary">
            Sign in with an email code. The same sign-in turns on cloud backup and AI features.
          </Text>
        </View>
        <CloudBackupCard dispatch={dispatch} compact />
      </View>
    );
  }

  const hasLoaded = friends.userId != null;
  const needsProfile = hasLoaded && friends.me == null;
  const loading = form.command?.type === "load";
  return (
    <View
      className="flex-1 px-4 pb-8"
      testID="friends-screen"
      onTouchStart={(e) => {
        pull.current = PullToRefresh_start(scroll?.scrollYRef.current ?? 0, e.nativeEvent.pageY);
      }}
      onTouchMove={(e) => {
        pull.current = PullToRefresh_move(pull.current, e.nativeEvent.pageY);
        setPullReady(PullToRefresh_isReady(pull.current));
      }}
      onTouchEnd={() => {
        const end = PullToRefresh_end(pull.current);
        pull.current = end.state;
        setPullReady(false);
        if (end.refresh) {
          emit({ type: "load" });
        }
      }}
    >
      {(pullReady || loading) && (
        <Text className="pt-3 text-sm text-center text-text-secondary" accessibilityLiveRegion="polite">
          {loading ? "Loading…" : "Release to refresh"}
        </Text>
      )}
      {(needsProfile || form.editingProfile) && <ProfileForm form={form} emit={emit} isNew={needsProfile} />}
      {friends.me != null && <ViewTabs view={view} friendCount={lists.friends.length} onView={setChosenView} />}
      {friends.me != null && !form.editingProfile && view === "people" && (
        <ProfileLine me={friends.me} form={form} emit={emit} />
      )}
      {form.error != null && (
        <Text className="mt-3 text-sm text-text-error" accessibilityRole="alert">
          {form.error}
        </Text>
      )}
      {form.message != null && (
        <Text className="mt-3 text-sm" accessibilityLiveRegion="polite">
          {form.message}
        </Text>
      )}
      {friends.me != null && <FriendsRequests form={form} lists={lists} emit={emit} />}
      {friends.me != null && view === "feed" && (
        <FriendsFeed
          items={FeedModeration_items(Feed_items(feed, friends), blocked)}
          loadedAt={feed.loadedAt}
          now={Date.now()}
        />
      )}
      {friends.me != null && view === "people" && (
        <>
          <FriendsAdd form={form} lists={lists} emit={emit} />
          <FriendsLists form={form} lists={lists} cubs={Feed_cubs(feed)} emit={emit} />
        </>
      )}
    </View>
  );
}

function ProfileLine(props: { me: IProfile; form: IFriendsForm; emit: (e: IFriendsFormEvent) => void }): JSX.Element {
  const [shareMessage, setShareMessage] = useState<string>();
  return (
    <View className="pt-4" style={{ gap: 8 }} testID="friends-me">
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 text-sm">
          You are <Text className="font-bold">{props.me.displayName}</Text> @{props.me.handle}
        </Text>
        <Button
          name="friends-edit-profile"
          kind="lightgrayv3"
          buttonSize="sm"
          disabled={props.form.command != null}
          onClick={() =>
            props.emit({ type: "editProfile", handle: props.me.handle, displayName: props.me.displayName })
          }
        >
          Edit
        </Button>
      </View>
      <Button
        name="friends-invite"
        kind="purple"
        onClick={() =>
          InviteClient_share(props.me.handle, props.me.displayName).then((r) => setShareMessage(Invite_shareMessage(r)))
        }
      >
        Invite a friend
      </Button>
      {shareMessage != null && (
        <Text className="text-sm" accessibilityLiveRegion="polite">
          {shareMessage}
        </Text>
      )}
    </View>
  );
}

function ProfileForm(props: { form: IFriendsForm; emit: (e: IFriendsFormEvent) => void; isNew: boolean }): JSX.Element {
  const busy = props.form.command != null;
  return (
    <View className="p-4 my-3 rounded-2xl bg-background-subtle" style={{ gap: 12 }} testID="friends-profile-form">
      <Text className="text-base font-semibold">{props.isNew ? "Pick a handle" : "Edit your profile"}</Text>
      <Text className="text-sm text-text-secondary">
        Friends find you by your handle: 3 to 20 letters, numbers or _. Someone who types your exact handle sees your
        name. Only friends see your workouts.
      </Text>
      <Text className="text-sm">Handle</Text>
      <TextInput
        accessibilityLabel="Handle"
        testID="friends-handle"
        className={inputClass}
        value={props.form.handle}
        onChangeText={(value) => props.emit({ type: "handle", value })}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!busy}
      />
      <Text className="text-sm">Name</Text>
      <TextInput
        accessibilityLabel="Name"
        testID="friends-display-name"
        className={inputClass}
        value={props.form.displayName}
        onChangeText={(value) => props.emit({ type: "displayName", value })}
        editable={!busy}
      />
      <Button
        name="friends-save-profile"
        kind="purple"
        disabled={busy}
        onClick={() => props.emit({ type: "saveProfile", isNew: props.isNew })}
      >
        Save
      </Button>
      {!props.isNew && (
        <Button
          name="friends-cancel-edit"
          kind="lightgrayv3"
          disabled={busy}
          onClick={() => props.emit({ type: "cancelEdit" })}
        >
          Cancel
        </Button>
      )}
    </View>
  );
}
