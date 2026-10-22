import { JSX, useEffect, useRef, useState } from "react";
import { Linking, Platform, Pressable, View } from "react-native";
import { Text } from "./primitives/text";
import { FoodTextInput } from "./foodUi";
import { Button } from "./button";
import { IDispatch } from "../ducks/types";
import { ISettings } from "../types";
import { lb } from "lens-shmens";
import { Dialog_alert } from "../utils/dialog";
import {
  IListenKind,
  ListenLinks_kinds,
  ListenLinks_normalize,
  ListenLinks_set,
  ListenLinks_spotifyUri,
} from "../models/listenLinks";

function ListenLinks_open(url: string): void {
  Linking.openURL(ListenLinks_spotifyUri(url) ?? url).catch(() => Linking.openURL(url).catch(() => undefined));
}

export function ListenLink(props: { url: string; title: string; testID?: string }): JSX.Element {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const uri = ListenLinks_spotifyUri(props.url);
  useEffect(() => {
    const clear = (): void => clearTimeout(timer.current);
    const onVisibility = (): void => {
      if (document.visibilityState === "hidden") {
        clear();
      }
    };
    if (Platform.OS !== "web") {
      return undefined;
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clear();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return Platform.OS === "web" ? (
    <a
      href={uri ?? props.url}
      data-testid={props.testID}
      className="text-text-link"
      onClick={() => {
        clearTimeout(timer.current);
        if (uri != null) {
          timer.current = setTimeout(() => {
            if (document.visibilityState === "visible") {
              window.location.assign(props.url);
            }
          }, 1000);
        }
      }}
    >
      {props.title}
    </a>
  ) : (
    <Pressable accessibilityRole="link" testID={props.testID} onPress={() => ListenLinks_open(props.url)}>
      <Text className="text-text-link">{props.title}</Text>
    </Pressable>
  );
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
                <ListenLink url={url} title={play} testID={`listen-play-${kind}`} />
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
                <Button
                  name={`listen-save-${kind}`}
                  kind="pill-outline"
                  className="flex-1"
                  onPress={() => {
                    const normalized = ListenLinks_normalize(drafts[kind] ?? "");
                    if (normalized == null) {
                      Dialog_alert("That is not a link. In Spotify, tap Share, then Copy link.");
                      return;
                    }
                    save(props.dispatch, props.settings, kind, normalized);
                  }}
                >
                  Save
                </Button>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
