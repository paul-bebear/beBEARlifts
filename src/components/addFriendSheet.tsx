import { JSX, useEffect, useReducer, useState } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Friends_forUser, IFriendsLists } from "../models/friends";
import { FriendsForm_empty, FriendsForm_reduce, IFriendsForm, IFriendsFormEvent } from "../models/friendsForm";
import { Invite_shareMessage } from "../models/invite";
import { Button } from "./button";
import { Text } from "./primitives/text";
import { TextInput } from "./primitives/textInput";
import { SheetScreenContainer } from "../navigation/SheetScreenContainer";
import { FormSheet } from "../navigation/FormSheet";
import { useTrackedDispatch } from "../navigation/TrackedStateContext";
import { Thunk_pushScreen } from "../ducks/thunks";
import { CloudStore } from "../utils/supabaseClient";
import { FriendsStore } from "../utils/friendsClient";
import { FriendsCommand_run } from "../utils/friendsCommand";
import { InviteClient_share } from "../utils/inviteClient";

interface IProps {
  form: IFriendsForm;
  lists: IFriendsLists;
  emit: (event: IFriendsFormEvent) => void;
}

const inputClass =
  "flex-1 px-4 py-3 text-base border rounded-lg bg-background-default border-border-prominent text-text-primary";

export function FriendsAdd(props: IProps): JSX.Element {
  const busy = props.form.command != null;
  const found = props.form.found;
  return (
    <View className="p-4 my-3 rounded-2xl bg-background-subtle" testID="friends-add">
      <Text className="mb-2 text-base font-semibold">Add a friend</Text>
      <View className="flex-row items-center" style={{ gap: 8 }}>
        <TextInput
          accessibilityLabel="Friend's handle"
          testID="friends-search"
          className={inputClass}
          placeholder="handle"
          value={props.form.search}
          onChangeText={(value) => props.emit({ type: "search", value })}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!busy}
          onSubmitEditing={() => props.emit({ type: "find" })}
        />
        <Button name="friends-find" kind="purple" disabled={busy} onClick={() => props.emit({ type: "find" })}>
          Find
        </Button>
      </View>
      {found != null && (
        <View className="flex-row items-center justify-between mt-3">
          <Text className="flex-1 text-sm">
            <Text className="font-bold">{found.displayName}</Text> @{found.handle}
          </Text>
          <Button
            name="friends-send-request"
            kind="purple"
            buttonSize="sm"
            disabled={busy}
            onClick={() => props.emit({ type: "request" })}
          >
            Send request
          </Button>
        </View>
      )}
    </View>
  );
}

export function AddFriendModal(): JSX.Element {
  const navigation = useNavigation();
  const dispatch = useTrackedDispatch();
  const userId = CloudStore.use().session?.userId;
  const friends = Friends_forUser(FriendsStore.use(), userId);
  const [form, emit] = useReducer(FriendsForm_reduce, undefined, FriendsForm_empty);
  const [shareMessage, setShareMessage] = useState<string>();
  const hasLoaded = friends.userId != null;
  const me = friends.me;

  useEffect(() => {
    if (userId != null && !hasLoaded) {
      emit({ type: "load" });
    }
  }, [userId, hasLoaded]);

  useEffect(() => {
    if (form.command != null) {
      FriendsCommand_run(form.command, emit);
    }
  }, [form.command]);

  const close = (): void => navigation.goBack();
  const openFriends = (): void => {
    close();
    dispatch(Thunk_pushScreen("friends", undefined, { tab: "friends" }));
  };

  return (
    <SheetScreenContainer onClose={close} shouldShowClose={true}>
      <FormSheet>
        <View testID="add-friend-sheet" data-testid="add-friend-sheet">
          {userId == null ? (
            <Text className="pt-2 text-base">Sign in to add friends.</Text>
          ) : !hasLoaded ? (
            <Text className="pt-2 text-sm text-text-secondary">Loading…</Text>
          ) : me == null ? (
            <Text className="pt-2 text-base">Pick your handle first. Friends find you by it.</Text>
          ) : (
            <>
              <FriendsAdd form={form} lists={{ friends: [], incoming: [], outgoing: [] }} emit={emit} />
              {form.error != null && (
                <Text className="mb-2 text-sm text-text-error" accessibilityRole="alert">
                  {form.error}
                </Text>
              )}
              {form.message != null && (
                <Text className="mb-2 text-sm" accessibilityLiveRegion="polite">
                  {form.message}
                </Text>
              )}
              <Button
                name="friends-invite"
                kind="lightgrayv3"
                onClick={() =>
                  InviteClient_share(me.handle, me.displayName).then((r) => setShareMessage(Invite_shareMessage(r)))
                }
              >
                Share my invite link
              </Button>
              {shareMessage != null && (
                <Text className="mt-2 text-sm" accessibilityLiveRegion="polite">
                  {shareMessage}
                </Text>
              )}
            </>
          )}
          <View className="mt-3">
            <Button name="friends-open" kind="lightgrayv3" onClick={openFriends}>
              {userId == null ? "Sign in" : me == null && hasLoaded ? "Pick a handle" : "See friends and requests"}
            </Button>
          </View>
        </View>
      </FormSheet>
    </SheetScreenContainer>
  );
}
