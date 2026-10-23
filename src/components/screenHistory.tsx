import { JSX, useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { LegendList } from "@legendapp/list";
import { lb } from "lens-shmens";
import { Text } from "./primitives/text";
import { HistoryRecordView } from "./historyRecord";
import { IHistoryRecord } from "../types";
import { IState, updateState } from "../models/state";
import { History_getHomeAggregates } from "../models/history";
import {
  HistoryCollapse_expand,
  HistoryCollapse_isExpanded,
  HistoryCollapse_toggle,
  IExpandedHistoryIds,
} from "../models/historyCollapse";
import { useNavOptions } from "../navigation/useNavOptions";
import { useTabBarContentPadding } from "../navigation/useTabBarContentPadding";
import { useTrackedDispatch, useTrackedState, untrack } from "../navigation/TrackedStateContext";
import { useTimedMemo } from "../utils/useTimedMemo";
import { usePerfScrollMarkers } from "../utils/usePerfScrollMarkers";

export function ScreenHistory(): JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  const history = untrack(state.storage.history);
  const settings = untrack(state.storage.settings);
  const tabBarPadding = useTabBarContentPadding();
  const { sortedHistoryDesc, prs } = useTimedMemo(
    "screenHistory.aggregates",
    () => History_getHomeAggregates(history, !!settings.startWeekFromMonday),
    [history, settings.startWeekFromMonday]
  );
  const [initialScrollIndex, setInitialScrollIndex] = useState(0);
  const [listRemountKey, setListRemountKey] = useState(0);
  const [expandedIds, setExpandedIds] = useState<IExpandedHistoryIds>({});
  const onToggleExpanded = useCallback((recordId: number) => {
    setExpandedIds((ids) => HistoryCollapse_toggle(ids, recordId));
  }, []);

  const scrollToRecordId = state.scrollToHistoryRecordId;
  useEffect(() => {
    if (scrollToRecordId != null) {
      updateState(dispatch, [lb<IState>().p("scrollToHistoryRecordId").record(undefined)], "Clear scroll target");
      const index = sortedHistoryDesc.findIndex((record) => record.id === scrollToRecordId);
      if (index >= 0) {
        setExpandedIds((ids) => HistoryCollapse_expand(ids, scrollToRecordId));
        setInitialScrollIndex(index);
        setListRemountKey((k) => k + 1);
      }
    }
  }, [scrollToRecordId]);

  useNavOptions({ navTitle: "History" });

  const renderItem = useCallback(
    ({ item }: { item: IHistoryRecord }) => (
      <View key={item.id} className="mx-4 mb-6">
        <HistoryRecordView
          isOngoing={false}
          showTitle={true}
          prs={prs}
          settings={settings}
          historyRecord={item}
          dispatch={dispatch}
          isExpanded={HistoryCollapse_isExpanded(item, expandedIds, false)}
          onToggleExpanded={onToggleExpanded}
        />
      </View>
    ),
    [prs, settings, dispatch, expandedIds, onToggleExpanded]
  );
  const keyExtractor = useCallback((item: IHistoryRecord) => String(item.id), []);
  const scrollMarkers = usePerfScrollMarkers("ScreenHistory");

  if (sortedHistoryDesc.length === 0) {
    return (
      <View className="flex-1 px-4 pt-6" testID="history-empty" data-testid="history-empty">
        <Text className="text-base text-text-secondary">No workouts yet. Tap + to start one.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1" testID="history" data-testid="history">
      <LegendList
        key={listRemountKey}
        data={sortedHistoryDesc}
        renderItem={renderItem}
        extraData={expandedIds}
        keyExtractor={keyExtractor}
        estimatedItemSize={300}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: tabBarPadding }}
        initialScrollIndex={initialScrollIndex}
        waitForInitialLayout={true}
        onScrollBeginDrag={scrollMarkers.onScrollBeginDrag}
        onScrollEndDrag={scrollMarkers.onScrollEndDrag}
        onMomentumScrollEnd={scrollMarkers.onMomentumScrollEnd}
      />
    </View>
  );
}
