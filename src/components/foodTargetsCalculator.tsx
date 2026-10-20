import { JSX, useState } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { IFoodGoals } from "../models/foodLog";
import {
  FoodTargets_activities,
  FoodTargets_back,
  FoodTargets_bodyError,
  FoodTargets_goals,
  FoodTargets_next,
  FoodTargets_pickActivity,
  FoodTargets_pickGoal,
  FoodTargets_result,
  FoodTargets_setForm,
  FoodTargets_setHeightUnit,
  FoodTargets_start,
  FoodTargets_stepNumber,
  FoodTargets_toProfile,
  IFoodProfile,
  IFoodTargetsFlow,
} from "../models/foodTargets";
import { IUnit, IWeight } from "../types";
import { FoodChip, FoodPrimaryButton, FoodTextInput } from "./foodUi";

interface IProps {
  profile: IFoodProfile;
  latestWeight?: IWeight;
  units: IUnit;
  onFill: (goals: IFoodGoals, profile: IFoodProfile) => void;
  onCancel: () => void;
}

const resultRows: { key: keyof IFoodGoals; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: " cal" },
  { key: "protein", label: "Protein", unit: " g" },
  { key: "carbs", label: "Carbs", unit: " g" },
  { key: "fat", label: "Fat", unit: " g" },
];

const numberInputStyle = { width: 80, textAlign: "center" } as const;

function ChoiceRow(props: {
  testID: string;
  label: string;
  detail: string;
  isActive: boolean;
  onPress: () => void;
}): JSX.Element {
  return (
    <Pressable
      testID={props.testID}
      data-testid={props.testID}
      onPress={props.onPress}
      className={`px-4 py-3 mb-2 rounded-2xl border ${
        props.isActive ? "border-blue-400 bg-background-subtle" : "border-border-neutral"
      }`}
    >
      <Text className={`text-base ${props.isActive ? "font-semibold text-text-link" : ""}`}>{props.label}</Text>
      <Text className="text-sm text-text-secondary">{props.detail}</Text>
    </Pressable>
  );
}

function FieldRow(props: { label: string; children: JSX.Element | JSX.Element[] }): JSX.Element {
  return (
    <View className="flex-row items-center mb-3" style={{ gap: 8 }}>
      <Text className="flex-1 text-base">{props.label}</Text>
      {props.children}
    </View>
  );
}

function BodyStep(props: { flow: IFoodTargetsFlow; setFlow: (flow: IFoodTargetsFlow) => void }): JSX.Element {
  const form = props.flow.form;
  const set = (patch: Partial<typeof form>): void => props.setFlow(FoodTargets_setForm(props.flow, patch));
  const error = FoodTargets_bodyError(form);
  return (
    <View>
      <FieldRow label={`Weight (${form.weightUnit})`}>
        <FoodTextInput
          testID="food-targets-weight"
          value={form.weight}
          onChangeText={(weight) => set({ weight })}
          keyboardType="decimal-pad"
          inputMode="decimal"
          style={numberInputStyle}
        />
      </FieldRow>
      <FieldRow label="Height">
        <FoodChip
          title="cm"
          isActive={form.heightUnit === "cm"}
          onPress={() => set(FoodTargets_setHeightUnit(form, "cm"))}
        />
        <FoodChip
          title="ft in"
          isActive={form.heightUnit === "ftin"}
          onPress={() => set(FoodTargets_setHeightUnit(form, "ftin"))}
        />
      </FieldRow>
      {form.heightUnit === "cm" ? (
        <FieldRow label="">
          <FoodTextInput
            testID="food-targets-height-cm"
            value={form.heightCm}
            onChangeText={(heightCm) => set({ heightCm })}
            keyboardType="number-pad"
            inputMode="numeric"
            style={numberInputStyle}
          />
          <Text className="text-text-secondary">cm</Text>
        </FieldRow>
      ) : (
        <FieldRow label="">
          <FoodTextInput
            testID="food-targets-height-ft"
            value={form.heightFt}
            onChangeText={(heightFt) => set({ heightFt })}
            keyboardType="number-pad"
            inputMode="numeric"
            style={{ width: 56, textAlign: "center" }}
          />
          <Text className="text-text-secondary">ft</Text>
          <FoodTextInput
            testID="food-targets-height-in"
            value={form.heightIn}
            onChangeText={(heightIn) => set({ heightIn })}
            keyboardType="number-pad"
            inputMode="numeric"
            style={{ width: 56, textAlign: "center" }}
          />
          <Text className="text-text-secondary">in</Text>
        </FieldRow>
      )}
      <FieldRow label="Sex">
        <FoodChip title="Male" isActive={form.sex === "male"} onPress={() => set({ sex: "male" })} />
        <FoodChip title="Female" isActive={form.sex === "female"} onPress={() => set({ sex: "female" })} />
      </FieldRow>
      <FieldRow label="Age">
        <FoodTextInput
          testID="food-targets-age"
          value={form.age}
          onChangeText={(age) => set({ age })}
          keyboardType="number-pad"
          inputMode="numeric"
          style={numberInputStyle}
        />
      </FieldRow>
      {error != null && <Text className="mb-2 text-sm text-text-secondary">{error}</Text>}
      <View className="flex-row mt-2">
        <FoodPrimaryButton
          testID="food-targets-next"
          title="Next"
          disabled={error != null}
          onPress={() => props.setFlow(FoodTargets_next(props.flow))}
        />
      </View>
    </View>
  );
}

