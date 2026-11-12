import { JSX } from "react";
import { Image, Pressable, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Text } from "./primitives/text";
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
  IPhoneSheetTarget,
  PhoneSheet_apps,
  PhoneSheet_colors,
  PhoneSheet_hasRestoreNotice,
  PhoneSheet_tileSize,
} from "../models/phoneSheet";
import { BearImage_uri } from "../utils/bearImage";
import { FriendsStore } from "../utils/friendsClient";
import { OfflineOnly_isEnabled } from "../utils/offlineOnly";
import { CloudStore } from "../utils/supabaseClient";

function open(target: IPhoneSheetTarget, dispatch: IDispatch): void {
  switch (target.kind) {
    case "screen":
      dispatch(Thunk_pushScreen(target.screen, undefined, { tab: target.tab }));
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
        <Image
          source={{ uri: BearImage_uri(app.image) }}
          style={{ width: PhoneSheet_tileSize, height: PhoneSheet_tileSize }}
          resizeMode="stretch"
        />
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
      <Text
        className="mt-2 text-xs font-semibold text-center"
        style={{ color: PhoneSheet_colors.label }}
        numberOfLines={1}
      >
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
          <View
            className="self-center w-full"
            style={{ maxWidth: 340, padding: 10, borderRadius: 40, backgroundColor: PhoneSheet_colors.frame }}
          >
            <View
              style={{
                borderRadius: 30,
                backgroundColor: PhoneSheet_colors.screen,
                paddingHorizontal: 6,
                paddingTop: 14,
                paddingBottom: 10,
              }}
            >
              <View
                className="self-center"
                style={{ width: 72, height: 8, borderRadius: 4, backgroundColor: PhoneSheet_colors.frame }}
              />
              <View style={{ flexDirection: "row", flexWrap: "wrap", paddingTop: 10 }}>
                {apps.map((app) => (
                  <PhoneApp key={app.id} app={app} onPress={tap(app)} />
                ))}
              </View>
            </View>
          </View>
        </View>
      </FormSheet>
    </SheetScreenContainer>
  );
}
