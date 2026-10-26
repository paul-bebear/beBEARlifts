import { JSX, useMemo, useState } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { lb } from "lens-shmens";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { LinkButton } from "./linkButton";
import { TickRow, TickRow_toggle } from "./tickRow";
import { SheetScreenContainer } from "../navigation/SheetScreenContainer";
import { FormSheet } from "../navigation/FormSheet";
import { navigateToModal } from "../navigation/navigationService";
import { useTrackedDispatch, useTrackedState } from "../navigation/TrackedStateContext";
import { GymBagCheck_items, GymBagCheck_plan, IGymBagPlan } from "../models/gymBagCheck";
import { Program_evaluate, Program_getProgram, Program_isEmpty, Program_nextHistoryRecord } from "../models/program";
import { Progress_getCurrentProgress } from "../models/progress";
import { WeekSchedule_workedOutToday } from "../models/weekSchedule";
import { WeekScheduleStore } from "../utils/weekScheduleStore";
import { WorkoutStart_go } from "../utils/workoutStart";
import { ISettings } from "../types";

export function GymBagCheckModal(): JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const navigation = useNavigation();
  const schedule = WeekScheduleStore.use();
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const { history, settings, stats } = state.storage;
  const program = Program_getProgram(state, state.storage.currentProgramId);
  const hasProgress = Progress_getCurrentProgress(state) != null;
  const plan = useMemo<IGymBagPlan>(() => {
    if (program == null || Program_isEmpty(program)) {
      return { kind: "next", day: 1, name: "" };
    }
    const now = Date.now();
    const workedOutToday = WeekSchedule_workedOutToday(history, now);
    return GymBagCheck_plan(Program_evaluate(program, settings), schedule, { now, workedOutToday, hasProgress });
  }, [program, settings, schedule, history, hasProgress]);
  const check = useMemo(() => {
    const record =
      program == null || Program_isEmpty(program)
        ? undefined
        : Program_nextHistoryRecord(program, settings, stats, plan.day);
    const day = { name: plan.name, record, isRest: plan.kind === "rest", nextWeekday: plan.nextWeekday };
    return GymBagCheck_items(day, history, settings);
  }, [program, settings, stats, plan, history]);

  const close = (): void => navigation.goBack();
  const go = (): void => {
    close();
    WorkoutStart_go(dispatch, program?.id, plan);
  };
  const skipForGood = (): void => {
    dispatch({
      type: "UpdateSettings",
      lensRecording: lb<ISettings>().p("skipBagCheck").record(true),
      desc: "Turn off bag check",
    });
    go();
  };

  return (
    <SheetScreenContainer onClose={close} shouldShowClose={true}>
      <FormSheet>
        <View testID="bag-check" data-testid="bag-check">
          <Text className="text-xs font-semibold tracking-wide uppercase text-text-secondary">Bag check</Text>
          <Text className="pt-1 pb-2 text-lg font-bold" testID="bag-check-title" data-testid="bag-check-title">
            {check.title}
          </Text>
          {check.items.map((item) => (
            <TickRow
              key={item.id}
              testID={`bag-check-${item.id}`}
              label={item.label}
              isTicked={ticked.has(item.id)}
              onPress={() => setTicked(TickRow_toggle(ticked, item.id))}
            />
          ))}
          <Button
            name="bag-check-go"
            testID="bag-check-go"
            data-testid="bag-check-go"
            kind="purple"
            buttonSize="lg"
            className="w-full mt-4"
            onClick={go}
          >
            {check.button}
          </Button>
          <View className="flex-row justify-between pt-4">
            <LinkButton
              name="bag-check-pick"
              testID="bag-check-pick"
              data-testid="bag-check-pick"
              onClick={() => {
                close();
                navigateToModal("nextWorkoutModal");
              }}
            >
              Pick another workout
            </LinkButton>
            <LinkButton
              name="bag-check-skip"
              testID="bag-check-skip"
              data-testid="bag-check-skip"
              onClick={skipForGood}
            >
              Skip the check
            </LinkButton>
          </View>
        </View>
      </FormSheet>
    </SheetScreenContainer>
  );
}
