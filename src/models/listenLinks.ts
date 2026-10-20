export type IListenKind = "cooldown" | "mantra" | "meditation";

export type IListenLinks = Partial<Record<IListenKind, string>>;

export const ListenLinks_kinds: { kind: IListenKind; label: string; play: string }[] = [
  { kind: "cooldown", label: "Cooldown, for the walk home", play: "Play cooldown" },
  { kind: "mantra", label: "Morning mantras", play: "Play morning mantras" },
  { kind: "meditation", label: "Meditation", play: "Play meditation" },
];

const spotifyTypes = ["playlist", "album", "show", "episode", "track", "artist"];

// A spotify: URI opens nothing in Safari, so it becomes the open.spotify.com link that hands off to the app.
export function ListenLinks_normalize(text: string): string | undefined {
  const trimmed = text.trim();
  const uri = trimmed.match(/^spotify:([a-z]+):([A-Za-z0-9]+)$/);
  if (uri != null && spotifyTypes.includes(uri[1])) {
    return `https://open.spotify.com/${uri[1]}/${uri[2]}`;
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return undefined;
  }
  return url.protocol === "https:" ? url.href : undefined;
}

export function ListenLinks_set(
  links: IListenLinks | undefined,
  kind: IListenKind,
  url: string | undefined
): IListenLinks {
  const next = { ...links };
  if (url == null) {
    delete next[kind];
  } else {
    next[kind] = url;
  }
  return next;
}
