import { JSX } from "react";
import { Pressable, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Text } from "./primitives/text";
import { IconCog2 } from "./icons/iconCog2";
import { IconGraphs } from "./icons/iconGraphs";
import { IconFriends } from "./icons/iconFriends";
import { IconSpeaker } from "./icons/iconSpeaker";
import { IconPicture } from "./icons/iconPicture";
import { IconCrown } from "./icons/iconCrown";
import { CloudRestoreBanner } from "./cloudRestoreBanner";
import { SheetScreenContainer } from "../navigation/SheetScreenContainer";
import { FormSheet } from "../navigation/FormSheet";
import { useTrackedDispatch } from "../navigation/TrackedStateContext";
import { navigateToModal } from "../navigation/navigationService";
import { Thunk_pushScreen } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { Friends_forUser, Friends_lists } from "../models/friends";
import {
  IPhoneSheetApp,
  IPhoneSheetAppId,
  IPhoneSheetTarget,
  PhoneSheet_apps,
  PhoneSheet_hasRestoreNotice,
} from "../models/phoneSheet";
import { FriendsStore } from "../utils/friendsClient";
import { OfflineOnly_isEnabled } from "../utils/offlineOnly";
import { CloudStore } from "../utils/supabaseClient";
import { Tailwind_semantic } from "../utils/tailwindConfig";

const tileClass: Record<IPhoneSheetAppId, string> = {
  feed: "bg-background-cardpurple",
  music: "bg-background-cardyellow",
  photos: "bg-background-cardpurple",
  stats: "bg-background-cardyellow",
  badges: "bg-background-cardpurple",
  settings: "bg-background-neutral",
};

function AppIcon(props: { id: IPhoneSheetAppId }): JSX.Element {
  const color = Tailwind_semantic().icon.neutral;
  switch (props.id) {
    case "feed":
      return <IconFriends color={color} size={30} />;
    case "music":
      return <IconSpeaker color={color} size={30} />;
    case "photos":
      return <IconPicture color={color} size={30} />;
    case "stats":
      return <IconGraphs color={color} size={30} />;
    case "badges":
      return <IconCrown color={color} size={30} />;
    case "settings":
      return <IconCog2 color={color} size={30} />;
  }
}

function open(target: IPhoneSheetTarget, dispatch: IDispatch): void {
  switch (target.kind) {
    case "screen":
      dispatch(Thunk_pushScreen(target.screen, undefined, target.tab != null ? { tab: target.tab } : undefined));
      return;
    case "addFriend":
      navigateToModal("addFriendModal");
      return;
  }
}

function PhoneApp(props: { app: IPhoneSheetApp; onPress: () => void }): JSX.Element {
  const { app } = props;
  const badge = app.badge ?? 0;
  const label = badge > 0 ? `${app.label}, ${badge} new` : app.label;
  return (
    <Pressable
      testID={`phone-app-${app.id}`}
      data-testid={`phone-app-${app.id}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={props.onPress}
      className="items-center"
      style={{ width: "33.33%", paddingVertical: 10 }}
    >
      <View>
        <View className={`items-center justify-center rounded-2xl ${tileClass[app.id]}`} style={{ width: 64, height: 64 }}>
          <AppIcon id={app.id} />
        </View>
        {badge > 0 ? (
          <View
            className="absolute items-center justify-center rounded-full bg-red-500"
            style={{ top: -6, right: -6, minWidth: 20, height: 20, paddingHorizontal: 5 }}
            testID={`phone-app-${app.id}-badge`}
            data-testid={`phone-app-${app.id}-badge`}
          >
            <Text className="text-xs font-bold text-text-alwayswhite">{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text className="mt-2 text-xs font-semibold text-center" numberOfLines={1}>
        {app.label}
      </Text>
    </Pressable>
  );
}

export function PhoneSheetModal(): JSX.Element {
  const dispatch = useTrackedDispatch();
  const navigation = useNavigation();
  const cloud = CloudStore.use();
  const friends = Friends_lists(Friends_forUser(FriendsStore.use(), cloud.session?.userId));
  const input = {
    friendCount: friends.friends.length,
    pendingRequests: friends.incoming.length,
    isOffline: OfflineOnly_isEnabled(),
    hasPendingRestore: cloud.restoreOffer != null,
  };
  const apps = PhoneSheet_apps(input);
  const close = (): void => navigation.goBack();
  const tap = (app: IPhoneSheetApp) => (): void => {
    close();
    open(app.target, dispatch);
  };

  return (
    <SheetScreenContainer onClose={close} shouldShowClose={true}>
      <FormSheet>
        <View style={{ gap: 12 }} testID="phone-sheet" data-testid="phone-sheet">
          {PhoneSheet_hasRestoreNotice(input) ? (
            <View className="-mx-4" testID="phone-restore" data-testid="phone-restore">
              <CloudRestoreBanner dispatch={dispatch} />
            </View>
          ) : null}
          <View className="px-2 py-3 rounded-3xl bg-background-subtle" style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {apps.map((app) => (
              <PhoneApp key={app.id} app={app} onPress={tap(app)} />
            ))}
          </View>
        </View>
      </FormSheet>
    </SheetScreenContainer>
  );
}
