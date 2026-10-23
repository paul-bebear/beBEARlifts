import { JSX, ReactNode, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { JournalMeals } from "./journalMeals";
import { JournalCheckIn } from "./journalCheckIn";
import { ProgressCalendarHeader } from "./progressCalendarHeader";
import { ShareCardTheme as T } from "./shareCards/shareCardTheme";
import { IconPlus2 } from "./icons/iconPlus2";
import { useNavOptions } from "../navigation/useNavOptions";
import { NavScreenContent } from "../navigation/NavScreenContent";
import { navigateToModal } from "../navigation/navigationService";
import { useTrackedDispatch, useTrackedState } from "../navigation/TrackedStateContext";
import { Thunk_editHistoryRecord, Thunk_pushScreen } from "../ducks/thunks";
import { IJournalDay, IJournalSection, JournalDay_build, JournalDay_sectionFold } from "../models/journalDay";
import { Notes_firstLine, Notes_preview } from "../models/notes";
import { FoodMealForTime_pick } from "../models/foodMealForTime";
import { DailyChecklist_doneDays, DailyChecklist_streak } from "../models/dailyChecklist";
import {
  MonthCalendar_build,
  MonthCalendar_monthOf,
  MonthCalendar_shift,
  MonthCalendar_workoutDays,
} from "../models/monthCalendar";
import { useBear } from "../utils/useBear";
import { useJournalSources } from "../utils/useJournalSources";

function Section(props: { title: string; testID: string; action?: ReactNode; children: ReactNode }): JSX.Element {
  return (
    <View className="px-4 pt-6" testID={props.testID} data-testid={props.testID}>
      <View className="flex-row items-center pb-2">
        <Text className="flex-1 text-xl font-bold">{props.title}</Text>
        {props.action}
      </View>
      {props.children}
    </View>
  );
}

function LinkText(props: { testID: string; text: string; onPress: () => void }): JSX.Element {
  return (
    <Pressable testID={props.testID} data-testid={props.testID} accessibilityRole="button" onPress={props.onPress}>
      <Text className="text-sm text-text-link">{props.text}</Text>
    </Pressable>
  );
}

function AddButton(props: { testID: string; label: string; onPress: () => void }): JSX.Element {
  return (
    <Pressable
      testID={props.testID}
      data-testid={props.testID}
      accessibilityRole="button"
      accessibilityLabel={props.label}
      onPress={props.onPress}
      className="items-center justify-center rounded-full"
      style={{ width: 36, height: 36, backgroundColor: T.honey }}
    >
      <IconPlus2 size={16} color={T.greenDark} />
    </Pressable>
  );
}

function FoldableSection(props: {
  journal: IJournalDay;
  section: IJournalSection;
  emptyAction?: ReactNode;
  children: ReactNode;
}): JSX.Element {
  const [isOpenByUser, setIsOpenByUser] = useState<boolean>();
  const fold = JournalDay_sectionFold(props.journal, props.section, isOpenByUser);
  if (fold.empty != null) {
    const canOpen = props.section === "checkIn";
    return (
      <Pressable
        disabled={!canOpen}
        onPress={() => setIsOpenByUser(true)}
        className="flex-row items-center px-4 pt-6"
        testID={`journal-${props.section}-empty`}
        data-testid={`journal-${props.section}-empty`}
      >
        <Text className="text-xl font-bold">{fold.empty.title}</Text>
        <Text className="flex-1 ml-3 text-base text-text-secondary" numberOfLines={1}>
          {fold.empty.hint}
        </Text>
        {props.emptyAction}
      </Pressable>
    );
  }
  if (fold.isCollapsed) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: false }}
        onPress={() => setIsOpenByUser(true)}
        className="flex-row items-center px-4 pt-6"
        testID={`journal-${props.section}-summary`}
        data-testid={`journal-${props.section}-summary`}
      >
        <Text className="flex-1 text-base font-semibold">{fold.summary}</Text>
        <Text className="text-sm text-text-link">Show</Text>
      </Pressable>
    );
  }
  return (
    <>
      {props.children}
      {fold.canHide && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: true }}
          onPress={() => setIsOpenByUser(false)}
          className="items-end px-4 pt-2"
          testID={`journal-${props.section}-hide`}
          data-testid={`journal-${props.section}-hide`}
        >
          <Text className="text-sm text-text-link">Hide</Text>
        </Pressable>
      )}
    </>
  );
}

function Card(props: { children: ReactNode; onPress?: () => void; testID?: string }): JSX.Element {
  return (
    <Pressable
      testID={props.testID}
      data-testid={props.testID}
      disabled={props.onPress == null}
      onPress={props.onPress}
      className="p-4 mb-2 border rounded-2xl border-border-neutral bg-background-default"
    >
      {props.children}
    </Pressable>
  );
}

function WorkoutSection(props: { journal: IJournalDay; allWorkouts: ReactNode }): JSX.Element {
  const dispatch = useTrackedDispatch();
  const history = useTrackedState().storage.history;
  const open = (id: number): void => {
    const record = history.find((r) => r.id === id);
    if (record != null) {
      dispatch(Thunk_editHistoryRecord(record));
    }
  };
  return (
    <Section title="Workout" testID="journal-workout" action={props.allWorkouts}>
      {props.journal.workouts.map((w) => (
        <Card key={w.id} testID="journal-workout-card" onPress={() => open(w.id)}>
          <Text className="text-lg font-bold">{w.dayName}</Text>
          <Text className="text-base text-text-secondary">{w.statsLine}</Text>
          {w.prs.map((pr) => (
            <Text key={pr} className="pt-1 text-sm">
              🏆 {pr}
            </Text>
          ))}
        </Card>
      ))}
    </Section>
  );
}

