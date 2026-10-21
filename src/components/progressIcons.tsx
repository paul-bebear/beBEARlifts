import { JSX } from "react";
import { Path, Rect, Svg } from "./primitives/svg";

export function IconFlame(props: { size?: number; color: string }): JSX.Element {
  const size = props.size ?? 20;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2c1 3.5-1.5 5.2-1.5 7.8 0 1.4 1 2.4 2.2 2.4 1.4 0 2.3-1.1 2.3-2.6 0-.6-.1-1.1-.3-1.6C17.6 9.6 19 12.2 19 15a7 7 0 0 1-14 0c0-4.3 3.4-6.6 4.7-9.2.3 1.6 1 2.6 1.8 3.1C11.3 6.6 11.4 4 12 2z"
        fill={props.color}
      />
    </Svg>
  );
}

export function IconDumbbellBadge(props: { size?: number; color: string }): JSX.Element {
  const size = props.size ?? 12;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={1} y={8} width={4} height={8} rx={1} fill={props.color} />
      <Rect x={5} y={6} width={3} height={12} rx={1} fill={props.color} />
      <Rect x={8} y={11} width={8} height={2} fill={props.color} />
      <Rect x={16} y={6} width={3} height={12} rx={1} fill={props.color} />
      <Rect x={19} y={8} width={4} height={8} rx={1} fill={props.color} />
    </Svg>
  );
}
