import { JSX, ReactNode, useEffect, useRef, useState } from "react";
import { PanResponder, Pressable, Text, View, ViewStyle } from "react-native";
import { BearHouse_box, IBearHouseObject } from "../models/bearHouse";
import {
  HouseArrange_export,
  HouseArrange_reduce,
  IHouseArrangeAction,
  IHouseArrangeState,
} from "../models/houseArrange";

export interface IHouseArrangeProps {
  state: IHouseArrangeState;
  objects: IBearHouseObject[];
  unit: number;
  onChange: (state: IHouseArrangeState) => void;
}

const copiedMs = 2000;
const pickedColor = "#FF2D55";
const handleSize = 44;
const growFactor = 1.05;
const shrinkFactor = 0.95;
// react-native-web passes these CSS values through, but the react-native types do not list them.
const noTouchScroll = { touchAction: "none", userSelect: "none" } as unknown as ViewStyle;
const pinnedTop = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 9999,
  paddingTop: "env(safe-area-inset-top)",
} as unknown as ViewStyle;
const pinnedBottom = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 9999,
  paddingBottom: "env(safe-area-inset-bottom)",
} as unknown as ViewStyle;

interface IBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

function DragHandle(props: {
  testID: string;
  box: IBox;
  onBegin: () => void;
  onDrag: (dx: number, dy: number) => void;
  children?: ReactNode;
  style?: ViewStyle;
}): JSX.Element {
  const latest = useRef(props);
  latest.current = props;
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => latest.current.onBegin(),
      onPanResponderMove: (_event, gesture) => latest.current.onDrag(gesture.dx, gesture.dy),
    })
  ).current;
  return (
    <View
      testID={props.testID}
      data-testid={props.testID}
      {...responder.panHandlers}
      style={[{ position: "absolute", ...props.box }, noTouchScroll, props.style]}
    >
      {props.children}
    </View>
  );
}

function centered(x: number, y: number, size: number): IBox {
  return { left: x - size / 2, top: y - size / 2, width: size, height: size };
}

function legacyCopy(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  return ok;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    return legacyCopy(text);
  }
}

function Button(props: { testID: string; label: string; isDisabled?: boolean; onPress: () => void }): JSX.Element {
  return (
    <Pressable
      testID={props.testID}
      data-testid={props.testID}
      disabled={props.isDisabled}
      onPress={props.onPress}
      style={{
        flex: 1,
        marginHorizontal: 3,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
        backgroundColor: props.isDisabled ? "#6B7280" : "#FFFFFF",
      }}
    >
      <Text style={{ color: "#111827", fontSize: 14, fontWeight: "600" }} numberOfLines={1}>
        {props.label}
      </Text>
    </Pressable>
  );
}

