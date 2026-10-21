import { JSX, useState } from "react";
import { LayoutChangeEvent, View } from "react-native";
import { Line, Rect, Svg, SvgText } from "./primitives/svg";
import { IStepsChart, Steps_chartLayout } from "../models/steps";
import { Tailwind_semantic } from "../utils/tailwindConfig";

const chartHeight = 160;
const labelHeight = 18;

export function StepsChart(props: { chart: IStepsChart; goal: number }): JSX.Element {
  const [width, setWidth] = useState(0);
  const semantic = Tailwind_semantic();
  const layout = Steps_chartLayout(props.chart, props.goal, { width, height: chartHeight, labelHeight });
  return (
    <View
      testID="steps-chart"
      data-testid="steps-chart"
      style={{ height: chartHeight }}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <Svg width={width} height={chartHeight}>
          {layout.bars.map((bar, i) => (
            <Rect
              key={`bar-${i}`}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              rx={3}
              fill={bar.isGoalHit ? semantic.icon.green : semantic.icon.blue}
              opacity={bar.isGoalHit ? 1 : 0.7}
            />
          ))}
          <Line
            x1={0}
            x2={width}
            y1={layout.goalY}
            y2={layout.goalY}
            stroke={semantic.text.secondary}
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
          {layout.bars.map((bar, i) => (
            <SvgText
              key={`label-${i}`}
              x={bar.labelX}
              y={chartHeight - 4}
              fontSize={11}
              textAnchor="middle"
              fill={semantic.text.secondary}
            >
              {bar.label}
            </SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
}
