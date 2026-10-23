import { JSX, useState } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { useNavOptions } from "../navigation/useNavOptions";
import { useTrackedState, useTrackedDispatch, untrack } from "../navigation/TrackedStateContext";
import { ListenLink, ListenLinksCard } from "./listenLinksCard";
import { Button } from "./button";
import { IconCheckCircle } from "./icons/iconCheckCircle";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { Dialog_confirm } from "../utils/dialog";
import { MusicStore_update, useMusicLog } from "../utils/musicStore";
import {
  SpotifyClient_login,
  SpotifyClient_play,
  SpotifyClient_savePlaylist,
  SpotifyClient_takeError,
  SpotifyClient_testerLimitMessage,
} from "../utils/spotifyClient";
import {
  MusicLog_disconnect,
  MusicLog_exportJson,
  MusicLog_formatDuration,
  MusicLog_putSession,
  MusicLog_reviewable,
  MusicLog_workoutForSession,
} from "../models/musicLog";
import {
  IMusicSession,
  MusicSession_counts,
  MusicSession_keptTracks,
  MusicSession_setKept,
} from "../models/musicSession";
import { SpotifyPlaylist_name } from "../models/spotifyPlaylist";
import { IHistoryRecord, ISettings } from "../types";
import { SongPerSet_hasAny, SongPerSet_match, SongPerSet_rowLabel } from "../models/songPerSet";
import { Exercise_get } from "../models/exercise";
import { Exporter_toFile } from "../utils/exporter";
import { ExportFilename_dated } from "../models/exportFilename";

type IStatus = { kind: "busy" } | { kind: "message"; text: string; url?: string };

