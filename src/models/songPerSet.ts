import { IHistoryRecord } from "../types";
import { IMusicSession } from "./musicSession";
import { ISpotifyTrack } from "./spotifyTracks";

export interface ISongForSet {
  entryIndex: number;
  setIndex: number;
  track?: ISpotifyTrack;
}

interface IWindow {
  track: ISpotifyTrack;
  startedAt: number;
  endedAt: number;
}

// A live play is closed only when the tracker sees the next song, so heardMs can stop at the last poll before
// the phone locked. The song kept playing until the next one started, up to its full length.
function windows(session: IMusicSession): IWindow[] {
  const plays = [
    ...session.plays.map((p) => ({ track: p.track, startedAt: p.startedAt, heardMs: p.heardMs })),
    ...(session.current != null
      ? [
          {
            track: session.current.track,
            startedAt: session.current.firstSeenAt,
            heardMs: session.current.maxProgressMs,
          },
        ]
      : []),
  ].sort((a, b) => a.startedAt - b.startedAt);
  return plays.map((p, i) => {
    const nextStartedAt = plays[i + 1]?.startedAt ?? Infinity;
    const end = Math.min(nextStartedAt, p.startedAt + p.track.durationMs);
    return { track: p.track, startedAt: p.startedAt, endedAt: Math.max(p.startedAt + p.heardMs, end) };
  });
}

function trackAt(list: IWindow[], time: number): ISpotifyTrack | undefined {
  let found: ISpotifyTrack | undefined;
  for (const w of list) {
    if (w.startedAt <= time && time < w.endedAt) {
      found = w.track;
    }
  }
  return found;
}

export function SongPerSet_trackAt(session: IMusicSession, time: number): ISpotifyTrack | undefined {
  return trackAt(windows(session), time);
}

export function SongPerSet_match(record: IHistoryRecord, session: IMusicSession | undefined): ISongForSet[] {
  const list = session != null ? windows(session) : [];
  const result: ISongForSet[] = [];
  record.entries.forEach((entry, entryIndex) => {
    entry.sets.forEach((set, setIndex) => {
      if (set.isCompleted) {
        const track = set.timestamp != null ? trackAt(list, set.timestamp) : undefined;
        result.push({ entryIndex, setIndex, track });
      }
    });
  });
  return result;
}

export function SongPerSet_hasAny(songs: ISongForSet[]): boolean {
  return songs.some((s) => s.track != null);
}

export function SongPerSet_forEntry(songs: ISongForSet[], entryIndex: number): ISongForSet[] {
  return songs.filter((s) => s.entryIndex === entryIndex && s.track != null);
}

function trackLabel(song: ISongForSet): string {
  return song.track != null ? `${song.track.name} · ${song.track.artists}` : "no song";
}

export function SongPerSet_label(song: ISongForSet): string {
  return `Set ${song.setIndex + 1} · ${trackLabel(song)}`;
}

export function SongPerSet_rowLabel(song: ISongForSet, exerciseName: string): string {
  return `${exerciseName} set ${song.setIndex + 1} · ${trackLabel(song)}`;
}