function ResultStep(props: { flow: IFoodTargetsFlow; onFill: () => void }): JSX.Element {
  const result = FoodTargets_result(props.flow.form);
  if (result == null) {
    return <Text className="text-sm text-text-error">Go back and check your weight, height and age.</Text>;
  }
  return (
    <View>
      <Text className="mb-3 text-sm text-text-secondary">
        Your maintenance is about {result.maintenance} cal a day.
        {result.isFloored ? " The target stays at the usual minimum of 1200 cal for women and 1500 for men." : ""}
      </Text>
      {resultRows.map((row) => (
        <View key={row.key} className="flex-row items-center py-2 border-b border-border-neutral">
          <Text className="flex-1 text-base">{row.label}</Text>
          <Text testID={`food-targets-result-${row.key}`} className="text-base font-semibold">
            {result.goals[row.key].min} to {result.goals[row.key].max}
            {row.unit}
          </Text>
        </View>
      ))}
      <Text className="mt-3 mb-3 text-sm text-text-secondary">
        Protein is 1.6 to 2.2 g and fat 0.6 to 1.0 g per kg of body weight. Carbs fill the rest. You can change every
        number before you save.
      </Text>
      <View className="flex-row">
        <FoodPrimaryButton testID="food-targets-fill" title="Use these numbers" onPress={props.onFill} />
      </View>
    </View>
  );
}

const titles = {
  body: "About you",
  activity: "How active are you?",
  goal: "What is your goal?",
  result: "Your daily targets",
};

export function FoodTargetsCalculator(props: IProps): JSX.Element {
  const [flow, setFlow] = useState(() =>
    FoodTargets_start(props.profile, props.latestWeight, props.units, new Date().getFullYear())
  );
  const stepNumber = FoodTargets_stepNumber(flow);
  const onBack = (): void => {
    const previous = FoodTargets_back(flow);
    if (previous == null) {
      props.onCancel();
    } else {
      setFlow(previous);
    }
  };
  const onFill = (): void => {
    const result = FoodTargets_result(flow.form);
    if (result != null) {
      props.onFill(result.goals, FoodTargets_toProfile(flow.form, new Date().getFullYear()));
    }
  };
  return (
    <View testID="food-targets-calculator" data-testid="food-targets-calculator">
      <View className="flex-row items-center mb-1">
        <Pressable testID="food-targets-back" data-testid="food-targets-back" onPress={onBack} className="py-1 pr-3">
          <Text className="text-base text-text-link">‹ Back</Text>
        </Pressable>
        <Text className="flex-1 text-sm text-right text-text-secondary">
          Step {stepNumber.index} of {stepNumber.count}
        </Text>
      </View>
      <Text className="mb-4 text-xl font-bold">{titles[flow.step]}</Text>
      {flow.step === "body" && <BodyStep flow={flow} setFlow={setFlow} />}
      {flow.step === "activity" &&
        FoodTargets_activities.map((a) => (
          <ChoiceRow
            key={a.key}
            testID={`food-targets-activity-${a.key}`}
            label={a.label}
            detail={a.detail}
            isActive={flow.form.activity === a.key}
            onPress={() => setFlow(FoodTargets_pickActivity(flow, a.key))}
          />
        ))}
      {flow.step === "goal" &&
        FoodTargets_goals.map((g) => (
          <ChoiceRow
            key={g.key}
            testID={`food-targets-goal-${g.key}`}
            label={g.label}
            detail={g.detail}
            isActive={flow.form.goal === g.key}
            onPress={() => setFlow(FoodTargets_pickGoal(flow, g.key))}
          />
        ))}
      {flow.step === "result" && <ResultStep flow={flow} onFill={onFill} />}
    </View>
  );
}