function SessionCard(props: {
  session: IMusicSession;
  record?: IHistoryRecord;
  settings: ISettings;
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
}): JSX.Element {
  const { session, record } = props;
  const [status, setStatus] = useState<IStatus | undefined>(undefined);
  const semantic = Tailwind_semantic();
  const counts = MusicSession_counts(session);
  const uris = MusicSession_keptTracks(session).map((t) => t.uri);
  const isBusy = status?.kind === "busy";
  const songs = record != null ? SongPerSet_match(record, session) : [];

  const setKept = (index: number, isKept: boolean): void => {
    MusicStore_update((log) => MusicLog_putSession(log, MusicSession_setKept(session, index, isKept)));
  };

  const save = async (): Promise<void> => {
    setStatus({ kind: "busy" });
    const result = await SpotifyClient_savePlaylist(SpotifyPlaylist_name(session.startedAt), uris);
    setStatus(
      result.ok
        ? {
            kind: "message",
            text: `Saved ${uris.length} song${uris.length === 1 ? "" : "s"} to Spotify.`,
            url: result.value.url,
          }
        : { kind: "message", text: result.message }
    );
  };

  const play = async (): Promise<void> => {
    setStatus({ kind: "busy" });
    const result = await SpotifyClient_play(uris);
    setStatus({ kind: "message", text: result.ok ? "Playing on Spotify." : result.message });
  };

  return (
    <View className="mx-4 mb-3 rounded-2xl bg-background-subtle" testID="music-session" data-testid="music-session">
      <Pressable className="flex-row items-center p-4" onPress={props.onToggle}>
        <View className="flex-1">
          <Text className="text-base font-bold">{props.title}</Text>
          <Text className="text-sm text-text-secondary">
            {counts.kept} kept · {counts.skipped} skipped{session.endedAt == null ? " · in progress" : ""}
          </Text>
        </View>
        <Text className="text-sm text-text-link">{props.isExpanded ? "Hide" : "Show"}</Text>
      </Pressable>
      {props.isExpanded && (
        <View className="px-4 pb-4">
          {session.plays.map((p, index) => (
            <Pressable
              key={`${p.track.id}-${p.startedAt}`}
              className="flex-row items-center py-2"
              testID={`music-play-${p.track.id}`}
              data-testid={`music-play-${p.track.id}`}
              onPress={() => setKept(index, !p.isKept)}
            >
              <IconCheckCircle isChecked={p.isKept} color={semantic.icon.blue} size={22} />
              <View className="flex-1 ml-3">
                <Text className="text-base" numberOfLines={1}>
                  {p.track.name}
                </Text>
                <Text className="text-sm text-text-secondary" numberOfLines={1}>
                  {p.track.artists} · heard {MusicLog_formatDuration(p.heardMs)} of{" "}
                  {MusicLog_formatDuration(p.track.durationMs)}
                  {p.source === "history" ? " · while locked" : ""}
                </Text>
              </View>
            </Pressable>
          ))}
          {session.current != null && (
            <Text className="py-2 text-sm text-text-secondary">Now: {session.current.track.name}</Text>
          )}
          {record != null && SongPerSet_hasAny(songs) && (
            <View className="mt-3" testID="music-song-per-set" data-testid="music-song-per-set">
              <Text className="mb-1 text-sm font-semibold">Song per set</Text>
              {songs.map((song) => (
                <Text key={`${song.entryIndex}-${song.setIndex}`} className="py-1 text-sm" numberOfLines={1}>
                  {SongPerSet_rowLabel(
                    song,
                    Exercise_get(record.entries[song.entryIndex].exercise, props.settings.exercises).name
                  )}
                </Text>
              ))}
            </View>
          )}
          <View className="flex-row gap-2 mt-3">
            <Button
              name="music-save"
              kind="pill"
              className="flex-1"
              disabled={isBusy || uris.length === 0}
              onPress={save}
            >
              Save to Spotify
            </Button>
            <Button
              name="music-play"
              kind="pill-outline"
              className="flex-1"
              disabled={isBusy || uris.length === 0}
              onPress={play}
            >
              Play next workout
            </Button>
          </View>
          {status?.kind === "message" && (
            <Text className="mt-3 text-sm" testID="music-status" data-testid="music-status">
              {status.text}
              {status.url != null && <ListenLink url={status.url} title="Open in Spotify" />}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

function sessionTitle(session: IMusicSession, record: IHistoryRecord | undefined): string {
  const date = new Date(session.startedAt).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return record != null ? `${date} · ${record.dayName}` : date;
}

export function ScreenMusic(): JSX.Element {
  const state = useTrackedState();
  const history = untrack(state.storage.history);
  const settings = untrack(state.storage.settings);
  const dispatch = useTrackedDispatch();
  const log = useMusicLog();
  const [error, setError] = useState(() => SpotifyClient_takeError());
  const sessions = MusicLog_reviewable(log);
  const [expandedId, setExpandedId] = useState<number | undefined>(sessions[0]?.id);

  useNavOptions({ navTitle: "Workout music" });

  const disconnect = async (): Promise<void> => {
    if (await Dialog_confirm("Disconnect Spotify? Your saved song lists stay on this phone.")) {
      await MusicStore_update(MusicLog_disconnect);
    }
  };

  const connect = async (): Promise<void> => {
    await SpotifyClient_login();
    setError(SpotifyClient_takeError());
  };

  return (
    <View className="pt-2 pb-6" testID="music-screen" data-testid="music-screen">
      <View className="p-4 mx-4 mb-4 rounded-2xl bg-background-subtle">
        {log.tokens == null ? (
          <>
            <Text className="mb-3 text-base">
              Connect Spotify. During a workout the app notes each song. A song heard for half its length is kept, any
              other song is a skip. After the workout, save the kept songs as a playlist.
            </Text>
            <View className="flex-row">
              <Button name="music-connect" kind="pill" className="flex-1" onPress={connect}>
                Connect Spotify
              </Button>
            </View>
            <Text className="mt-3 text-sm text-text-secondary">{SpotifyClient_testerLimitMessage}</Text>
          </>
        ) : (
          <View className="flex-row items-center">
            <Text className="flex-1 text-base" testID="music-account" data-testid="music-account">
              Spotify: {log.displayName ?? "connected"}
            </Text>
            <Pressable onPress={disconnect} testID="music-disconnect" data-testid="music-disconnect">
              <Text className="text-sm text-text-error">Disconnect</Text>
            </Pressable>
          </View>
        )}
        {error != null && <Text className="mt-3 text-sm text-text-error">{error}</Text>}
      </View>
      <ListenLinksCard settings={settings} dispatch={dispatch} />
      {sessions.length === 0 ? (
        <Text className="px-4 text-base text-text-secondary">
          No workout music yet. Start a workout with Spotify playing on this account.
        </Text>
      ) : (
        sessions.map((s) => {
          const record = MusicLog_workoutForSession(history, s);
          return (
            <SessionCard
              key={s.id}
              session={s}
              record={record}
              settings={settings}
              title={sessionTitle(s, record)}
              isExpanded={expandedId === s.id}
              onToggle={() => setExpandedId(expandedId === s.id ? undefined : s.id)}
            />
          );
        })
      )}
      <View className="px-4 pt-6">
        <Text className="mb-3 text-sm text-text-secondary">Export everything in Settings includes this log.</Text>
        <View className="flex-row">
          <Button
            name="music-export"
            kind="pill-outline"
            className="flex-1"
            onPress={() => Exporter_toFile(ExportFilename_dated("bebear_music_", Date.now()), MusicLog_exportJson(log))}
          >
            Export music log
          </Button>
        </View>
      </View>
    </View>
  );
}
