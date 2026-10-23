import { JSX, useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { FoodTextInput } from "./foodUi";
import { ShareCardTheme as T } from "./shareCards/shareCardTheme";
import {
  ICheckInField,
  ICheckInScore,
  INote,
  Notes_checkInScales,
  Notes_faces,
  Notes_updateCheckIn,
} from "../models/notes";
import { NotesStore, NotesStore_newId } from "../utils/notesStore";

function FaceRow(props: {
  field: ICheckInField;
  question: string;
  value?: ICheckInScore;
  isEditable: boolean;
  onPick: (value: ICheckInScore) => void;
}): JSX.Element {
  return (
    <View className="pt-3">
      <Text className="pb-1 text-sm text-text-secondary">{props.question}</Text>
      <View className="flex-row justify-between">
        {Notes_faces.map((face, i) => {
          const value = (i + 1) as ICheckInScore;
          const isPicked = props.value === value;
          return (
            <Pressable
              key={face}
              testID={`checkin-${props.field}-${value}`}
              data-testid={`checkin-${props.field}-${value}`}
              accessibilityRole="button"
              accessibilityLabel={`${props.question} ${value} of 5`}
              accessibilityState={{ selected: isPicked, disabled: !props.isEditable }}
              disabled={!props.isEditable}
              onPress={() => props.onPick(value)}
              className="items-center justify-center rounded-full"
              style={{
                width: 48,
                height: 48,
                backgroundColor: isPicked ? T.honey : "transparent",
                opacity: props.value == null || isPicked ? 1 : 0.45,
              }}
            >
              <Text style={{ fontSize: 26 }}>{face}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function JournalCheckIn(props: { day: string; checkIn?: INote; isEditable: boolean }): JSX.Element | null {
  const { day, checkIn, isEditable } = props;
  const stored = checkIn?.body ?? "";
  // The store writes lag behind typing, so after the first key the field shows the draft, never the store.
  const [draft, setDraft] = useState<string>();

  if (!isEditable && checkIn == null) {
    return null;
  }
  const pick = (field: ICheckInField, value: ICheckInScore): void => {
    NotesStore.update((log) =>
      Notes_updateCheckIn(log, { day, newId: NotesStore_newId(), now: Date.now(), field, value })
    );
  };
  const reflect = (text: string): void => {
    setDraft(text);
    NotesStore.update((log) =>
      Notes_updateCheckIn(log, { day, newId: NotesStore_newId(), now: Date.now(), reflection: text })
    );
  };

  return (
    <View className="px-4 pt-3" style={{ gap: 12 }} testID="journal-checkin" data-testid="journal-checkin">
      <View className="p-4 border rounded-2xl border-border-neutral bg-background-default">
        <Text className="text-lg font-bold">How are you today?</Text>
        {Notes_checkInScales.map((scale) => (
          <FaceRow
            key={scale.field}
            field={scale.field}
            question={scale.question}
            value={checkIn?.[scale.field]}
            isEditable={isEditable}
            onPick={(value) => pick(scale.field, value)}
          />
        ))}
      </View>
      <View className="p-4 border rounded-2xl border-border-neutral bg-background-default">
        <Text className="pb-2 text-lg font-bold">A small reflection</Text>
        {isEditable ? (
          <FoodTextInput
            testID="checkin-reflection"
            placeholder="One line about today (optional)"
            value={draft ?? stored}
            onChangeText={reflect}
          />
        ) : (
          <Text className="text-base">{stored === "" ? "No reflection that day." : stored}</Text>
        )}
      </View>
    </View>
  );
}
