import { JSX, useState } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { LinkButton } from "./linkButton";
import { TickRow, TickRow_toggle } from "./tickRow";
import { SheetScreenContainer } from "../navigation/SheetScreenContainer";
import { FormSheet } from "../navigation/FormSheet";
import { useTrackedDispatch, useTrackedState } from "../navigation/TrackedStateContext";
import { Thunk_startProgramDay } from "../ducks/thunks";
import { GymExit_sheet } from "../models/gymExit";
import { Progress_getCurrentProgress } from "../models/progress";
import { WorkoutFinish_run } from "../utils/workoutFinish";
import { Dialog_alert } from "../utils/dialog";

export function GymExitModal(): JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const navigation = useNavigation();
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const progress = Progress_getCurrentProgress(state);
  const close = (): void => navigation.goBack();
  if (progress == null) {
    return (
      <SheetScreenContainer onClose={close} shouldShowClose={true}>
        <FormSheet>
          <Text className="text-base">No workout is running.</Text>
        </FormSheet>
      </SheetScreenContainer>
    );
  }
  const sheet = GymExit_sheet(progress);
  const finish = (): void => {
    close();
    WorkoutFinish_run({
      progress,
      settings: state.storage.settings,
      dispatch,
      isCurrent: true,
      setIsFinishing: () => undefined,
    }).catch(() => Dialog_alert("Something went wrong finishing your workout. Please try again."));
  };

  return (
    <SheetScreenContainer onClose={close} shouldShowClose={true}>
      <FormSheet>
        <View testID="gym-exit" data-testid="gym-exit">
          <Text className="text-xs font-semibold tracking-wide uppercase text-text-secondary">Leaving the gym</Text>
          <Text className="pt-1 pb-2 text-lg font-bold">{sheet.title}</Text>
          {sheet.questions.map((question) => (
            <TickRow
              key={question.id}
              testID={`gym-exit-${question.id}`}
              label={question.text}
              isTicked={ticked.has(question.id)}
              onPress={() => setTicked(TickRow_toggle(ticked, question.id))}
            />
          ))}
          <Button
            name="gym-exit-finish"
            testID="gym-exit-finish"
            data-testid="gym-exit-finish"
            kind="purple"
            buttonSize="lg"
            className="w-full mt-4"
            onClick={finish}
          >
            {sheet.finishLabel}
          </Button>
          <View className="items-center pt-4">
            <LinkButton
              name="gym-exit-back"
              testID="gym-exit-back"
              data-testid="gym-exit-back"
              onClick={() => {
                close();
                dispatch(Thunk_startProgramDay());
              }}
            >
              Back to the workout
            </LinkButton>
          </View>
        </View>
      </FormSheet>
    </SheetScreenContainer>
  );
}
