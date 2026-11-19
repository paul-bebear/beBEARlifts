import { Notes_empty, Notes_parse } from "../models/notes";
import { JsonStore_create } from "./jsonStore";
import { LocalId_new } from "./localId";

export const NotesStore = JsonStore_create("bebear_notes", Notes_parse, Notes_empty);

export const NotesStore_newId = LocalId_new;
