import { Notes_empty, Notes_parse } from "../models/notes";
import { JsonStore_create } from "./jsonStore";

export const NotesStore = JsonStore_create("bebear_notes", Notes_parse, Notes_empty);

export function NotesStore_newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
