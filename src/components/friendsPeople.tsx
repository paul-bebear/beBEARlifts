import { JSX } from "react";
import { View } from "react-native";
import { IFriendLink, IFriendsLists } from "../models/friends";
import { IFriendsForm, IFriendsFormEvent } from "../models/friendsForm";
import { Dialog_confirm } from "../utils/dialog";
import { Button } from "./button";
import { Text } from "./primitives/text";
import { TextInput } from "./primitives/textInput";

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

function Row(props: { link: IFriendLink; children: JSX.Element | JSX.Element[] }): JSX.Element {
  return (
    <View className="flex-row items-center justify-between py-2" style={{ gap: 8 }}>
      <Text className="flex-1 text-sm">
        <Text className="font-bold">{props.link.other.displayName}</Text> @{props.link.other.handle}
      </Text>
      <View className="flex-row" style={{ gap: 8 }}>
        {props.children}
      </View>
    </View>
  );
}

export function FriendsLists(props: IProps): JSX.Element {
  const busy = props.form.command != null;
  const { friends, incoming, outgoing } = props.lists;
  const remove = async (link: IFriendLink, question: string): Promise<void> => {
    if (await Dialog_confirm(question)) {
      props.emit({ type: "remove", userId: link.other.userId });
    }
  };
  return (
    <View>
      {incoming.length > 0 && (
        <View className="p-4 my-3 rounded-2xl bg-background-subtle" testID="friends-incoming">
          <Text className="mb-1 text-base font-semibold">Requests</Text>
          {incoming.map((link) => (
            <Row key={link.other.userId} link={link}>
              <Button
                name="friends-accept"
                kind="purple"
                buttonSize="sm"
                disabled={busy}
                onClick={() => props.emit({ type: "accept", userId: link.other.userId })}
              >
                Accept
              </Button>
              <Button
                name="friends-decline"
                kind="lightgrayv3"
                buttonSize="sm"
                disabled={busy}
                onClick={() => props.emit({ type: "remove", userId: link.other.userId })}
              >
                Decline
              </Button>
            </Row>
          ))}
        </View>
      )}
      <View className="p-4 my-3 rounded-2xl bg-background-subtle" testID="friends-list">
        <Text className="mb-1 text-base font-semibold">Friends</Text>
        {friends.length === 0 && (
          <Text className="text-sm text-text-secondary">No friends yet. Add one by their handle.</Text>
        )}
        {friends.map((link) => (
          <Row key={link.other.userId} link={link}>
            <Button
              name="friends-remove"
              kind="lightgrayv3"
              buttonSize="sm"
              disabled={busy}
              onClick={() => remove(link, `Remove ${link.other.displayName} from your friends?`)}
            >
              Remove
            </Button>
          </Row>
        ))}
      </View>
      {outgoing.length > 0 && (
        <View className="p-4 my-3 rounded-2xl bg-background-subtle" testID="friends-outgoing">
          <Text className="mb-1 text-base font-semibold">Sent requests</Text>
          {outgoing.map((link) => (
            <Row key={link.other.userId} link={link}>
              <Button
                name="friends-cancel-request"
                kind="lightgrayv3"
                buttonSize="sm"
                disabled={busy}
                onClick={() => props.emit({ type: "remove", userId: link.other.userId })}
              >
                Cancel
              </Button>
            </Row>
          ))}
        </View>
      )}
    </View>
  );
}
