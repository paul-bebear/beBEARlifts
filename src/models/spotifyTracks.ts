import { UnknownValue_isRecord, UnknownValue_nonNegative, UnknownValue_text } from "./unknownValue";

export interface ISpotifyTrack {
  id: string;
  uri: string;
  name: string;
  artists: string;
  durationMs: number;
  imageUrl?: string;
}

export interface ISpotifyNowPlaying {
  track: ISpotifyTrack;
  progressMs: number;
  isPlaying: boolean;
}

export interface ISpotifyHistoryItem {
  track: ISpotifyTrack;
  startedAt: number;
  endedAt: number;
}

export function SpotifyTracks_parseTrack(raw: unknown): ISpotifyTrack | undefined {
  if (!UnknownValue_isRecord(raw)) {
    return undefined;
  }
  const r = raw as Record<string, unknown>;
  const id = UnknownValue_text(r.id);
  const uri = UnknownValue_text(r.uri);
  const name = UnknownValue_text(r.name);
  const durationMs = UnknownValue_nonNegative(r.duration_ms);
  if (id == null || uri == null || name == null || durationMs == null || r.type === "episode") {
    return undefined;
  }
  const artists = Array.isArray(r.artists)
    ? r.artists
        .map((a) => UnknownValue_text((a as Record<string, unknown> | null)?.name))
        .filter((a): a is string => a != null)
    : [];
  const images = (r.album as Record<string, unknown> | undefined)?.images;
  const image = Array.isArray(images) ? images[images.length - 1] : undefined;
  const track: ISpotifyTrack = { id, uri, name, artists: artists.join(", "), durationMs };
  const imageUrl = UnknownValue_text((image as Record<string, unknown> | undefined)?.url);
  if (imageUrl != null) {
    track.imageUrl = imageUrl;
  }
  return track;
}

export function SpotifyTracks_parseNowPlaying(raw: unknown): ISpotifyNowPlaying | undefined {
  if (!UnknownValue_isRecord(raw)) {
    return undefined;
  }
  const r = raw as Record<string, unknown>;
  const track = SpotifyTracks_parseTrack(r.item);
  const progressMs = UnknownValue_nonNegative(r.progress_ms);
  if (track == null || progressMs == null) {
    return undefined;
  }
  return { track, progressMs, isPlaying: r.is_playing === true };
}

export function SpotifyTracks_parseHistory(raw: unknown): ISpotifyHistoryItem[] {
  const items = UnknownValue_isRecord(raw) ? (raw as Record<string, unknown>).items : undefined;
  if (!Array.isArray(items)) {
    return [];
  }
  const result: ISpotifyHistoryItem[] = [];
  for (const item of items) {
    const r = (item ?? {}) as Record<string, unknown>;
    const track = SpotifyTracks_parseTrack(r.track);
    // Checked on an iPhone on 2026-10-20: played_at is when the song ended, and skipped songs are not listed.
    const endedAt = typeof r.played_at === "string" ? Date.parse(r.played_at) : NaN;
    if (track != null && isFinite(endedAt)) {
      result.push({ track, startedAt: endedAt - track.durationMs, endedAt });
    }
  }
  return result.sort((a, b) => a.endedAt - b.endedAt);
}
