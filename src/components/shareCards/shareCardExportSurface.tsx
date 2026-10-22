import { JSX, ReactNode } from "react";
import { View } from "react-native";
import { ShareCardTheme as T } from "./shareCardTheme";

interface IProps {
  pages: string[];
  renderPage: (page: string) => ReactNode;
  setRef: (page: string, view: unknown) => void;
  onLayout: (page: string) => void;
}

// Full-size and untransformed, off screen: captureRef and html-to-image keep transforms inside the captured view.
export function ShareCardExportSurface(props: IProps): JSX.Element | null {
  if (props.pages.length === 0) {
    return null;
  }
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: -T.width * 3 }}>
      {props.pages.map((page) => (
        <View
          key={page}
          collapsable={false}
          ref={(view) => props.setRef(page, view)}
          onLayout={() => props.onLayout(page)}
          style={{ width: T.width, height: T.height }}
        >
          {props.renderPage(page)}
        </View>
      ))}
    </View>
  );
}
