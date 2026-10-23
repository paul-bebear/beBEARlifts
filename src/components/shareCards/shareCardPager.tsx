import { JSX, ReactNode, useEffect, useRef } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "../primitives/text";
import { ShareCardTheme as T } from "./shareCardTheme";

interface IProps {
  pages: readonly string[];
  page: string;
  label: (page: string) => string;
  onPageChange: (page: string) => void;
  renderPage: (page: string) => ReactNode;
}

const gap = 12;

export function ShareCardPager(props: IProps): JSX.Element {
  const { width } = useWindowDimensions();
  const scale = Math.min(0.8, (width - 64) / T.width);
  const cellWidth = T.width * scale;
  const cellHeight = T.height * scale;
  const scrollRef = useRef<ScrollView>(null);
  const pageIndex = props.pages.indexOf(props.page);
  useEffect(() => {
    scrollRef.current?.scrollTo({ x: pageIndex * (cellWidth + gap), animated: true });
  }, [pageIndex, cellWidth]);
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const index = Math.round(e.nativeEvent.contentOffset.x / (cellWidth + gap));
    const page = props.pages[Math.max(0, Math.min(props.pages.length - 1, index))];
    if (page !== props.page) {
      props.onPageChange(page);
    }
  };
  return (
    <View>
      <View className="flex-row justify-center mb-3" style={{ gap: 6, flexWrap: "wrap" }}>
        {props.pages.map((page) => (
          <Pressable
            key={page}
            testID={`share-card-tab-${page}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: page === props.page }}
            onPress={() => props.onPageChange(page)}
            className={`px-3 py-1 rounded-full ${page === props.page ? "bg-button-primarybackground" : "bg-background-subtle"}`}
          >
            <Text className={`text-sm ${page === props.page ? "text-text-alwayswhite" : ""}`}>{props.label(page)}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        snapToInterval={cellWidth + gap}
        decelerationRate="fast"
        onMomentumScrollEnd={onScrollEnd}
        contentContainerStyle={{ paddingHorizontal: (width - cellWidth) / 2 - 16, gap }}
      >
        {props.pages.map((page) => (
          <View key={page} style={{ width: cellWidth, height: cellHeight, overflow: "hidden", borderRadius: 12 }}>
            <View
              style={{
                width: T.width,
                height: T.height,
                transform: [
                  { translateX: -(T.width * (1 - scale)) / 2 },
                  { translateY: -(T.height * (1 - scale)) / 2 },
                  { scale },
                ],
              }}
            >
              {props.renderPage(page)}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
