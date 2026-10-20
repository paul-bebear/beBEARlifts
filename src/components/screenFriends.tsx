import { JSX, useEffect, useReducer } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { TextInput } from "./primitives/textInput";
import { Button } from "./button";
import { useNavOptions } from "../navigation/useNavOptions";
import { useTrackedDispatch } from "../navigation/TrackedStateContext";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { IconFriends } from "./icons/iconFriends";
import { Thunk_pushScreen } from "../ducks/thunks";
import { CloudStore } from "../utils/supabaseClient";
import { FriendsStore } from "../utils/friendsClient";
import { FriendsCommand_run } from "../utils/friendsCommand";
import { Friends_forUser, Friends_lists, IProfile } from "../models/friends";
import { FriendsForm_empty, FriendsForm_reduce, IFriendsForm, IFriendsFormEvent } from "../models/friendsForm";
import { FriendsAdd, FriendsLists } from "./friendsPeople";

const inputClass =
  "px-4 py-3 text-base border rounded-lg bg-background-default border-border-prominent text-text-primary";

export function ScreenFriends(): JSX.Element {
  useNavOptions({ navTitle: "Friends" });
  const dispatch = useTrackedDispatch();
  const cloud = CloudStore.use();
  const userId = cloud.session?.userId;
  const friends = Friends_forUser(FriendsStore.use(), userId);
  const [form, emit] = useReducer(FriendsForm_reduce, undefined, FriendsForm_empty);

  useEffect(() => {
    if (userId != null) {
      emit({ type: "load" });
    }
  }, [userId]);

  useEffect(() => {
    if (form.command != null) {
      FriendsCommand_run(form.command, emit);
    }
  }, [form.command]);

  if (userId == null) {
    return (
      <View className="items-center px-8 pt-16" testID="friends-signed-out" data-testid="friends-signed-out">
        <IconFriends size={56} color={Tailwind_semantic().icon.neutral} />
        <Text className="pt-4 text-xl font-bold text-center">Sign in to add friends</Text>
        <Text className="pt-2 pb-4 text-base text-center text-text-secondary">
          Friends use your cloud backup sign-in. Open Settings, then Cloud backup, and sign in with your email.
        </Text>
        <Button name="friends-open-settings" kind="purple" onClick={() => dispatch(Thunk_pushScreen("settings"))}>
          Open Settings
        </Button>
      </View>
    );
  }

  const hasLoaded = friends.userId != null;
  const needsProfile = hasLoaded && friends.me == null;
  const lists = Friends_lists(friends);
  return (
    <View className="px-4 pb-8" testID="friends-screen">
      {!hasLoaded && form.command?.type === "load" && <Text className="pt-4 text-sm">Loading…</Text>}
      {(needsProfile || form.editingProfile) && <ProfileForm form={form} emit={emit} isNew={needsProfile} />}
      {friends.me != null && !form.editingProfile && <ProfileLine me={friends.me} form={form} emit={emit} />}
      {friends.me != null && (
        <>
          <FriendsAdd form={form} lists={lists} emit={emit} />
          <FriendsLists form={form} lists={lists} emit={emit} />
        </>
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
    </View>
  );
}

function ProfileLine(props: { me: IProfile; form: IFriendsForm; emit: (e: IFriendsFormEvent) => void }): JSX.Element {
  return (
    <View className="flex-row items-center justify-between pt-4" testID="friends-me">
      <Text className="flex-1 text-sm">
        You are <Text className="font-bold">{props.me.displayName}</Text> @{props.me.handle}
      </Text>
      <Button
        name="friends-edit-profile"
        kind="lightgrayv3"
        buttonSize="sm"
        disabled={props.form.command != null}
        onClick={() => props.emit({ type: "editProfile", handle: props.me.handle, displayName: props.me.displayName })}
      >
        Edit
      </Button>
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
