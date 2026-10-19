import type { JSX } from "react";
import { Path } from "../primitives/svg";
import { IconSvg } from "./iconSvg";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
  isSelected?: boolean;
}

const applePath =
  "M10 6.2C8.6 5 6.6 4.8 5 5.6C2.6 6.8 1.8 9.8 2.6 12.6C3.4 15.6 5.6 18.6 7.6 18.6C8.6 18.6 9 18 10 18C11 18 11.4 18.6 12.4 18.6C14.4 18.6 16.6 15.6 17.4 12.6C18.2 9.8 17.4 6.8 15 5.6C13.4 4.8 11.4 5 10 6.2Z";
const stemPath = "M10 6.2C10 4.4 10.6 2.6 12.4 1.4";

export function IconFood(props: IProps): JSX.Element {
  const size = props.size ?? 24;
  const semantic = Tailwind_semantic();
  const color = props.color ?? (props.isSelected ? semantic.icon.purple : semantic.icon.neutral);
  return (
    <IconSvg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d={applePath}
        fill={props.isSelected ? color : "none"}
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <Path d={stemPath} stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </IconSvg>
  );
}
