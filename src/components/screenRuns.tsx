import { JSX, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { IRun, RunLog_date, RunLog_pace, RunLog_put, RunLog_remove } from "../models/runLog";
import { IRunRecording, RunRecording_restore, RunRecording_snapshot, RunRecording_start } from "../models/runRecording";
import { RunTrack_formatDuration, RunTrack_formatKm, RunTrack_formatPace } from "../models/runTrack";
import { useNavOptions } from "../navigation/useNavOptions";
import { Dialog_alert, Dialog_confirm } from "../utils/dialog";
import { RunDraftStore, RunStore } from "../utils/runStore";
import { RunSensors_isAvailable } from "../utils/runSensors";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { RunRecorder } from "./runRecorder";
import { RunResult } from "./runResult";

export function ScreenRuns(): JSX.Element {
  const log = RunStore.use();
  const [recording, setRecording] = useState<IRunRecording>();
  const [selected, setSelected] = useState<IRun>();
  const [loading, setLoading] = useState(true);
  useNavOptions({ navTitle: "Runs" });

  useEffect(() => {
    let active = true;
    RunDraftStore.load()
      .then(async (draft) => {
        const restored = draft != null ? RunRecording_restore(draft) : undefined;
        if (restored != null) {
          await RunDraftStore.update(() => restored);
        }
        if (active) {
          setRecording(restored);
          setLoading(false);
        }
      })
      .catch(() => Dialog_alert("Could not load your run. Reopen Runs to try again."));
    return () => {
      active = false;
    };
  }, []);

  const start = async (): Promise<void> => {
    setLoading(true);
    try {
      const next = RunRecording_snapshot(RunRecording_start(Date.now()), Date.now());
      await RunDraftStore.update(() => next);
      setSelected(undefined);
      setRecording(next);
    } catch {
      Dialog_alert("Could not save a new run on this phone. Try again before starting.");
    }
    setLoading(false);
  };

  const finish = async (run: IRun | undefined): Promise<void> => {
    if (run != null) {
      await RunStore.update((value) => RunLog_put(value, run));
    } else {
      Dialog_alert("This run had too few GPS points to save.");
    }
    await RunDraftStore.update(() => undefined);
    setRecording(undefined);
    setSelected(run);
  };

  const remove = async (run: IRun): Promise<void> => {
    if (await Dialog_confirm("Delete this run and its route?")) {
      try {
        await RunStore.update((value) => RunLog_remove(value, run.id));
        setSelected(undefined);
      } catch {
        Dialog_alert("Could not delete this run. Try again.");
      }
    }
  };

  return (
    <View className="px-4 pt-2 pb-8" testID="runs-screen">
      {recording != null ? (
        <RunRecorder initial={recording} onFinish={finish} />
      ) : selected != null ? (
        <RunResult run={selected} onDelete={() => remove(selected)} onClose={() => setSelected(undefined)} />
      ) : (
        <View>
          <Text className="mb-4 text-text-secondary">
            Record a run outside. Distance and pace use GPS. Runs stay on this phone and in your backups.
          </Text>
          <View className="flex-row mb-6">
            <Button
              name="run-start"
              kind="pill"
              className="flex-1"
              disabled={loading || !RunSensors_isAvailable()}
              onPress={start}
            >
              {loading ? "Loading…" : "Start run"}
            </Button>
          </View>
          {!RunSensors_isAvailable() && (
            <Text className="mb-4 text-text-error">
              GPS recording is available in the web app on a phone with location services.
            </Text>
          )}
          <Text className="mb-3 text-lg font-bold">Run history</Text>
          {log.runs.length === 0 && (
            <Text className="text-text-secondary">No runs yet. Your first run will appear here.</Text>
          )}
          {log.runs.map((run) => (
            <Pressable
              key={run.id}
              testID={`run-history-${run.id}`}
              accessibilityRole="button"
              onPress={() => setSelected(run)}
              className="p-4 mb-3 rounded-2xl bg-background-subtle"
              style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
            >
              <Text className="text-sm text-text-secondary">{RunLog_date(run.startedAt)}</Text>
              <Text className="mt-1 text-xl font-bold">{RunTrack_formatKm(run.distanceM)} km</Text>
              <Text className="mt-1">
                {RunTrack_formatDuration(run.movingMs)} · {RunTrack_formatPace(RunLog_pace(run))}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
