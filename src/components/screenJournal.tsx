import { JSX, ReactNode, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { JournalMeals } from "./journalMeals";
import { JournalCheckIn, JournalMindfulness } from "./journalMindfulness";
import { ProgressCalendarHeader } from "./progressCalendarHeader";
import { BearMark } from "./shareCards/bearMark";
import { ShareCardTheme as T } from "./shareCards/shareCardTheme";
import { IconPlus2 } from "./icons/iconPlus2";
import { useNavOptions } from "../navigation/useNavOptions";
import { NavScreenContent } from "../navigation/NavScreenContent";
import { navigateToModal } from "../navigation/navigationService";
import { useTrackedDispatch, useTrackedState } from "../navigation/TrackedStateContext";
import { Thunk_editHistoryRecord, Thunk_pushScreen } from "../ducks/thunks";
import { FoodLog_dayKey } from "../models/foodLog";
import { History_getPersonalRecords } from "../models/history";
import { IJournalDay, IJournalSection, JournalDay_build, JournalDay_sectionFold } from "../models/journalDay";
import { IJournalExportSources } from "../models/journalExport";
import { JournalExportSheet } from "./journalExportSheet";
import { Notes_canEditCheckIn, Notes_firstLine, Notes_preview } from "../models/notes";
import { DailyChecklist_doneDays, DailyChecklist_streak } from "../models/dailyChecklist";
import {
  MonthCalendar_build,
  MonthCalendar_monthOf,
  MonthCalendar_shift,
  MonthCalendar_workoutDays,
} from "../models/monthCalendar";
import { useFoodLog } from "../utils/foodLogStore";
import { useMusicLog } from "../utils/musicStore";
import { NotesStore } from "../utils/notesStore";
import { useBear } from "../utils/useBear";

function useJournalSources(): IJournalExportSources {
  const state = useTrackedState();
  const { history, settings, stats } = state.storage;
  const food = useFoodLog();
  const music = useMusicLog();
  const notes = NotesStore.use();
  const prs = useMemo(() => History_getPersonalRecords(history), [history]);
  return {
    today: FoodLog_dayKey(new Date()),
    history,
    settings,
    prs,
    food,
    music,
    weights: stats.weight.weight ?? [],
    notes,
  };
}

export function useJournalDay(day: string): IJournalDay {
  const sources = useJournalSources();
  return JournalDay_build({ ...sources, day });
}

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

function FoldableSection(props: { journal: IJournalDay; section: IJournalSection; children: ReactNode }): JSX.Element {
  const [isOpenByUser, setIsOpenByUser] = useState<boolean>();
  const fold = JournalDay_sectionFold(props.journal, props.section, isOpenByUser);
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

function WorkoutSection(props: { journal: IJournalDay }): JSX.Element {
  const dispatch = useTrackedDispatch();
  const history = useTrackedState().storage.history;
  const { workouts, workoutEmptyLine } = props.journal;
  const open = (id: number): void => {
    const record = history.find((r) => r.id === id);
    if (record != null) {
      dispatch(Thunk_editHistoryRecord(record));
    }
  };
  const allWorkouts = (
    <Pressable
      testID="journal-all-workouts"
      data-testid="journal-all-workouts"
      accessibilityRole="link"
      onPress={() => dispatch(Thunk_pushScreen("history", undefined, { tab: "food" }))}
    >
      <Text className="text-sm text-text-link">All workouts</Text>
    </Pressable>
  );
  return (
    <Section title="Workout" testID="journal-workout" action={allWorkouts}>
      {workouts.map((w) => (
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
      {workoutEmptyLine != null && <Text className="text-base text-text-secondary">{workoutEmptyLine}</Text>}
    </Section>
  );
}

function NotesSection(props: { journal: IJournalDay }): JSX.Element {
  const { day, notes } = props.journal;
  const add = (
    <Pressable
      testID="journal-note-add"
      data-testid="journal-note-add"
      accessibilityRole="button"
      accessibilityLabel="Add a note"
      onPress={() => navigateToModal("noteEditorModal", { day })}
      className="items-center justify-center rounded-full"
      style={{ width: 36, height: 36, backgroundColor: T.honey }}
    >
      <IconPlus2 size={16} color={T.greenDark} />
    </Pressable>
  );
  return (
    <Section title="Notes" testID="journal-notes" action={add}>
      {notes.length === 0 && <Text className="text-base text-text-secondary">No notes yet. Tap + to write one.</Text>}
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
  const [showsExport, setShowsExport] = useState(false);
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
        <View className="flex-row items-center px-4 pt-2" style={{ gap: 10 }} testID="journal-day-header">
          <View
            className="items-center justify-center rounded-full"
            style={{ width: 44, height: 44, backgroundColor: T.honey }}
          >
            <BearMark size={30} color={T.greenDark} faceColor={T.honey} />
          </View>
          <Text className="flex-1 text-2xl font-bold" testID="journal-day-title" data-testid="journal-day-title">
            {journal.title}
          </Text>
        </View>
        <JournalMindfulness line={journal.mindfulness} />
        <FoldableSection key={`${day}-checkIn`} journal={journal} section="checkIn">
          <JournalCheckIn key={day} day={day} checkIn={journal.checkIn} isEditable={Notes_canEditCheckIn(day, today)} />
        </FoldableSection>
        <FoldableSection key={`${day}-workouts`} journal={journal} section="workouts">
          <WorkoutSection journal={journal} />
        </FoldableSection>
        <FoldableSection key={`${day}-meals`} journal={journal} section="meals">
          <Section title="Meals" testID="journal-meals-section">
            <View className="-mx-4">
              <JournalMeals day={day} canAdd={journal.canAddFood} emptyLine={journal.mealsEmptyLine} />
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
        <FoldableSection key={`${day}-weight`} journal={journal} section="weight">
          <Section title="Weigh-in" testID="journal-weight">
            {journal.weight != null ? (
              <Text className="text-2xl font-bold">
                {journal.weight.value} {journal.weight.unit}
              </Text>
            ) : (
              <Button
                name="journal-log-weight"
                kind="pill-outline"
                className="flex-1"
                onPress={() => dispatch(Thunk_pushScreen("stats", undefined, { tab: "graphs" }))}
              >
                Log weight
              </Button>
            )}
          </Section>
        </FoldableSection>
        <FoldableSection key={`${day}-notes`} journal={journal} section="notes">
          <NotesSection journal={journal} />
        </FoldableSection>
        <View className="px-4 pt-8 pb-10" style={{ gap: 8 }} testID="journal-export">
          <Button name="journal-export" kind="pill-outline" className="flex-1" onPress={() => setShowsExport(true)}>
            Export
          </Button>
        </View>
        {showsExport && <JournalExportSheet sources={sources} onClose={() => setShowsExport(false)} />}
      </View>
    </NavScreenContent>
  );
}
