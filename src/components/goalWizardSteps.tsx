import { JSX } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { Slider } from "./primitives/slider";
import { Switch } from "./primitives/switch";
import { Circle, Path, Svg } from "./primitives/svg";
import { FoodChip, FoodTextInput } from "./foodUi";
import { IFoodSex } from "../models/foodTargets";
import { BodyFat_band, BodyFat_figure, BodyFat_figurePath, BodyFat_range } from "../models/bodyFatEstimate";
import { ProgramGoal_kinds, ProgramGoal_stepsBands } from "../models/programGoal";
import {
  GoalWizard_bodyFat,
  GoalWizard_measureError,
  GoalWizard_setMeasure,
  GoalWizard_setPace,
  GoalWizard_setSex,
  GoalWizard_setUpdateTargets,
  IGoalWizard,
  IGoalWizardMeasureKey,
  IGoalWizardPreview,
} from "../models/goalWizard";
import { Tailwind_semantic } from "../utils/tailwindConfig";

interface IStepProps {
  wizard: IGoalWizard;
  setWizard: (wizard: IGoalWizard) => void;
}

export function GoalWizardChoice(props: {
  testID: string;
  label: string;
  detail?: string;
  isActive: boolean;
  badge?: string;
  onPress: () => void;
}): JSX.Element {
  return (
    <Pressable
      testID={props.testID}
      data-testid={props.testID}
      onPress={props.onPress}
      className={`px-4 py-3.5 mb-2 rounded-2xl border ${
        props.isActive ? "border-blue-400 bg-background-subtle" : "border-border-neutral"
      }`}
    >
      <View className="flex-row items-center">
        <Text className={`flex-1 text-base ${props.isActive ? "font-semibold text-text-link" : ""}`}>
          {props.label}
        </Text>
        {props.badge != null && (
          <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(34, 197, 94, 0.22)" }}>
            <Text className="text-xs font-semibold">{props.badge}</Text>
          </View>
        )}
      </View>
      {props.detail != null && <Text className="text-sm text-text-secondary">{props.detail}</Text>}
    </Pressable>
  );
}

function SexChips(props: { sex?: IFoodSex; onChange: (sex: IFoodSex) => void }): JSX.Element {
  return (
    <View className="flex-row mb-4" style={{ gap: 8 }}>
      <FoodChip title="Male" isActive={props.sex === "male"} onPress={() => props.onChange("male")} />
      <FoodChip title="Female" isActive={props.sex === "female"} onPress={() => props.onChange("female")} />
    </View>
  );
}

export function GoalWizardIntro(): JSX.Element {
  return (
    <View testID="goal-wizard-intro" data-testid="goal-wizard-intro">
      <Text className="mb-3 text-base">
        Answer four short questions. The app picks a pace for your goal and can update your daily food targets.
      </Text>
      <Text className="text-sm text-text-secondary">
        Your weight on the day you save becomes the start weight. Everything stays on this phone.
      </Text>
    </View>
  );
}

export function GoalWizardGoalStep(
  props: IStepProps & { onPick: (kind: IGoalWizard["kind"] & string) => void }
): JSX.Element {
  return (
    <View>
      {ProgramGoal_kinds.map((k) => (
        <GoalWizardChoice
          key={k.key}
          testID={`goal-wizard-goal-${k.key}`}
          label={k.label}
          detail={k.detail}
          isActive={props.wizard.kind === k.key}
          onPress={() => props.onPick(k.key)}
        />
      ))}
    </View>
  );
}

export function GoalWizardActivityStep(
  props: IStepProps & { onPick: (band: IGoalWizard["activity"] & string) => void }
): JSX.Element {
  return (
    <View>
      <Text className="mb-3 text-sm text-text-secondary">Count a normal day, not counting your workouts.</Text>
      {ProgramGoal_stepsBands.map((b) => (
        <GoalWizardChoice
          key={b.key}
          testID={`goal-wizard-activity-${b.key}`}
          label={b.label}
          detail={b.detail}
          isActive={props.wizard.activity === b.key}
          onPress={() => props.onPick(b.key)}
        />
      ))}
    </View>
  );
}

export function GoalWizardMethodStep(
  props: IStepProps & { onPick: (method: IGoalWizard["method"] & string) => void }
): JSX.Element {
  return (
    <View>
      <GoalWizardChoice
        testID="goal-wizard-method-visual"
        label="Estimate it visually"
        detail="Move a slider until the description matches you. Takes 10 seconds."
        isActive={props.wizard.method === "visual"}
        onPress={() => props.onPick("visual")}
      />
      <GoalWizardChoice
        testID="goal-wizard-method-measure"
        label="Calculate from measurements"
        detail="Use a tape measure on your waist, neck and hips. More accurate."
        isActive={props.wizard.method === "measure"}
        onPress={() => props.onPick("measure")}
      />
    </View>
  );
}

function BodyOutline(props: { sex?: IFoodSex; pct: number }): JSX.Element {
  const color = Tailwind_semantic().text.link;
  return (
    <Svg width={110} height={220} viewBox="0 0 100 200">
      <Circle cx={50} cy={22} r={13} fill={color} opacity={0.85} />
      <Path d={BodyFat_figurePath(BodyFat_figure(props.sex, props.pct))} fill={color} opacity={0.85} />
    </Svg>
  );
}

