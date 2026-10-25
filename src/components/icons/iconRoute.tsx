import type { JSX } from "react";
import { Circle, Path } from "../primitives/svg";
import { IconSvg } from "./iconSvg";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
}

export function IconRoute(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind_semantic().icon.neutral;
  return (
    <IconSvg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="5" cy="19" r="2.5" stroke={color} strokeWidth="2" />
      <Circle cx="19" cy="5" r="2.5" stroke={color} strokeWidth="2" />
      <Path
        d="M7.5 19H15.5C17.433 19 19 17.433 19 15.5C19 13.567 17.433 12 15.5 12H8.5C6.567 12 5 10.433 5 8.5C5 6.567 6.567 5 8.5 5H16.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </IconSvg>
  );
}
