import { JSX } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { IBearState } from "../models/bear";
import { IBearLine } from "../models/bearStoreData";
import { BearText_levelLine, BearText_levelTitle, BearText_status } from "../models/bearText";
import { CubNumber_label } from "../models/cubNumber";
import { ShareCardTheme as T } from "./shareCards/shareCardTheme";

interface IProps {
  state: IBearState;
  now: number;
  cub?: number;
  onLine: (line: IBearLine) => void;
}

const energyColor = "#5B8DEF";

function Bar(props: { fraction: number; color: string; height: number; testID?: string }): JSX.Element {
  const percent = Math.round(Math.max(0, Math.min(1, props.fraction)) * 100);
  return (
    <View
      testID={props.testID}
      data-testid={props.testID}
      className="overflow-hidden rounded-full bg-background-subtle"
      style={{ height: props.height }}
    >
      <View style={{ width: `${percent}%`, height: props.height, backgroundColor: props.color }} />
    </View>
  );
}

function Meter(props: { label: string; value: number; color: string; testID: string }): JSX.Element {
  return (
    <View className="flex-1">
      <View className="flex-row justify-between mb-1">
        <Text className="text-xs text-text-secondary">{props.label}</Text>
        <Text className="text-xs font-semibold">{Math.round(props.value)}%</Text>
      </View>
      <Bar testID={props.testID} fraction={props.value / 100} color={props.color} height={6} />
    </View>
  );
}

function LineChoice(props: { line: IBearLine; label: string; current: IBearLine; onPress: () => void }): JSX.Element {
  const isOn = props.line === props.current;
  return (
    <Pressable
      testID={`bear-line-${props.line}`}
      data-testid={`bear-line-${props.line}`}
      onPress={props.onPress}
      className={`px-3 py-1 rounded-full ${isOn ? "" : "border border-border-neutral"}`}
      style={isOn ? { backgroundColor: T.honey } : undefined}
    >
      <Text className="text-sm font-semibold">{props.label}</Text>
    </Pressable>
  );
}

export function BearPanel(props: IProps): JSX.Element {
  const { state } = props;
  return (
    <View className="px-4 pt-3 pb-2" testID="bear-panel" data-testid="bear-panel">
      {props.cub != null && (
        <Text className="text-sm font-bold tracking-widest uppercase" testID="bear-cub" data-testid="bear-cub">
          {CubNumber_label(props.cub)}
        </Text>
      )}
      <Text className="text-2xl font-bold" testID="bear-level" data-testid="bear-level">
        {BearText_levelTitle(state.level)}
      </Text>
      <Text className="mb-2 text-base" testID="bear-status" data-testid="bear-status">
        {BearText_status(state, props.now)}
      </Text>
      <Bar testID="bear-level-bar" fraction={state.level.fraction} color={T.honey} height={12} />
      <Text className="mt-1 text-sm text-text-secondary" testID="bear-level-line" data-testid="bear-level-line">
        {BearText_levelLine(state.level)}
      </Text>
      <View className="flex-row mt-4" style={{ gap: 16 }}>
        <Meter testID="bear-fullness" label="Fullness" value={state.fullness} color={T.green} />
        <Meter testID="bear-energy" label="Energy" value={state.energy} color={energyColor} />
      </View>
      <View className="flex-row items-center mt-4" style={{ gap: 8 }}>
        <Text className="mr-1 text-sm text-text-secondary">Your bear</Text>
        <LineChoice line="male" label="Male" current={state.line} onPress={() => props.onLine("male")} />
        <LineChoice line="female" label="Female" current={state.line} onPress={() => props.onLine("female")} />
      </View>
    </View>
  );
}
