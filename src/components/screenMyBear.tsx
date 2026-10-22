import { JSX, ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useTrackedDispatch } from "../navigation/TrackedStateContext";
import { NavScreenContent } from "../navigation/NavScreenContent";
import { useNavOptions } from "../navigation/useNavOptions";
import { Thunk_pushScreen } from "../ducks/thunks";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { IconCog2 } from "./icons/iconCog2";
import { BearMark } from "./shareCards/bearMark";
import { ShareCardTheme as T } from "./shareCards/shareCardTheme";
import { ProgressSections } from "./screenProgressDashboard";
import { CheckInChart } from "./checkInChart";

interface IMyBearLayoutProps {
  head: ReactNode;
  checkIns?: ReactNode;
  children: ReactNode;
}

function BearHeadPlaceholder(): JSX.Element {
  return (
    <View className="items-center py-4" testID="my-bear-head" data-testid="my-bear-head">
      <View
        className="items-center justify-center rounded-full"
        style={{ width: 120, height: 120, backgroundColor: T.honey }}
      >
        <BearMark size={84} color={T.greenDark} faceColor={T.honey} />
      </View>
    </View>
  );
}

export function MyBearLayout(props: IMyBearLayoutProps): JSX.Element {
  return (
    <View testID="my-bear" data-testid="my-bear">
      {props.head}
      {props.checkIns}
      {props.children}
    </View>
  );
}

export function ScreenMyBear(): JSX.Element {
  const dispatch = useTrackedDispatch();
  useNavOptions({
    navTitle: "My bear",
    navRightButtons: [
      <Pressable
        key="settings"
        className="p-2"
        testID="progress-settings"
        data-testid="progress-settings"
        onPress={() => dispatch(Thunk_pushScreen("settings"))}
      >
        <IconCog2 color={Tailwind_semantic().icon.neutral} size={22} />
      </Pressable>,
    ],
  });
  return (
    <NavScreenContent>
      <MyBearLayout head={<BearHeadPlaceholder />} checkIns={<CheckInChart />}>
        <ProgressSections />
      </MyBearLayout>
    </NavScreenContent>
  );
}
