import { JSX } from "react";
import { ILatLon, IRouteDrawing, RunRoute_fit } from "../models/runRoute";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { Circle, Line, Polyline, Svg } from "./primitives/svg";

export function RunRouteSvg(props: {
  route: ILatLon[][];
  width?: number;
  height?: number;
  color?: string;
  drawing?: IRouteDrawing;
  lineWidth?: number;
  outline?: string;
}): JSX.Element {
  const width = props.width ?? 320;
  const height = props.height ?? 240;
  const drawing = props.drawing ?? RunRoute_fit(props.route, width, height, 16);
  const color = props.color ?? Tailwind_semantic().text.link;
  const lineWidth = props.lineWidth ?? 4;
  const outline = props.outline;
  return (
    <Svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Run route. Dots mark pauses, circle marks the start, ring marks the finish."
    >
      {drawing.gaps.map((gap, i) => (
        <Line
          key={`gap-${i}`}
          x1={gap.from.x}
          y1={gap.from.y}
          x2={gap.to.x}
          y2={gap.to.y}
          stroke={color}
          strokeOpacity={0.7}
          strokeWidth={lineWidth * 0.75}
          strokeLinecap="round"
          strokeDasharray={`0.1 ${lineWidth * 2.5}`}
        />
      ))}
      {outline != null &&
        drawing.lines.map((points, i) => (
          <Polyline
            key={`outline-${i}`}
            points={points}
            fill="none"
            stroke={outline}
            strokeWidth={lineWidth + 4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      {drawing.lines.map((points, i) => (
        <Polyline
          key={i}
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={lineWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {drawing.start != null && (
        <Circle cx={drawing.start.x} cy={drawing.start.y} r={lineWidth * 1.5} fill={color} stroke={outline} />
      )}
      {drawing.end != null && (
        <Circle
          cx={drawing.end.x}
          cy={drawing.end.y}
          r={lineWidth * 2.25}
          fill="none"
          stroke={color}
          strokeWidth={lineWidth * 0.75}
        />
      )}
    </Svg>
  );
}
