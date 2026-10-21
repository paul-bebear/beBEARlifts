import { RunLog_empty, RunLog_parse } from "../models/runLog";
import { IRunRecording, RunRecording_parse } from "../models/runRecording";
import { JsonStore_create } from "./jsonStore";

export const RunStore = JsonStore_create("bebear_runs", RunLog_parse, RunLog_empty);

export const RunDraftStore = JsonStore_create<IRunRecording | undefined>(
  "bebear_run_draft",
  RunRecording_parse,
  () => undefined
);
