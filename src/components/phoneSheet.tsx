import { JSX } from "react";
import { Pressable, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Text } from "./primitives/text";
import { IconCog2 } from "./icons/iconCog2";
import { IconGraphs } from "./icons/iconGraphs";
import { IconFriends } from "./icons/iconFriends";
import { IconChevronRight } from "./icons/iconFoodUi";
import { CloudRestoreBanner } from "./cloudRestoreBanner";
import { SheetScreenContainer } from "../navigation/SheetScreenContainer";
import { FormSheet } from "../navigation/FormSheet";
import { useTrackedDispatch } from "../navigation/TrackedStateContext";
import { navigateToModal } from "../navigation/navigationService";
import { Thunk_pushScreen } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { Friends_forUser, Friends_lists } from "../models/friends";
import { IPhoneSheetRow, IPhoneSheetTarget, PhoneSheet_rows } from "../models/phoneSheet";
import { FriendsStore } from "../utils/friendsClient";
import { OfflineOnly_isEnabled } from "../utils/offlineOnly";
import { CloudStore } from "../utils/supabaseClient";
import { Tailwind_semantic } from "../utils/tailwindConfig";

function RowIcon(props: { id: IPhoneSheetRow["id"] }): JSX.Element | null {
  const color = Tailwind_semantic().icon.neutral;
  switch (props.id) {
    case "settings":
      return <IconCog2 color={color} size={22} />;
    case "more":
      return <IconGraphs color={color} />;
    case "friends":
      return <IconFriends color={color} size={22} />;
    case "restore":
      return null;
  }
}

function open(target: IPhoneSheetTarget, dispatch: IDispatch): void {
  switch (target.kind) {
    case "screen":
      dispatch(Thunk_pushScreen(target.screen, undefined, { tab: target.tab }));
      return;
    case "addFriend":
      navigateToModal("addFriendModal");
      return;
    case "restore":
      return;
  }
}

export function PhoneSheetModal(): JSX.Element {
  const dispatch = useTrackedDispatch();
  const navigation = useNavigation();
  const cloud = CloudStore.use();
  const friends = Friends_lists(Friends_forUser(FriendsStore.use(), cloud.session?.userId));
  const rows = PhoneSheet_rows({
    friendCount: friends.friends.length,
    isOffline: OfflineOnly_isEnabled(),
    hasPendingRestore: cloud.restoreOffer != null,
  });
  const close = (): void => navigation.goBack();
  const tap = (row: IPhoneSheetRow) => (): void => {
    close();
    open(row.target, dispatch);
  };

  return (
    <SheetScreenContainer onClose={close} shouldShowClose={true}>
      <FormSheet>
        <View style={{ gap: 8 }} testID="phone-sheet" data-testid="phone-sheet">
          {rows.map((row) =>
            row.target.kind === "restore" ? (
              <View key={row.id} className="-mx-4">
                <CloudRestoreBanner dispatch={dispatch} />
              </View>
            ) : (
              <Pressable
                key={row.id}
                testID={`phone-${row.id}`}
                data-testid={`phone-${row.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${row.title}. ${row.subtitle}`}
                onPress={tap(row)}
                className="flex-row items-center px-4 py-3.5 rounded-2xl bg-background-subtle"
              >
                <View className="w-7 mr-3">
                  <RowIcon id={row.id} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold">{row.title}</Text>
                  <Text className="text-sm text-text-secondary" numberOfLines={1}>
                    {row.subtitle}
                  </Text>
                </View>
                <IconChevronRight size={16} color={Tailwind_semantic().icon.neutral} />
              </Pressable>
            )
          )}
        </View>
      </FormSheet>
    </SheetScreenContainer>
  );
}
