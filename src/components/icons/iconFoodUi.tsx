import type { JSX } from "react";
import { Path } from "../primitives/svg";
import { IconSvg } from "./iconSvg";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IProps {
  size?: number;
  color?: string;
}

function strokeIcon(d: string, props: IProps, strokeWidth: number = 2): JSX.Element {
  const size = props.size ?? 20;
  const color = props.color ?? Tailwind_semantic().icon.neutral;
  return (
    <IconSvg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d={d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </IconSvg>
  );
}

export function IconChevronLeft(props: IProps): JSX.Element {
  return strokeIcon("M12.5 4L6.5 10L12.5 16", props);
}

export function IconChevronRight(props: IProps): JSX.Element {
  return strokeIcon("M7.5 4L13.5 10L7.5 16", props);
}

export function IconChevronDown(props: IProps): JSX.Element {
  return strokeIcon("M5 7.5L10 12.5L15 7.5", props);
}

export function IconPlusThin(props: IProps): JSX.Element {
  return strokeIcon("M10 3.5V16.5M3.5 10H16.5", props);
}

export function IconCopyDay(props: IProps): JSX.Element {
  return strokeIcon(
    "M7 7V3.8C7 3.36 7.36 3 7.8 3H16.2C16.64 3 17 3.36 17 3.8V12.2C17 12.64 16.64 13 16.2 13H13M3.8 7H12.2C12.64 7 13 7.36 13 7.8V16.2C13 16.64 12.64 17 12.2 17H3.8C3.36 17 3 16.64 3 16.2V7.8C3 7.36 3.36 7 3.8 7Z",
    props,
    1.6
  );
}

export function IconBarcode(props: IProps): JSX.Element {
  return strokeIcon(
    "M2 5V3.5C2 2.67 2.67 2 3.5 2H5M15 2H16.5C17.33 2 18 2.67 18 3.5V5M18 15V16.5C18 17.33 17.33 18 16.5 18H15M5 18H3.5C2.67 18 2 17.33 2 16.5V15M5.5 6V14M8 6V14M10.5 6V14M12.5 6V14M14.5 6V14",
    props,
    1.6
  );
}
