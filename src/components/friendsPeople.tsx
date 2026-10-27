import { JSX } from "react";
import { View } from "react-native";
import { IFriendLink, IFriendsLists } from "../models/friends";
import { IFriendsForm, IFriendsFormEvent } from "../models/friendsForm";
import { CubNumber_label } from "../models/cubNumber";
import { Dialog_confirm } from "../utils/dialog";
import { Button } from "./button";
import { Text } from "./primitives/text";
import { ModerationCommand_block } from "../utils/moderationCommand";

interface IProps {
  form: IFriendsForm;
  lists: IFriendsLists;
  cubs?: ReadonlyMap<string, number>;
  emit: (event: IFriendsFormEvent) => void;
}

// screenFriends.tsx still renders the form here until batch B1 cuts that screen to the feed.
export { FriendsAdd } from "./addFriendSheet";

function Row(props: { link: IFriendLink; cub?: number; children: JSX.Element | JSX.Element[] }): JSX.Element {
  return (
    <View className="flex-row items-center justify-between py-2" style={{ gap: 8 }}>
      <Text className="flex-1 text-sm">
        <Text className="font-bold">{props.link.other.displayName}</Text> @{props.link.other.handle}
        {props.cub != null && <Text className="text-text-secondary"> · {CubNumber_label(props.cub)}</Text>}
      </Text>
      <View className="flex-row" style={{ gap: 8 }}>
        {props.children}
        <Button
          name="friends-block"
          kind="lightgrayv3"
          buttonSize="sm"
          onClick={() => ModerationCommand_block(props.link.other)}
        >
          Block user
        </Button>
      </View>
    </View>
  );
}

export function FriendsRequests(props: IProps): JSX.Element | null {
  const busy = props.form.command != null;
  const incoming = props.lists.incoming;
  if (incoming.length === 0) {
    return null;
  }
  return (
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
  );
}

export function FriendsLists(props: IProps): JSX.Element {
  const busy = props.form.command != null;
  const { friends, outgoing } = props.lists;
  const remove = async (link: IFriendLink, question: string): Promise<void> => {
    if (await Dialog_confirm(question)) {
      props.emit({ type: "remove", userId: link.other.userId });
    }
  };
  return (
    <View>
      <View className="p-4 my-3 rounded-2xl bg-background-subtle" testID="friends-list">
        <Text className="mb-1 text-base font-semibold">Friends</Text>
        {friends.length === 0 && (
          <Text className="text-sm text-text-secondary">No friends yet. Add one by their handle.</Text>
        )}
        {friends.map((link) => (
          <Row key={link.other.userId} link={link} cub={props.cubs?.get(link.other.userId)}>
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
