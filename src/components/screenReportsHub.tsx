import { JSX } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { useTrackedDispatch } from "../navigation/TrackedStateContext";
import { NavScreenContent } from "../navigation/NavScreenContent";
import { useNavOptions } from "../navigation/useNavOptions";
import { Thunk_pushScreen } from "../ducks/thunks";
import { ReportsHub_rows } from "../models/reportsHub";
import { OfflineOnly_isEnabled } from "../utils/offlineOnly";
import { RunSensors_isAvailable } from "../utils/runSensors";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { IconChevronRight } from "./icons/iconFoodUi";

export function ScreenReportsHub(): JSX.Element {
  const dispatch = useTrackedDispatch();
  useNavOptions({ navTitle: "Reports" });
  const rows = ReportsHub_rows({ isOffline: OfflineOnly_isEnabled(), hasRunSensors: RunSensors_isAvailable() });
  return (
    <NavScreenContent>
      <View className="pt-4 pb-6" testID="reports-hub" data-testid="reports-hub">
        {rows.map((row) => (
          <Pressable
            key={row.id}
            testID={`reports-hub-${row.id}`}
            data-testid={`reports-hub-${row.id}`}
            onPress={() => dispatch(Thunk_pushScreen(row.screen))}
            className="flex-row items-center px-4 py-4 mx-4 mb-2 rounded-2xl bg-background-subtle"
          >
            <View className="flex-1">
              <Text className="text-base font-semibold">{row.title}</Text>
              <Text className="text-sm text-text-secondary">{row.subtitle}</Text>
            </View>
            <IconChevronRight size={16} color={Tailwind_semantic().icon.neutral} />
          </Pressable>
        ))}
      </View>
    </NavScreenContent>
  );
}
