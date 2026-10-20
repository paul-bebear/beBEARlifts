import { JSX, useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { FoodPrimaryButton, FoodTextInput } from "./foodUi";
import { IDispatch } from "../ducks/types";
import { ISettings } from "../types";
import { lb } from "lens-shmens";
import { Dialog_alert } from "../utils/dialog";
import { IListenKind, ListenLinks_kinds, ListenLinks_normalize, ListenLinks_set } from "../models/listenLinks";

export function ListenLinks_open(url: string): void {
  Linking.openURL(url).catch(() => undefined);
}

function save(dispatch: IDispatch, settings: ISettings, kind: IListenKind, url: string | undefined): void {
  dispatch({
    type: "UpdateSettings",
    lensRecording: lb<ISettings>()
      .p("listenLinks")
      .record(ListenLinks_set(settings.listenLinks, kind, url)),
    desc: "Change listen link",
  });
}

export function ListenLinksCard(props: { settings: ISettings; dispatch: IDispatch }): JSX.Element {
  const [drafts, setDrafts] = useState<Partial<Record<IListenKind, string>>>({});
  return (
    <View className="p-4 mx-4 mb-4 rounded-2xl bg-background-subtle" testID="listen-links">
      <Text className="mb-1 text-base font-semibold">After and outside the gym</Text>
      <Text className="mb-3 text-sm text-text-secondary">
        Paste a Spotify link (Share → Copy link) to a playlist, podcast or episode.
      </Text>
      {ListenLinks_kinds.map(({ kind, label, play }) => {
        const url = props.settings.listenLinks?.[kind];
        return (
          <View key={kind} className="mb-3">
            <Text className="mb-1.5 text-sm font-semibold">{label}</Text>
            {url != null ? (
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <FoodPrimaryButton title={play} testID={`listen-play-${kind}`} onPress={() => ListenLinks_open(url)} />
                <Pressable onPress={() => save(props.dispatch, props.settings, kind, undefined)}>
                  <Text className="text-sm text-text-error">Remove</Text>
                </Pressable>
              </View>
            ) : (
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <View className="flex-1">
                  <FoodTextInput
                    testID={`listen-input-${kind}`}
                    value={drafts[kind] ?? ""}
                    onChangeText={(text) => setDrafts({ ...drafts, [kind]: text })}
                    placeholder="https://open.spotify.com/…"
                    autoCapitalize="none"
                  />
                </View>
                <FoodPrimaryButton
                  title="Save"
                  kind="outline"
                  testID={`listen-save-${kind}`}
                  onPress={() => {
                    const normalized = ListenLinks_normalize(drafts[kind] ?? "");
                    if (normalized == null) {
                      Dialog_alert("That is not a link. In Spotify, tap Share, then Copy link.");
                      return;
                    }
                    save(props.dispatch, props.settings, kind, normalized);
                  }}
                />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