function RoomPicker(props: { state: IHouseArrangeState; onChange: (state: IHouseArrangeState) => void }): JSX.Element {
  const { state } = props;
  return (
    <View style={[pinnedTop, noTouchScroll, { backgroundColor: "rgba(17, 24, 39, 0.85)" }]}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", padding: 6 }}>
        {Object.keys(state.manifest.rooms).map((room) => (
          <Pressable
            key={room}
            testID={`arrange-room-${room}`}
            data-testid={`arrange-room-${room}`}
            onPress={() => props.onChange(HouseArrange_reduce(state, { type: "pickRoom", room }))}
            style={{
              margin: 3,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 16,
              backgroundColor: room === state.room ? pickedColor : "#FFFFFF",
            }}
          >
            <Text style={{ color: room === state.room ? "#FFFFFF" : "#111827", fontSize: 13, fontWeight: "600" }}>
              {room}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function pickedLine(state: IHouseArrangeState): string {
  const slot = state.picked == null ? undefined : state.manifest.rooms[state.room].objects[state.picked];
  return slot == null ? "Tap an object, then drag it" : `${state.picked}  [${slot.rect.join(", ")}]`;
}

function Toolbar(props: { state: IHouseArrangeState; onChange: (state: IHouseArrangeState) => void }): JSX.Element {
  const { state } = props;
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (copy === "idle") {
      return;
    }
    const timer = setTimeout(() => setCopy("idle"), copiedMs);
    return () => clearTimeout(timer);
  }, [copy]);
  const scale = (factor: number): void => {
    if (state.picked != null) {
      props.onChange(HouseArrange_reduce(state, { type: "scale", id: state.picked, factor }));
    }
  };
  const onCopy = async (): Promise<void> => {
    setCopy((await copyText(HouseArrange_export(state))) ? "copied" : "failed");
  };
  const copyLabel = copy === "copied" ? "Copied" : copy === "failed" ? "Copy failed" : "Copy manifest";
  return (
    <View style={[pinnedBottom, noTouchScroll, { backgroundColor: "rgba(17, 24, 39, 0.85)", padding: 6 }]}>
      <Text testID="arrange-picked" style={{ color: "#FFFFFF", fontSize: 13, textAlign: "center", padding: 4 }}>
        {pickedLine(state)}
      </Text>
      <View style={{ flexDirection: "row" }}>
        <Button
          testID="arrange-bigger"
          label="Bigger"
          isDisabled={state.picked == null}
          onPress={() => scale(growFactor)}
        />
        <Button
          testID="arrange-smaller"
          label="Smaller"
          isDisabled={state.picked == null}
          onPress={() => scale(shrinkFactor)}
        />
        <Button
          testID="arrange-reset"
          label="Reset"
          onPress={() => props.onChange(HouseArrange_reduce(state, { type: "reset" }))}
        />
        <Button testID="arrange-copy" label={copyLabel} onPress={onCopy} />
      </View>
    </View>
  );
}

// Dragging replays the whole gesture from the state at touch-down. Snapping each small step would round it to nothing.
export function HouseArrange(props: IHouseArrangeProps): JSX.Element {
  const { state, unit } = props;
  const latest = useRef(props);
  latest.current = props;
  const start = useRef(state);
  const begin = (action: IHouseArrangeAction): void => {
    start.current = HouseArrange_reduce(latest.current.state, action);
    latest.current.onChange(start.current);
  };
  const drag =
    (make: (dx: number, dy: number) => IHouseArrangeAction) =>
    (dx: number, dy: number): void => {
      const scale = latest.current.unit;
      latest.current.onChange(HouseArrange_reduce(start.current, make(dx / scale, dy / scale)));
    };
  const drawn = props.objects.filter((o) => o.image != null);
  const ordered = [...drawn.filter((o) => o.id !== state.picked), ...drawn.filter((o) => o.id === state.picked)];
  const pills = state.manifest.rooms[state.room].objects;
  const foot = state.manifest.bearFoot;
  return (
    <View
      testID="house-arrange"
      data-testid="house-arrange"
      onStartShouldSetResponder={() => true}
      style={[{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }, noTouchScroll]}
    >
      {ordered.map((o) => (
        <DragHandle
          key={o.id}
          testID={`arrange-${o.id}`}
          box={BearHouse_box(o.rect, unit)}
          onBegin={() => begin({ type: "pick", id: o.id })}
          onDrag={drag((dx, dy) => ({ type: "move", id: o.id, dx, dy }))}
          style={{
            borderWidth: o.id === state.picked ? 2 : 1,
            borderColor: o.id === state.picked ? pickedColor : "rgba(255, 255, 255, 0.6)",
          }}
        />
      ))}
      {drawn.map((o) => (
        <DragHandle
          key={o.id}
          testID={`arrange-${o.id}-pill`}
          box={centered(pills[o.id].pill[0] * unit, pills[o.id].pill[1] * unit, handleSize)}
          onBegin={() => begin({ type: "pick", id: o.id })}
          onDrag={drag((dx, dy) => ({ type: "movePill", id: o.id, dx, dy }))}
          style={{ alignItems: "center", justifyContent: "center" }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 3,
              borderColor: "#FFFFFF",
              backgroundColor: o.id === state.picked ? pickedColor : "#F59E0B",
            }}
          />
        </DragHandle>
      ))}
      <DragHandle
        testID="arrange-foot"
        box={centered(foot[0] * unit, foot[1] * unit, handleSize)}
        onBegin={() => begin({ type: "pick", id: undefined })}
        onDrag={drag((dx, dy) => ({ type: "moveFoot", dx, dy }))}
        style={{ alignItems: "center", justifyContent: "center" }}
      >
        <View
          style={{
            width: 28,
            height: 12,
            borderRadius: 6,
            borderWidth: 3,
            borderColor: "#FFFFFF",
            backgroundColor: "#2563EB",
          }}
        />
      </DragHandle>
      <RoomPicker state={state} onChange={props.onChange} />
      <Toolbar state={state} onChange={props.onChange} />
    </View>
  );
}
