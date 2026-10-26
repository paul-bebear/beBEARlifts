import { JSX } from "react";
import { Platform } from "react-native";
import { ActionMenu } from "./actionMenu";
import { IPhotoSource, PhotoSourceChoice_for } from "../models/photoSourceChoice";

interface IProps {
  title: string;
  testIDPrefix: string;
  onPick: (source: IPhotoSource) => void;
  renderTrigger: (open: () => void) => JSX.Element;
}

export function PhotoSourceMenu(props: IProps): JSX.Element {
  const choice = PhotoSourceChoice_for(Platform.OS);
  if (choice.kind === "direct") {
    return props.renderTrigger(() => props.onPick(choice.source));
  }
  return (
    <ActionMenu
      title={props.title}
      actions={choice.options.map((option) => ({
        label: option.label,
        onPress: () => props.onPick(option.source),
        testID: `${props.testIDPrefix}-${option.source === "camera" ? "camera" : "library"}`,
      }))}
      renderTrigger={props.renderTrigger}
    />
  );
}
