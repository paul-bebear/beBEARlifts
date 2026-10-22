import { JSX, useState } from "react";
import { Pressable, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Text } from "./primitives/text";
import { FoodPrimaryButton, FoodTextInput } from "./foodUi";
import { SheetScreenContainer } from "../navigation/SheetScreenContainer";
import { FormSheet } from "../navigation/FormSheet";
import { INote, Notes_get, Notes_links, Notes_new, Notes_remove, Notes_save } from "../models/notes";
import { JournalExport_dateTitle } from "../models/journalExport";
import { NotesStore, NotesStore_newId } from "../utils/notesStore";
import { Dialog_confirm } from "../utils/dialog";
import { useJournalDay } from "./screenJournal";
import type { IRootStackParamList } from "../navigation/types";

type INoteEditorParams = IRootStackParamList["noteEditorModal"];

function Chips(props: { chips: string[] }): JSX.Element | null {
  if (props.chips.length === 0) {
    return null;
  }
  return (
    <View className="flex-row flex-wrap pt-3" style={{ gap: 6 }} testID="note-chips" data-testid="note-chips">
      {props.chips.map((chip) => (
        <View key={chip} className="px-3 py-1 rounded-full bg-background-subtle">
          <Text className="text-sm text-text-secondary">{chip}</Text>
        </View>
      ))}
    </View>
  );
}

export function NoteEditorModal(): JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<{ key: string; name: "noteEditorModal"; params: INoteEditorParams }>();
  const { day, noteId } = route.params;
  const [note, setNote] = useState<INote>(
    () =>
      (noteId != null ? Notes_get(NotesStore.get(), noteId) : undefined) ??
      Notes_new(NotesStore_newId(), day, Date.now())
  );
  const isStored = NotesStore.use().notes.some((n) => n.id === note.id);
  const journal = useJournalDay(day);
  const links = Notes_links(note.body);

  const change = (patch: Partial<Pick<INote, "title" | "body">>): void => {
    const next = { ...note, ...patch };
    setNote(next);
    NotesStore.update((log) => Notes_save(log, next, Date.now()));
  };
  const close = (): void => navigation.goBack();
  const remove = async (): Promise<void> => {
    if (await Dialog_confirm("Delete this note?")) {
      await NotesStore.update((log) => Notes_remove(log, note.id));
      close();
    }
  };

  return (
    <SheetScreenContainer onClose={close} shouldShowClose={true}>
      <FormSheet>
        <View testID="note-editor" data-testid="note-editor">
          <Text className="text-sm text-text-secondary">{JournalExport_dateTitle(day)}</Text>
          <Chips chips={journal.chips} />
          <FoodTextInput
            testID="note-title"
            className="mt-4 font-bold"
            style={{ fontSize: 20 }}
            placeholder="Title"
            value={note.title}
            onChangeText={(title) => change({ title })}
            autoFocus={noteId == null}
          />
          <FoodTextInput
            testID="note-body"
            className="mt-3"
            style={{ minHeight: 220, textAlignVertical: "top" }}
            placeholder="Write anything. Link another note with [[its title]]."
            multiline={true}
            value={note.body}
            onChangeText={(body) => change({ body })}
          />
          {links.length > 0 && (
            <Text className="pt-2 text-sm text-text-secondary" testID="note-links">
              Links: {links.join(", ")}
            </Text>
          )}
          <Text className="pt-2 text-xs text-text-secondary">Saved as you type. Only you can see your notes.</Text>
          <View className="pt-4">
            <FoodPrimaryButton testID="note-done" title="Done" onPress={close} />
          </View>
          {isStored && (
            <Pressable testID="note-delete" data-testid="note-delete" onPress={remove} className="items-center py-4">
              <Text className="text-base text-text-error">Delete note</Text>
            </Pressable>
          )}
        </View>
      </FormSheet>
    </SheetScreenContainer>
  );
}
