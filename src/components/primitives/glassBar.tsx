import { JSX, ReactNode } from "react";
import { StyleProp, View, ViewStyle } from "react-native";

interface IGlassBarProps {
  children?: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: "tablist";
}

export function GlassBar(props: IGlassBarProps): JSX.Element {
  return (
    <View
      className={`glass-bar overflow-hidden ${props.className ?? ""}`}
      style={props.style}
      accessibilityRole={props.accessibilityRole}
    >
      {props.children}
    </View>
  );
}

export function GlassTabLens(): JSX.Element {
  return <View pointerEvents="none" className="glass-tab-lens" />;
}
