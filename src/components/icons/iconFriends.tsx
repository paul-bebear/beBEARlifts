import type { JSX } from "react";
import { Circle, Path } from "../primitives/svg";
import { IconSvg } from "./iconSvg";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  isSelected?: boolean;
}

export function IconFriends(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const color = props.color ?? Tailwind_semantic().icon.neutral;
  const fill = props.isSelected ? color : "none";
  return (
    <IconSvg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}>
      <Circle cx="9" cy="8" r="3.5" strokeWidth="1.5" fill={fill} />
      <Path
        d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={fill}
      />
      <Path
        d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4M18 14.4c2 .7 3.5 2.4 3.5 5.6"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconSvg>
  );
}
