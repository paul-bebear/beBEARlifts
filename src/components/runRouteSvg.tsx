import { JSX } from "react";
import { ILatLon, RunRoute_fit } from "../models/runRoute";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { Circle, Polyline, Svg } from "./primitives/svg";

export function RunRouteSvg(props: {
  route: ILatLon[][];
  width?: number;
  height?: number;
  color?: string;
}): JSX.Element {
  const width = props.width ?? 320;
  const height = props.height ?? 240;
  const drawing = RunRoute_fit(props.route, width, height, 16);
  const color = props.color ?? Tailwind_semantic().text.link;
  return (
    <Svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Run route. Circle marks the start, ring marks the finish."
    >
      {drawing.lines.map((points, i) => (
        <Polyline
          key={i}
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {drawing.start != null && <Circle cx={drawing.start.x} cy={drawing.start.y} r={6} fill={color} />}
      {drawing.end != null && (
        <Circle cx={drawing.end.x} cy={drawing.end.y} r={9} fill="none" stroke={color} strokeWidth={3} />
      )}
    </Svg>
  );
}
