import { JSX, ReactNode } from "react";
import { StyleProp, TextStyle, View, ViewStyle } from "react-native";
import { TextRaw, Text_resolveFontFamily } from "../primitives/text";
import { Svg, Defs, LinearGradient, Rect, Stop } from "../primitives/svg";
import { BearMark } from "./bearMark";
import { ShareCardTheme } from "./shareCardTheme";

type IWeight = "regular" | "semibold" | "bold";

const weightClass: Record<IWeight, string> = { regular: "", semibold: "font-semibold", bold: "font-bold" };
const weightValue: Record<IWeight, TextStyle["fontWeight"]> = { regular: "400", semibold: "600", bold: "700" };

interface ITextProps {
  size: number;
  weight?: IWeight;
  color?: string;
  align?: TextStyle["textAlign"];
  spacing?: number;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  children: ReactNode;
}

// Fixed sizes: the app's text-size setting scales text-* classes, which would push text off a fixed 360x640 card.
export function ShareCardText(props: ITextProps): JSX.Element {
  const weight = props.weight ?? "regular";
  return (
    <TextRaw
      numberOfLines={props.numberOfLines}
      style={[
        {
          fontFamily: Text_resolveFontFamily(weightClass[weight]),
          fontWeight: weightValue[weight],
          fontSize: props.size,
          lineHeight: Math.round(props.size * 1.2),
          color: props.color ?? ShareCardTheme.cream,
          textAlign: props.align,
          letterSpacing: props.spacing,
        },
        props.style,
      ]}
    >
      {props.children}
    </TextRaw>
  );
}

export function ShareCardFrame(props: {
  background: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}): JSX.Element {
  return (
    <View
      style={[
        {
          width: ShareCardTheme.width,
          height: ShareCardTheme.height,
          backgroundColor: props.background,
          overflow: "hidden",
        },
        props.style,
      ]}
    >
      {props.children}
    </View>
  );
}

export function ShareCardBrand(props: { size: number; color: string; faceColor: string }): JSX.Element {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: props.size * 0.3 }}>
      <BearMark size={props.size} color={props.color} faceColor={props.faceColor} />
      <ShareCardText size={props.size * 0.9} weight="bold" color={props.color} spacing={-0.5}>
        beBEAR
      </ShareCardText>
    </View>
  );
}

export function ShareCardScrim(props: { edge: "top" | "bottom"; height: number; opacity: number }): JSX.Element {
  const id = `scrim-${props.edge}`;
  return (
    <View style={{ position: "absolute", left: 0, right: 0, height: props.height, [props.edge]: 0 }}>
      <Svg width={ShareCardTheme.width} height={props.height}>
        <Defs>
          <LinearGradient
            id={id}
            x1="0"
            y1={props.edge === "top" ? "0" : "1"}
            x2="0"
            y2={props.edge === "top" ? "1" : "0"}
          >
            <Stop offset="0" stopColor="#000000" stopOpacity={props.opacity} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={ShareCardTheme.width} height={props.height} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

export function ShareCardProgress(props: {
  fraction: number;
  color: string;
  track: string;
  width: number;
}): JSX.Element {
  return (
    <View style={{ width: props.width, height: 8, borderRadius: 4, backgroundColor: props.track, overflow: "hidden" }}>
      <View style={{ width: props.width * props.fraction, height: 8, backgroundColor: props.color }} />
    </View>
  );
}
