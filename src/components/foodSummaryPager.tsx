import { JSX, useRef, useState } from "react";
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, View } from "react-native";
import { FoodSummaryCard } from "./foodSummaryCard";
import { FoodMicrosCard } from "./foodMicrosCard";
import { IFoodGoals, IFoodProgressMode, INutrients } from "../models/foodLog";
import { IMicroTotals } from "../models/foodMicroTotals";
import {
  FoodSummaryPages_indexAt,
  FoodSummaryPages_labels,
  FoodSummaryPages_offsetOf,
} from "../models/foodSummaryPages";

interface IProps {
  totals: INutrients;
  goals: IFoodGoals;
  micros: IMicroTotals;
  mode: IFoodProgressMode;
  onModeChange: (mode: IFoodProgressMode) => void;
}

export function FoodSummaryPager(props: IProps): JSX.Element {
  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);

  const onLayout = (event: LayoutChangeEvent): void => setWidth(event.nativeEvent.layout.width);
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void =>
    setPage(FoodSummaryPages_indexAt(event.nativeEvent.contentOffset.x, width));
  const goTo = (index: number): void => {
    setPage(index);
    scrollRef.current?.scrollTo({ x: FoodSummaryPages_offsetOf(index, width), animated: true });
  };

  return (
    <View onLayout={onLayout} testID="food-summary-pager" data-testid="food-summary-pager">
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        nestedScrollEnabled={true}
      >
        <View style={{ width }}>
          <FoodSummaryCard
            totals={props.totals}
            goals={props.goals}
            mode={props.mode}
            onModeChange={props.onModeChange}
            isOpenAtStart
          />
        </View>
        <View className="px-4 pt-3" style={{ width }}>
          <FoodMicrosCard totals={props.micros} />
        </View>
      </ScrollView>
      <View className="flex-row justify-center pt-3">
        {FoodSummaryPages_labels.map((label, index) => (
          <Pressable
            key={label}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`${label} page`}
            accessibilityState={{ selected: page === index }}
            testID={`food-summary-dot-${index}`}
            data-testid={`food-summary-dot-${index}`}
            onPress={() => goTo(index)}
            className={`mx-1.5 rounded-full ${page === index ? "bg-text-link" : "bg-background-neutral"}`}
            style={{ width: 8, height: 8 }}
          />
        ))}
      </View>
    </View>
  );
}
