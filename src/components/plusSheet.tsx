import { JSX } from "react";
import { Pressable, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Text } from "./primitives/text";
import { IconFood } from "./icons/iconFood";
import { IconStats } from "./icons/iconStats";
import { IconFriends } from "./icons/iconFriends";
import { IconEdit2 } from "./icons/iconEdit2";
import { IconBarbell2 } from "./icons/iconBarbell2";
import { ShareCardTheme as T } from "./shareCards/shareCardTheme";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { SheetScreenContainer } from "../navigation/SheetScreenContainer";
import { FormSheet } from "../navigation/FormSheet";
import { navigateToModal } from "../navigation/navigationService";
import { useTrackedDispatch, useTrackedState } from "../navigation/TrackedStateContext";
import { buildNavCommon } from "../navigation/utils";
import { Thunk_pushScreen, Thunk_startProgramDay } from "../ducks/thunks";
import { RunSensors_isAvailable } from "../utils/runSensors";
import { FoodLog_dayKey } from "../models/foodLog";
import { FoodMealForTime_pick } from "../models/foodMealForTime";
import {
  IQuickAction,
  IQuickActionId,
  QuickActions_list,
  quickActionsRun,
  quickActionsSoon,
} from "../models/quickActions";

function SquareIcon(props: { id: IQuickActionId; color: string }): JSX.Element {
  switch (props.id) {
    case "food":
      return <IconFood size={28} color={props.color} />;
    case "measurement":
      return <IconStats size={28} color={props.color} />;
    case "friend":
      return <IconFriends size={28} color={props.color} />;
    case "note":
      return <IconEdit2 size={28} color={props.color} />;
  }
}

function Square(props: { action: IQuickAction; onPress: () => void }): JSX.Element {
  const { action } = props;
  const semantic = Tailwind_semantic();
  const color = action.isSoon ? semantic.icon.neutralsubtle : semantic.icon.neutral;
  return (
    <Pressable
      testID={`plus-${action.id}`}
      data-testid={`plus-${action.id}`}
      accessibilityRole="button"
      accessibilityLabel={action.isSoon ? `${action.label}, ${quickActionsSoon}` : action.label}
      accessibilityState={{ disabled: action.isSoon }}
      disabled={action.isSoon}
      onPress={props.onPress}
      className="items-center justify-center flex-1 border rounded-2xl bg-background-default border-border-neutral"
      style={{ height: 104, opacity: action.isSoon ? 0.5 : 1 }}
    >
      <SquareIcon id={action.id} color={color} />
      <Text className="pt-2 text-base font-semibold">{action.label}</Text>
      {action.isSoon && <Text className="text-xs text-text-secondary">{quickActionsSoon}</Text>}
    </Pressable>
  );
}

export function PlusSheetModal(): JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const navigation = useNavigation();
  const actions = QuickActions_list({
    isOngoingProgress: buildNavCommon(state).isOngoingProgress,
    canRun: RunSensors_isAvailable(),
  });
  const close = (): void => navigation.goBack();
  const closeThen = (effect: () => void) => (): void => {
    close();
    effect();
  };
  const onSquare: Record<IQuickActionId, () => void> = {
    food: closeThen(() => {
      const now = new Date();
      dispatch(
        Thunk_pushScreen("foodAdd", { day: FoodLog_dayKey(now), meal: FoodMealForTime_pick(now) }, { tab: "food" })
      );
    }),
    measurement: closeThen(() => dispatch(Thunk_pushScreen("bodyScans", undefined, { tab: "graphs" }))),
    friend: closeThen(() => navigateToModal("addFriendModal")),
    note: closeThen(() => {
      navigateToModal("noteEditorModal", { day: FoodLog_dayKey(new Date()) });
    }),
  };
  const onWorkout = closeThen(() => {
    if (actions.workout.action === "resume") {
      dispatch(Thunk_startProgramDay());
    } else {
      navigateToModal("nextWorkoutModal");
    }
  });
  const onRun = closeThen(() => dispatch(Thunk_pushScreen("runs", undefined, { tab: "graphs" })));
  const rows = [actions.squares.slice(0, 2), actions.squares.slice(2, 4)];

  return (
    <SheetScreenContainer onClose={close} shouldShowClose={true}>
      <FormSheet>
        <View style={{ gap: 12 }} testID="plus-sheet" data-testid="plus-sheet">
          {rows.map((row, i) => (
            <View key={i} className="flex-row" style={{ gap: 12 }}>
              {row.map((action) => (
                <Square key={action.id} action={action} onPress={onSquare[action.id]} />
              ))}
            </View>
          ))}
          <View
            className="flex-row items-center rounded-2xl"
            style={{ backgroundColor: T.honey, height: 64, paddingRight: actions.workout.showsRun ? 8 : 0 }}
          >
            <Pressable
              testID="plus-workout"
              data-testid="plus-workout"
              accessibilityRole="button"
              onPress={onWorkout}
              className="flex-row items-center self-stretch justify-center flex-1"
              style={{ gap: 10 }}
            >
              <IconBarbell2 color={T.greenDark} />
              <Text className="text-lg font-bold" style={{ color: T.greenDark }}>
                {actions.workout.label}
              </Text>
            </Pressable>
            {actions.workout.showsRun && (
              <Pressable
                testID="plus-run"
                data-testid="plus-run"
                accessibilityRole="button"
                onPress={onRun}
                className="items-center justify-center px-4 rounded-xl"
                style={{ height: 44, backgroundColor: T.cream }}
              >
                <Text className="text-sm font-semibold" style={{ color: T.greenDark }}>
                  {quickActionsRun}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </FormSheet>
    </SheetScreenContainer>
  );
}