export function GoalWizardVisualStep(props: IStepProps & { onSlide: (pct: number) => void }): JSX.Element {
  const { wizard } = props;
  const range = BodyFat_range(wizard.sex);
  const band = BodyFat_band(wizard.sex, wizard.visualPct);
  return (
    <View>
      <SexChips sex={wizard.sex} onChange={(sex) => props.setWizard(GoalWizard_setSex(wizard, sex))} />
      <View className="flex-row items-center">
        <BodyOutline sex={wizard.sex} pct={wizard.visualPct} />
        <View className="flex-1 ml-4">
          <Text testID="goal-wizard-visual-pct" className="font-bold" style={{ fontSize: 56, lineHeight: 64 }}>
            {wizard.visualPct}%
          </Text>
          <Text className="text-base font-semibold">{band.label}</Text>
          <Text className="text-sm text-text-secondary">{band.detail}</Text>
        </View>
      </View>
      <View className="flex-row items-center mt-4">
        <Slider
          min={range.min}
          max={range.max}
          step={range.step}
          value={wizard.visualPct}
          onChange={props.onSlide}
          onSlide={props.onSlide}
        />
      </View>
      <View className="flex-row justify-between">
        <Text className="text-xs text-text-secondary">{range.min}%</Text>
        <Text className="text-xs text-text-secondary">{range.max}%</Text>
      </View>
    </View>
  );
}

const measureFields: { key: IGoalWizardMeasureKey; label: string }[] = [
  { key: "height", label: "Height" },
  { key: "waist", label: "Waist, at the belly button" },
  { key: "neck", label: "Neck, below the Adam's apple" },
  { key: "hips", label: "Hips, at the widest point" },
];

export function GoalWizardMeasureStep(props: IStepProps): JSX.Element {
  const { wizard } = props;
  const error = GoalWizard_measureError(wizard);
  const bodyFat = GoalWizard_bodyFat(wizard);
  return (
    <View>
      <SexChips sex={wizard.sex} onChange={(sex) => props.setWizard(GoalWizard_setSex(wizard, sex))} />
      {measureFields
        .filter((f) => f.key !== "hips" || wizard.sex !== "male")
        .map((f) => (
          <View key={f.key} className="flex-row items-center mb-3" style={{ gap: 8 }}>
            <Text className="flex-1 text-base">{f.label}</Text>
            <FoodTextInput
              testID={`goal-wizard-measure-${f.key}`}
              value={wizard.measure[f.key]}
              onChangeText={(text) => props.setWizard(GoalWizard_setMeasure(wizard, { [f.key]: text }))}
              keyboardType="decimal-pad"
              inputMode="decimal"
              style={{ width: 80, textAlign: "center" }}
            />
            <Text className="w-6 text-text-secondary">{wizard.measure.unit}</Text>
          </View>
        ))}
      {error != null ? (
        <Text className="text-sm text-text-secondary">{error}</Text>
      ) : (
        <Text testID="goal-wizard-measure-result" className="text-xl font-bold">
          About {bodyFat}% body fat
        </Text>
      )}
    </View>
  );
}

export function GoalWizardResultStep(props: IStepProps & { preview: IGoalWizardPreview }): JSX.Element {
  const { wizard, preview } = props;
  const targets = preview.targets;
  return (
    <View>
      {wizard.kind === "maintain" ? (
        <Text className="mb-3 text-base">You will eat at maintenance and keep your weight steady.</Text>
      ) : (
        <>
          <Text className="mb-2 text-sm font-semibold tracking-wide uppercase text-text-secondary">Pace</Text>
          {preview.paceOptions.map((o) => (
            <GoalWizardChoice
              key={o.pace}
              testID={`goal-wizard-pace-${o.pace}`}
              label={o.label}
              detail={o.detail}
              badge={o.isRecommended ? "Recommended" : undefined}
              isActive={wizard.pace === o.pace}
              onPress={() => props.setWizard(GoalWizard_setPace(wizard, o.pace))}
            />
          ))}
        </>
      )}
      {preview.note != null && <Text className="mt-1 mb-3 text-sm text-text-secondary">{preview.note}</Text>}
      {targets != null ? (
        <View className="p-4 mt-2 rounded-2xl bg-background-subtle">
          <View className="flex-row items-center">
            <Text className="flex-1 text-base font-semibold">Update my daily targets</Text>
            <Switch
              testID="goal-wizard-update-targets"
              value={wizard.updateTargets}
              onValueChange={(updateTargets) => props.setWizard(GoalWizard_setUpdateTargets(wizard, updateTargets))}
            />
          </View>
          <Text className="mt-1 text-sm text-text-secondary">
            {targets.goals.calories.min} to {targets.goals.calories.max} cal · {targets.goals.protein.min} to{" "}
            {targets.goals.protein.max} g protein. Maintenance is about {targets.maintenance} cal.
          </Text>
        </View>
      ) : (
        <Text className="mt-2 text-sm text-text-secondary">
          Log your weight and fill in Daily targets → calculator once. Then this step can set your calories too.
        </Text>
      )}
    </View>
  );
}
