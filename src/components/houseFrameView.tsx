import { JSX, ReactNode, useState } from "react";
import { LayoutChangeEvent, StatusBar, View } from "react-native";
import { HouseFrame_fit, HouseFrame_statusBarStyle, IHouseFrameBox } from "../models/houseFrame";
import { useIsShownUnderSheets } from "../navigation/useIsShownUnderSheets";

// Fills its parent with the wall colour and places the tall art in it. The children draw at the art's width.
// The status bar sits over the ceiling while the house is in sight, sheets on top included.
export function HouseFrameView(props: {
  testID: string;
  wall: string;
  children: (artWidth: number) => ReactNode;
}): JSX.Element {
  const [box, setBox] = useState<IHouseFrameBox | undefined>(undefined);
  const onLayout = (e: LayoutChangeEvent): void => {
    const { width, height } = e.nativeEvent.layout;
    setBox({ width, height });
  };
  const isShown = useIsShownUnderSheets();
  const fit = box != null && box.width > 0 && box.height > 0 ? HouseFrame_fit(box) : undefined;
  return (
    <View style={{ flex: 1, overflow: "hidden", backgroundColor: props.wall }} onLayout={onLayout}>
      {isShown && <StatusBar barStyle={HouseFrame_statusBarStyle(props.wall)} animated={true} />}
      {fit != null && (
        <View
          testID={props.testID}
          data-testid={props.testID}
          style={{ position: "absolute", left: fit.left, top: fit.top, width: fit.width, height: fit.height }}
        >
          {props.children(fit.width)}
        </View>
      )}
    </View>
  );
}
