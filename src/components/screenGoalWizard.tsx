import { JSX, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { useNavOptions } from "../navigation/useNavOptions";
import { useTrackedDispatch, useTrackedState, untrack } from "../navigation/TrackedStateContext";
import { EditStats_addPercentageStats } from "../models/editStats";
import { Stats_getCurrentBodyweight } from "../models/stats";
import { FoodLog_setGoals, FoodLog_setProfile } from "../models/foodLog";
import { ProgramGoal_set } from "../models/programGoal";
import {
  GoalWizard_back,
  GoalWizard_canContinue,
  GoalWizard_finish,
  GoalWizard_latestLengths,
  GoalWizard_next,
  GoalWizard_pickActivity,
  GoalWizard_pickGoal,
  GoalWizard_pickMethod,
  GoalWizard_preview,
  GoalWizard_progress,
  GoalWizard_setVisual,
  GoalWizard_start,
  IGoalWizardMode,
  IGoalWizardStep,
} from "../models/goalWizard";
import { FoodLogStore_update, useFoodLog } from "../utils/foodLogStore";
import { ProgramGoalStore } from "../utils/programGoalStore";
import {
  GoalWizardActivityStep,
  GoalWizardGoalStep,
  GoalWizardIntro,
  GoalWizardMeasureStep,
  GoalWizardMethodStep,
  GoalWizardResultStep,
  GoalWizardVisualStep,
} from "./goalWizardSteps";

const titles: Record<IGoalWizardStep, string> = {
  intro: "Change your program goal",
  goal: "What is most important to you right now?",
  activity: "How many steps do you take on a normal day?",
  bodyFatMethod: "How do you want to find your body fat?",
  bodyFatVisual: "Which looks most like you?",
  bodyFatMeasure: "Your measurements",
  result: "Your goal",
};

const continueSteps: IGoalWizardStep[] = ["intro", "bodyFatVisual", "bodyFatMeasure"];

export function ScreenGoalWizard(props: { mode: IGoalWizardMode }): JSX.Element {
  const navigation = useNavigation();
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const stats = untrack(state.storage.stats);
  const settings = untrack(state.storage.settings);
  const foodLog = useFoodLog();
  const goalLog = ProgramGoalStore.use();
  const [wizard, setWizard] = useState(() =>
    GoalWizard_start({
      mode: props.mode,
      current: goalLog.current,
      profile: foodLog.profile,
      lengthUnit: settings.lengthUnits,
      latest: GoalWizard_latestLengths(stats),
    })
  );
  const context = useMemo(
    () => ({
      now: Date.now(),
      year: new Date().getFullYear(),
      current: goalLog.current,
      profile: foodLog.profile,
      latestWeight: Stats_getCurrentBodyweight(stats),
    }),
    [goalLog, foodLog.profile, stats]
  );
  const preview = useMemo(() => GoalWizard_preview(wizard, context), [wizard, context]);

  useNavOptions({ navTitle: wizard.mode === "pace" ? "Change pace" : "Change goal" });

  const onBack = (): void => {
    const previous = GoalWizard_back(wizard);
    if (previous == null) {
      navigation.goBack();
    } else {
      setWizard(previous);
    }
  };

  const onSave = async (): Promise<void> => {
    const save = GoalWizard_finish(wizard, { ...context, now: Date.now() });
    if (save == null) {
      return;
    }
    await ProgramGoalStore.update((log) => ProgramGoal_set(log, save.goal));
    const food = save.food;
    if (food != null) {
      await FoodLogStore_update((log) => FoodLog_setGoals(FoodLog_setProfile(log, food.profile), food.goals));
    }
    if (save.bodyFatPct != null) {
      EditStats_addPercentageStats(dispatch, { bodyfat: { value: save.bodyFatPct, unit: "%" } }, save.goal.startedAt);
    }
    navigation.goBack();
  };

  const canContinue = GoalWizard_canContinue(wizard);
  return (
    <View className="px-4 pt-2 pb-8" testID="goal-wizard" data-testid="goal-wizard">
      <View className="flex-row items-center mb-3">
        <Pressable testID="goal-wizard-back" data-testid="goal-wizard-back" onPress={onBack} className="py-1 pr-3">
          <Text className="text-base text-text-link">‹ Back</Text>
        </Pressable>
        <View className="flex-1 h-1.5 rounded-full bg-background-subtle overflow-hidden">
          <View
            className="h-full bg-blue-400 rounded-full"
            style={{ width: `${Math.round(GoalWizard_progress(wizard) * 100)}%` }}
          />
        </View>
      </View>
      <Text className="mb-4 text-2xl font-bold">{titles[wizard.step]}</Text>
      {wizard.step === "intro" && <GoalWizardIntro />}
      {wizard.step === "goal" && (
        <GoalWizardGoalStep
          wizard={wizard}
          setWizard={setWizard}
          onPick={(k) => setWizard(GoalWizard_pickGoal(wizard, k))}
        />
      )}
      {wizard.step === "activity" && (
        <GoalWizardActivityStep
          wizard={wizard}
          setWizard={setWizard}
          onPick={(band) => setWizard(GoalWizard_pickActivity(wizard, band))}
        />
      )}
      {wizard.step === "bodyFatMethod" && (
        <GoalWizardMethodStep
          wizard={wizard}
          setWizard={setWizard}
          onPick={(method) => setWizard(GoalWizard_pickMethod(wizard, method))}
        />
      )}
      {wizard.step === "bodyFatVisual" && (
        <GoalWizardVisualStep
          wizard={wizard}
          setWizard={setWizard}
          onSlide={(pct) => setWizard((w) => GoalWizard_setVisual(w, pct))}
        />
      )}
      {wizard.step === "bodyFatMeasure" && <GoalWizardMeasureStep wizard={wizard} setWizard={setWizard} />}
      {wizard.step === "result" && <GoalWizardResultStep wizard={wizard} setWizard={setWizard} preview={preview} />}
      {continueSteps.includes(wizard.step) && (
        <View className="flex-row mt-6">
          <Button
            name="goal-wizard-continue"
            kind="pill"
            className="flex-1"
            disabled={!canContinue}
            onPress={() => setWizard(GoalWizard_next(wizard))}
          >
            {wizard.step === "intro" ? "Start" : "Continue"}
          </Button>
        </View>
      )}
      {wizard.step === "result" && (
        <View className="flex-row mt-6">
          <Button name="goal-wizard-save" kind="pill" className="flex-1" disabled={!canContinue} onPress={onSave}>
            Save goal
          </Button>
        </View>
      )}
    </View>
  );
}
