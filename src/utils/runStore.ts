import { RunLog_empty, RunLog_parse } from "../models/runLog";
import { IRunRecording, RunRecording_parse } from "../models/runRecording";
import { JsonStore_create } from "./jsonStore";
import { IndexedDBUtils_setMany } from "./indexeddb";

function persist(key: string, value?: string): Promise<void> {
  return IndexedDBUtils_setMany([[key, value]]);
}

export const RunStore = JsonStore_create("bebear_runs", RunLog_parse, RunLog_empty, persist);

export const RunDraftStore = JsonStore_create<IRunRecording | undefined>(
  "bebear_run_draft",
  RunRecording_parse,
  () => undefined,
  persist
);