function NotesSection(props: { journal: IJournalDay; add: ReactNode }): JSX.Element {
  const { day, notes } = props.journal;
  return (
    <Section title="Notes" testID="journal-notes" action={props.add}>
      {notes.map((note) => (
        <Card
          key={note.id}
          testID="journal-note"
          onPress={() => navigateToModal("noteEditorModal", { day, noteId: note.id })}
        >
          <Text className="text-base font-bold">{Notes_firstLine(note)}</Text>
          {Notes_preview(note) !== "" && (
            <Text className="text-sm text-text-secondary" numberOfLines={2}>
              {Notes_preview(note)}
            </Text>
          )}
        </Card>
      ))}
    </Section>
  );
}

export function ScreenJournal(): JSX.Element {
  const dispatch = useTrackedDispatch();
  const sources = useJournalSources();
  const { today, history, food } = sources;
  const { state: bear } = useBear();
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(() => MonthCalendar_monthOf(today));
  const [isCollapsed, setIsCollapsed] = useState(true);
  const journal = JournalDay_build({ ...sources, day });
  const streak = useMemo(
    () => DailyChecklist_streak(DailyChecklist_doneDays({ foodLog: food, workouts: bear.workouts }), today),
    [food, bear.workouts, today]
  );
  const startsMonday = !!sources.settings.startWeekFromMonday;
  const calendar = useMemo(
    () =>
      MonthCalendar_build({
        month,
        today,
        selected: day,
        workoutDays: MonthCalendar_workoutDays(history),
        startsMonday,
      }),
    [month, today, day, history, startsMonday]
  );
  const selectDay = (next: string): void => {
    setDay(next);
    setMonth(MonthCalendar_monthOf(next));
  };

  useNavOptions({ navTitle: "Journal" });

  const allWorkouts = (
    <LinkText testID="journal-all-workouts" text="All workouts" onPress={() => dispatch(Thunk_pushScreen("history"))} />
  );
  const addNote = (
    <AddButton
      testID="journal-note-add"
      label="Add a note"
      onPress={() => navigateToModal("noteEditorModal", { day })}
    />
  );
  const addFood = journal.canAddFood ? (
    <LinkText
      testID="journal-meals-add"
      text="Add"
      onPress={() => dispatch(Thunk_pushScreen("foodAdd", { day, meal: FoodMealForTime_pick(new Date()) }))}
    />
  ) : undefined;
  const logWeight = (
    <LinkText
      testID="journal-log-weight"
      text="Log"
      onPress={() => dispatch(Thunk_pushScreen("stats", undefined, { tab: "graphs" }))}
    />
  );
  const checkIn = <Text className="text-sm text-text-link">Check in</Text>;

  return (
    <NavScreenContent>
      <View testID="journal" data-testid="journal">
        <ProgressCalendarHeader
          streak={streak}
          calendar={calendar}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          onShiftMonth={(delta) => setMonth(MonthCalendar_shift(month, delta))}
          onSelectDay={selectDay}
          onStreakPress={() => dispatch(Thunk_pushScreen("streak", undefined, { tab: "graphs" }))}
        />
        <Text className="px-4 pt-2 text-2xl font-bold" testID="journal-day-title" data-testid="journal-day-title">
          {journal.title}
        </Text>
        <FoldableSection key={`${day}-checkIn`} journal={journal} section="checkIn" emptyAction={checkIn}>
          <JournalCheckIn key={day} day={day} checkIn={journal.checkIn} isEditable={journal.canEditCheckIn} />
        </FoldableSection>
        <FoldableSection key={`${day}-workouts`} journal={journal} section="workouts" emptyAction={allWorkouts}>
          <WorkoutSection journal={journal} allWorkouts={allWorkouts} />
        </FoldableSection>
        <FoldableSection key={`${day}-meals`} journal={journal} section="meals" emptyAction={addFood}>
          <Section title="Meals" testID="journal-meals-section">
            <View className="-mx-4">
              <JournalMeals day={day} canAdd={journal.canAddFood} />
            </View>
          </Section>
        </FoldableSection>
        {journal.songs.length > 0 && (
          <FoldableSection key={`${day}-songs`} journal={journal} section="songs">
            <Section title="Songs" testID="journal-songs">
              {journal.songs.map((s) => (
                <Text key={s.id} className="py-1 text-base">
                  🎵 {s.name}
                  {s.artists !== "" && <Text className="text-text-secondary"> · {s.artists}</Text>}
                </Text>
              ))}
            </Section>
          </FoldableSection>
        )}
        <FoldableSection key={`${day}-weight`} journal={journal} section="weight" emptyAction={logWeight}>
          <Section title="Weigh-in" testID="journal-weight">
            {journal.weight != null && (
              <Text className="text-2xl font-bold">
                {journal.weight.value} {journal.weight.unit}
              </Text>
            )}
          </Section>
        </FoldableSection>
        <FoldableSection key={`${day}-notes`} journal={journal} section="notes" emptyAction={addNote}>
          <NotesSection journal={journal} add={addNote} />
        </FoldableSection>
        <View className="h-10" />
      </View>
    </NavScreenContent>
  );
}
