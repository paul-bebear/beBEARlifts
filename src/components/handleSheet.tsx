import { JSX, ReactNode, useEffect, useReducer } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "./primitives/text";
import { TextInput } from "./primitives/textInput";
import { ShareCardTheme as T } from "./shareCards/shareCardTheme";
import { BearName_initialForm, BearName_isSaved, BearName_sheet } from "../models/bearName";
import { Friends_forUser, IProfile } from "../models/friends";
import { FriendsForm_empty, FriendsForm_reduce } from "../models/friendsForm";
import { FriendsStore } from "../utils/friendsClient";
import { FriendsCommand_run } from "../utils/friendsCommand";
import { CloudStore } from "../utils/supabaseClient";

interface IProps {
  onClose: () => void;
  onOpenSettings: () => void;
}

const errorColor = "#B3261E";

function Panel(props: { onClose: () => void; children: ReactNode }): JSX.Element {
  return (
    <Modal visible={true} animationType="slide" transparent={true} onRequestClose={props.onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Pressable
          testID="handle-sheet-backdrop"
          data-testid="handle-sheet-backdrop"
          accessibilityLabel="Close"
          onPress={props.onClose}
          className="justify-end flex-1"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        >
          <SafeAreaView edges={["bottom"]} style={{ backgroundColor: T.cream }}>
            <Pressable className="px-6 pt-6 pb-4" testID="handle-sheet" data-testid="handle-sheet">
              {props.children}
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PillButton(props: { name: string; label: string; disabled?: boolean; onPress: () => void }): JSX.Element {
  return (
    <Pressable
      testID={props.name}
      data-testid={props.name}
      accessibilityRole="button"
      accessibilityState={{ disabled: props.disabled === true }}
      disabled={props.disabled}
      onPress={props.onPress}
      className="items-center py-4 rounded-full"
      style={{ backgroundColor: T.honey, opacity: props.disabled ? 0.5 : 1 }}
    >
      <Text className="text-base font-semibold" style={{ color: T.greenDark }}>
        {props.label}
      </Text>
    </Pressable>
  );
}

function HandleForm(props: { userId: string; me?: IProfile; onClose: () => void }): JSX.Element {
  const [form, emit] = useReducer(FriendsForm_reduce, props.me, BearName_initialForm);
  const sheet = BearName_sheet({ userId: props.userId, hasLoaded: true, me: props.me, form });
  const isSaved = BearName_isSaved(form);
  const save = (): void => {
    if (sheet.canSave) {
      emit({ type: "saveProfile", isNew: sheet.isNew });
    }
  };

  useEffect(() => {
    if (form.command != null) {
      FriendsCommand_run(form.command, emit);
    }
  }, [form.command]);

  useEffect(() => {
    if (isSaved) {
      props.onClose();
    }
  }, [isSaved]);

  return (
    <>
      <Text className="mt-1 text-base" style={{ color: T.greenDark }}>
        {sheet.hint}
      </Text>
      <View
        className="flex-row items-center px-4 mt-4 border rounded-full"
        style={{ borderColor: sheet.fieldError != null ? errorColor : T.greenDark, backgroundColor: "#FFFFFF" }}
      >
        <Text className="text-base font-bold" style={{ color: T.greenDark }}>
          @
        </Text>
        <TextInput
          accessibilityLabel="Bear name"
          testID="handle-sheet-input"
          data-testid="handle-sheet-input"
          className="flex-1 py-3 pl-1 text-base"
          style={{ color: T.greenDark }}
          value={form.handle}
          onChangeText={(value) => emit({ type: "handle", value })}
          autoCapitalize="none"
          autoCorrect={false}
          editable={form.command == null}
          returnKeyType="done"
          onSubmitEditing={save}
        />
      </View>
      {sheet.fieldError != null && (
        <Text
          className="mt-2 text-sm"
          style={{ color: errorColor }}
          accessibilityRole="alert"
          testID="handle-sheet-error"
          data-testid="handle-sheet-error"
        >
          {sheet.fieldError}
        </Text>
      )}
      <View className="mt-5">
        <PillButton name="handle-sheet-save" label={sheet.saveLabel} disabled={!sheet.canSave} onPress={save} />
      </View>
    </>
  );
}

export function HandleSheet(props: IProps): JSX.Element {
  const userId = CloudStore.use().session?.userId;
  const friends = Friends_forUser(FriendsStore.use(), userId);
  const [loader, emit] = useReducer(FriendsForm_reduce, undefined, FriendsForm_empty);
  const hasLoaded = friends.userId != null;
  const sheet = BearName_sheet({ userId, hasLoaded, me: friends.me, form: loader });

  useEffect(() => {
    if (userId != null && !hasLoaded) {
      emit({ type: "load" });
    }
  }, [userId, hasLoaded]);

  useEffect(() => {
    if (loader.command != null) {
      FriendsCommand_run(loader.command, emit);
    }
  }, [loader.command]);

  return (
    <Panel onClose={props.onClose}>
      <Text className="text-2xl font-bold" style={{ color: T.greenDark }}>
        {sheet.heading}
      </Text>
      {sheet.stage === "form" && userId != null ? (
        <HandleForm userId={userId} me={friends.me} onClose={props.onClose} />
      ) : (
        <>
          <Text className="mt-1 text-base" style={{ color: T.greenDark }}>
            {sheet.hint}
          </Text>
          {sheet.stage === "signedOut" && (
            <View className="mt-5">
              <PillButton
                name="handle-sheet-settings"
                label="Open Settings → Cloud backup"
                onPress={props.onOpenSettings}
              />
            </View>
          )}
        </>
      )}
    </Panel>
  );
}
