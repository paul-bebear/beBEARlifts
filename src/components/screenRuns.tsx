import { JSX, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { IRun, RunLog_date, RunLog_pace, RunLog_put, RunLog_remove } from "../models/runLog";
import { IRunRecording, RunRecording_permissionText } from "../models/runRecording";
import { RunFinish_mountPlan, RunFinish_saveEffects, RunFinish_startPlan } from "../models/runFinish";
import { RunTrack_formatDuration, RunTrack_formatKm, RunTrack_formatPace } from "../models/runTrack";
import { useNavOptions } from "../navigation/useNavOptions";
import { Dialog_alert, Dialog_confirm } from "../utils/dialog";
import { RunDraftStore, RunStore } from "../utils/runStore";
import { RunSensors_isAvailable, RunSensors_platform, RunSensors_requestPermission } from "../utils/runSensors";
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
        const plan = RunFinish_mountPlan(draft);
        if (plan.recording != null && plan.rewriteDraft) {
          const restored = plan.recording;
          await RunDraftStore.update(() => restored);
        }
        if (active) {
          setRecording(plan.recording);
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
      const blocked = RunRecording_permissionText(await RunSensors_requestPermission(), RunSensors_platform);
      const plan = RunFinish_startPlan(blocked, Date.now());
      if (plan.type === "blocked") {
        Dialog_alert(plan.text);
        setLoading(false);
        return;
      }
      const next = plan.recording;
      await RunDraftStore.update(() => next);
      setSelected(undefined);
      setRecording(next);
    } catch {
      Dialog_alert("Could not save a new run on this phone. Try again before starting.");
    }
    setLoading(false);
  };

  const finish = async (run: IRun | undefined): Promise<void> => {
    for (const effect of RunFinish_saveEffects(run)) {
      if (effect.type === "save-run") {
        await RunStore.update((value) => RunLog_put(value, effect.run));
      } else if (effect.type === "alert-too-short") {
        Dialog_alert("This run had too few GPS points to save.");
      } else if (effect.type === "clear-draft") {
        await RunDraftStore.update(() => undefined);
      } else {
        setRecording(undefined);
        setSelected(effect.run);
      }
    }
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
