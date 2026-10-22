import { JSX, memo, useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { lb } from "lens-shmens";
import { Pressable } from "../primitives/pressable";
import { Text } from "../primitives/text";
import { Button } from "../button";
import { DraggableList2 } from "../draggableList2";
import { IconHandle } from "../icons/iconHandle";
import { IconArrowUp } from "../icons/iconArrowUp";
import { IconArrowDown2 } from "../icons/iconArrowDown2";
import { IDispatch } from "../../ducks/types";
import { IState, updateState } from "../../models/state";
import { IProgram, ISettings } from "../../types";
import { IEvaluatedProgram } from "../../models/program";
import { IPlannerState } from "../../pages/planner/models/types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { CollectionUtils_setBy } from "../../utils/collection";
import { Dialog_alert } from "../../utils/dialog";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { ProgramDayOrder_apply, ProgramDayOrder_hasUnsavedEdits } from "../../models/programDayOrder";
import {
  IProgramPlanCard,
  ProgramPlanCards_build,
  ProgramPlanCards_currentWeekIndex,
} from "../../models/programPlanCards";

interface IProps {
  evaluatedProgram: IEvaluatedProgram;
  savedProgram: IProgram;
  draftProgram: IProgram;
  settings: ISettings;
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerState>;
  onOpenEditor: () => void;
}

export const ProgramPlanView = memo(function ProgramPlanView(props: IProps): JSX.Element {
  const { evaluatedProgram, savedProgram, draftProgram, settings, dispatch, plannerDispatch } = props;
  const weekCount = evaluatedProgram.weeks.length;
  const [weekIndex, setWeekIndex] = useState(() => ProgramPlanCards_currentWeekIndex(evaluatedProgram));
  const safeWeekIndex = Math.min(weekIndex, Math.max(0, weekCount - 1));
  const cards = useMemo(
    () => ProgramPlanCards_build(evaluatedProgram, safeWeekIndex),
    [evaluatedProgram, safeWeekIndex]
  );
  const hasUnsavedEdits = ProgramDayOrder_hasUnsavedEdits(savedProgram, draftProgram);

  const onMove = useCallback(
    (from: number, to: number) => {
      if (from === to) {
        return;
      }
      const result = ProgramDayOrder_apply(savedProgram, draftProgram, from, to, settings);
      if (!result.success) {
        Dialog_alert(result.error);
        return;
      }
      plannerDispatch(
        lb<IPlannerState>().p("current").p("program").record(result.data.draft),
        `Move day ${from + 1} to position ${to + 1}`
      );
      const saved = result.data.saved;
      if (saved != null) {
        updateState(
          dispatch,
          [
            lb<IState>()
              .p("storage")
              .p("programs")
              .recordModify((programs) => CollectionUtils_setBy(programs, "id", saved.id, saved)),
          ],
          `Save day order of '${saved.name}'`
        );
      }
    },
    [savedProgram, draftProgram, settings, plannerDispatch, dispatch]
  );

  return (
    <View className="px-4 pt-3 pb-8" testID="program-plan-view" data-testid="program-plan-view">
      {weekCount > 1 && (
        <View className="mb-2">
          <View className="flex-row flex-wrap gap-2">
            {evaluatedProgram.weeks.map((week, index) => (
              <Pressable
                key={`${week.name}-${index}`}
                testID={`plan-week-${index}`}
                data-testid={`plan-week-${index}`}
                className={`px-3 py-1 rounded-full border ${
                  index === safeWeekIndex ? "border-button-primarybackground" : "border-border-neutral"
                }`}
                onPress={() => setWeekIndex(index)}
              >
                <Text className={`text-sm ${index === safeWeekIndex ? "text-text-purple" : "text-text-secondary"}`}>
                  {week.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text className="mt-2 text-xs text-text-secondary">Moving a day moves it in every week.</Text>
        </View>
      )}
      <Text className="mb-3 text-sm text-text-secondary">
        Hold the dots and drag a day to move it, or use the arrows.
      </Text>
      {hasUnsavedEdits && (
        <Text className="mb-3 text-sm text-text-error">
          You have unsaved changes. Moves stay with them until you tap Save in Edit.
        </Text>
      )}
      <DraggableList2
        items={cards}
        onDragEnd={onMove}
        element={(card, index, handle) => (
          <PlanDayCard
            card={card}
            isFirst={index === 0}
            isLast={index === cards.length - 1}
            handle={handle}
            onMove={onMove}
          />
        )}
      />
      <View className="mt-4">
        <Button
          kind="pill-outline"
          buttonSize="md"
          name="plan-open-editor"
          testID="plan-open-editor"
          data-testid="plan-open-editor"
          onClick={props.onOpenEditor}
        >
          Edit as text
        </Button>
      </View>
    </View>
  );
});

interface IPlanDayCardProps {
  card: IProgramPlanCard;
  isFirst: boolean;
  isLast: boolean;
  handle: (children: React.ReactNode) => JSX.Element;
  onMove: (from: number, to: number) => void;
}

function PlanDayCard(props: IPlanDayCardProps): JSX.Element {
  const { card } = props;
  const disabledColor = Tailwind_semantic().icon.neutralsubtle;
  return (
    <View
      className="mb-3 border rounded-2xl bg-background-default border-border-neutral"
      testID={`plan-day-${card.dayIndex}`}
      data-testid={`plan-day-${card.dayIndex}`}
    >
      <View className="flex-row items-center pr-1">
        {props.handle(
          <View className="py-3 pl-2 pr-1">
            <IconHandle />
          </View>
        )}
        <View className="flex-row items-center flex-1 gap-2">
          <Text className="text-base font-bold">{card.name}</Text>
          {card.isNext && (
            <View className="px-2 rounded-full bg-background-purpledark">
              <Text className="text-xs text-text-link">Next</Text>
            </View>
          )}
        </View>
        <Pressable
          className="p-3"
          testID={`plan-day-up-${card.dayIndex}`}
          data-testid={`plan-day-up-${card.dayIndex}`}
          disabled={props.isFirst}
          onPress={() => props.onMove(card.dayIndex, card.dayIndex - 1)}
        >
          <IconArrowUp color={props.isFirst ? disabledColor : undefined} />
        </Pressable>
        <Pressable
          className="p-3"
          testID={`plan-day-down-${card.dayIndex}`}
          data-testid={`plan-day-down-${card.dayIndex}`}
          disabled={props.isLast}
          onPress={() => props.onMove(card.dayIndex, card.dayIndex + 1)}
        >
          <IconArrowDown2 color={props.isLast ? disabledColor : undefined} />
        </Pressable>
      </View>
      <View className="px-4 pb-3">
        {card.lines.length === 0 ? (
          <Text className="text-sm text-text-secondary">Rest day</Text>
        ) : (
          card.lines.map((line, index) => (
            <Text key={index} className="text-sm">
              {line}
            </Text>
          ))
        )}
      </View>
    </View>
  );
}
