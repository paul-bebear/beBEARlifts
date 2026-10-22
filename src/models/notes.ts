export type INoteKind = "note" | "checkIn";

export type ICheckInScore = 1 | 2 | 3 | 4 | 5;

export type ICheckInField = "energy" | "soreness" | "mood";

export interface INote {
  id: string;
  day: string;
  createdAt: number;
  updatedAt: number;
  kind: INoteKind;
  title: string;
  body: string;
  energy?: ICheckInScore;
  soreness?: ICheckInScore;
  mood?: ICheckInScore;
}

export interface INotesLog {
  version: 1;
  notes: INote[];
}

export interface ICheckInScale {
  field: ICheckInField;
  label: string;
  question: string;
}

export const Notes_checkInScales: ICheckInScale[] = [
  { field: "energy", label: "Energy", question: "How much energy?" },
  { field: "soreness", label: "Soreness", question: "How does your body feel?" },
  { field: "mood", label: "Mood", question: "How is your mood?" },
];

export const Notes_faces = ["😞", "🙁", "😐", "🙂", "😄"];

const notesUntitled = "Untitled note";

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
const linkPattern = /\[\[([^[\]\n]+)\]\]/g;

export function Notes_empty(): INotesLog {
  return { version: 1, notes: [] };
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && isFinite(value) ? value : undefined;
}

function score(value: unknown): ICheckInScore | undefined {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5 ? value : undefined;
}

function parseNote(raw: unknown): INote | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  const id = str(r.id);
  const day = str(r.day);
  const createdAt = num(r.createdAt);
  if (id === "" || !dayPattern.test(day) || createdAt == null) {
    return undefined;
  }
  const note: INote = {
    id,
    day,
    createdAt,
    updatedAt: num(r.updatedAt) ?? createdAt,
    kind: r.kind === "checkIn" ? "checkIn" : "note",
    title: str(r.title),
    body: str(r.body),
  };
  for (const { field } of Notes_checkInScales) {
    const value = score(r[field]);
    if (note.kind === "checkIn" && value != null) {
      note[field] = value;
    }
  }
  return note;
}

export function Notes_parse(raw: unknown): INotesLog {
  const r = (raw ?? {}) as Record<string, unknown>;
  const notes = Array.isArray(r.notes) ? r.notes.map(parseNote).filter((n): n is INote => n != null) : [];
  return { version: 1, notes };
}

function byNewest(a: INote, b: INote): number {
  return b.createdAt - a.createdAt;
}

export function Notes_forDay(log: INotesLog, day: string): INote[] {
  return log.notes.filter((n) => n.kind === "note" && n.day === day).sort(byNewest);
}

export function Notes_get(log: INotesLog, id: string): INote | undefined {
  return log.notes.find((n) => n.id === id);
}

export function Notes_checkIn(log: INotesLog, day: string): INote | undefined {
  return log.notes.find((n) => n.kind === "checkIn" && n.day === day);
}

export function Notes_checkIns(log: INotesLog): INote[] {
  return log.notes.filter((n) => n.kind === "checkIn");
}

export function Notes_days(log: INotesLog): string[] {
  return Array.from(new Set(log.notes.map((n) => n.day))).sort();
}

export function Notes_isBlank(note: INote): boolean {
  const hasScore = Notes_checkInScales.some(({ field }) => note[field] != null);
  return note.title.trim() === "" && note.body.trim() === "" && !hasScore;
}

export function Notes_new(id: string, day: string, now: number): INote {
  return { id, day, createdAt: now, updatedAt: now, kind: "note", title: "", body: "" };
}

// A blank note is removed, so opening the editor and closing it again leaves nothing behind.
export function Notes_save(log: INotesLog, note: INote, now: number): INotesLog {
  const others = log.notes.filter((n) => n.id !== note.id);
  if (Notes_isBlank(note)) {
    return others.length === log.notes.length ? log : { ...log, notes: others };
  }
  return { ...log, notes: [...others, { ...note, updatedAt: now }] };
}

export function Notes_remove(log: INotesLog, id: string): INotesLog {
  return { ...log, notes: log.notes.filter((n) => n.id !== id) };
}

export function Notes_canEditCheckIn(day: string, today: string): boolean {
  return day === today;
}

export interface ICheckInChange {
  day: string;
  newId: string;
  now: number;
  field?: ICheckInField;
  value?: ICheckInScore;
  reflection?: string;
}

// One check-in per day. Tapping the face already chosen clears that score.
export function Notes_updateCheckIn(log: INotesLog, change: ICheckInChange): INotesLog {
  const current = Notes_checkIn(log, change.day) ?? {
    ...Notes_new(change.newId, change.day, change.now),
    kind: "checkIn" as const,
  };
  const next: INote = { ...current };
  if (change.field != null) {
    if (change.value == null || current[change.field] === change.value) {
      delete next[change.field];
    } else {
      next[change.field] = change.value;
    }
  }
  if (change.reflection != null) {
    next.body = change.reflection;
  }
  return Notes_save(log, next, change.now);
}

function stripMarkdown(line: string): string {
  return line
    .replace(/^\s*(#+|[-*+]|\d+\.|>)\s*/, "")
    .replace(/[*_`~]/g, "")
    .replace(linkPattern, "$1")
    .trim();
}

export function Notes_firstLine(note: INote): string {
  const title = note.title.trim();
  if (title !== "") {
    return title;
  }
  const line = note.body
    .split("\n")
    .map(stripMarkdown)
    .find((l) => l !== "");
  return line ?? notesUntitled;
}

export function Notes_preview(note: INote): string {
  const lines = note.body
    .split("\n")
    .map(stripMarkdown)
    .filter((l) => l !== "");
  const rest = note.title.trim() === "" ? lines.slice(1) : lines;
  return rest.join(" ");
}

export function Notes_links(text: string): string[] {
  const titles: string[] = [];
  const pattern = new RegExp(linkPattern.source, "g");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) != null) {
    const title = match[1].trim();
    if (title !== "" && !titles.some((t) => t.toLowerCase() === title.toLowerCase())) {
      titles.push(title);
    }
  }
  return titles;
}

export function Notes_scoresLine(checkIn: INote): string {
  return Notes_checkInScales.filter(({ field }) => checkIn[field] != null)
    .map(({ field, label }) => `${label} ${checkIn[field]}/5`)
    .join(" · ");
}

export function Notes_toMarkdown(note: INote): string {
  const title = note.title.trim() === "" ? notesUntitled : note.title.trim();
  const body = note.body.trim();
  return body === "" ? `### ${title}` : `### ${title}\n\n${body}`;
}
