import { JSX } from "react";
import { Svg, Circle, Path, Rect } from "../primitives/svg";

interface IProps {
  size: number;
  color: string;
  faceColor: string;
}

// A vector copy of the app icon's bear, so the card needs no image file on either platform.
export function BearMark(props: IProps): JSX.Element {
  return (
    <Svg viewBox="0 0 100 100" width={props.size} height={props.size}>
      <Circle cx={22} cy={24} r={14} fill={props.color} />
      <Circle cx={78} cy={24} r={14} fill={props.color} />
      <Circle cx={24} cy={26} r={6} fill={props.faceColor} />
      <Circle cx={76} cy={26} r={6} fill={props.faceColor} />
      <Path d="M16 46 Q16 28 34 26 L66 26 Q84 28 84 46 L87 74 L72 89 L28 89 L13 74 Z" fill={props.color} />
      <Rect x={31} y={45} width={13} height={4} rx={2} fill={props.faceColor} />
      <Rect x={56} y={45} width={13} height={4} rx={2} fill={props.faceColor} />
      <Path d="M37 74 Q35 60 50 57 Q65 60 63 74 Q57 70 50 74 Q43 70 37 74 Z" fill={props.faceColor} />
      <Path d="M44 60 L56 60 Q56 65 50 67 Q44 65 44 60 Z" fill={props.color} />
      <Rect x={49.2} y={66} width={1.6} height={6} fill={props.color} />
    </Svg>
  );
}
