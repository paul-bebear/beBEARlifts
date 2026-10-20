export interface ISpotifyProfile {
  id: string;
  displayName: string;
}

export interface ISpotifyPlaylistRef {
  id: string;
  url?: string;
}

const maxUrisPerCall = 100;
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function SpotifyPlaylist_name(startedAt: number): string {
  const d = new Date(startedAt);
  return `Workout ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function SpotifyPlaylist_chunks<T>(items: T[]): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += maxUrisPerCall) {
    result.push(items.slice(i, i + maxUrisPerCall));
  }
  return result;
}

export function SpotifyPlaylist_parseProfile(raw: unknown): ISpotifyProfile | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (typeof r.id !== "string" || r.id === "") {
    return undefined;
  }
  return { id: r.id, displayName: typeof r.display_name === "string" && r.display_name !== "" ? r.display_name : r.id };
}

export function SpotifyPlaylist_parseCreated(raw: unknown): ISpotifyPlaylistRef | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (typeof r.id !== "string" || r.id === "") {
    return undefined;
  }
  const url = (r.external_urls as Record<string, unknown> | undefined)?.spotify;
  return typeof url === "string" ? { id: r.id, url } : { id: r.id };
}

export function SpotifyPlaylist_playError(status: number): string | undefined {
  if (status >= 200 && status < 300) {
    return undefined;
  }
  if (status === 404) {
    return "No Spotify device is active. Open Spotify on your phone, play any song, then try again.";
  }
  if (status === 403) {
    return "Spotify only lets Premium accounts start playback from another app.";
  }
  return `Spotify did not start playback (error ${status}).`;
}

// Spotify renamed the playlist endpoints in its 2024 to 2026 API changes. A 404 or 410 means the other shape applies.
export function SpotifyPlaylist_shouldFallBack(status: number): boolean {
  return status === 404 || status === 410;
}
