import { JSX, useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "./primitives/text";
import { Button } from "./button";
import {
  IRunRecording,
  RunRecording_addPoint,
  RunRecording_fixText,
  RunRecording_gpsErrorText,
  RunRecording_isSaveDue,
  RunRecording_markHidden,
  RunRecording_pause,
  RunRecording_pauseStale,
  RunRecording_recentPace,
  RunRecording_resume,
  RunRecording_snapshot,
  RunRecording_toRun,
} from "../models/runRecording";
import { RunTrack_formatDuration, RunTrack_formatKm, RunTrack_formatPace, RunTrack_stats } from "../models/runTrack";
import { IRun } from "../models/runLog";
import { RunDraftStore } from "../utils/runStore";
import { RunSensors_keepScreenOn, RunSensors_watch } from "../utils/runSensors";
import { Dialog_confirm } from "../utils/dialog";

function RecordingStats(props: { recording: IRunRecording; now: number; dark?: boolean }): JSX.Element {
  const stats = RunTrack_stats(props.recording.segments, props.now);
  const textClass = props.dark ? "text-white" : "text-text-primary";
  return (
    <View className="items-center py-6" style={{ gap: 16 }}>
      <View className="items-center">
        <Text className={`font-bold ${textClass}`} style={{ fontSize: 64, lineHeight: 76 }}>
          {RunTrack_formatKm(stats.distanceM)}
        </Text>
        <Text className={textClass}>kilometres</Text>
      </View>
      <Text className={`text-4xl font-semibold ${textClass}`}>{RunTrack_formatDuration(stats.movingMs)}</Text>
      <Text className={textClass}>Moving time</Text>
      <Text className={`text-2xl font-semibold ${textClass}`}>{RunTrack_formatPace(stats.paceSecPerKm)}</Text>
      <Text className={textClass}>Average pace</Text>
      <Text className={`text-xl font-semibold ${textClass}`}>
        {RunTrack_formatPace(RunRecording_recentPace(props.recording, props.now))}
      </Text>
      <Text className={textClass}>Recent pace · last 30 seconds</Text>
    </View>
  );
}

export function RunRecorder(props: {
  initial: IRunRecording;
  onFinish: (run: IRun | undefined) => Promise<void>;
}): JSX.Element {
  const [recording, setRecording] = useState(props.initial);
  const current = useRef(recording);
  const closing = useRef(false);
  const [now, setNow] = useState(Date.now);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string>();
  const [saveError, setSaveError] = useState<string>();
  const [screenAwake, setScreenAwake] = useState(false);

  const persist = useCallback((next: IRunRecording): void => {
    const snapshot = RunRecording_snapshot(next, Date.now());
    current.current = snapshot;
    RunDraftStore.update(() => snapshot).then(
      () => setSaveError(undefined),
      () => setSaveError("Could not save this run on your phone. Keep this screen open and try again.")
    );
  }, []);

  useEffect(() => {
    if (recording.status !== "recording") {
      return;
    }
    return RunSensors_watch(
      (point) => {
        current.current = RunRecording_addPoint(current.current, point);
        setRecording(current.current);
        setGpsError(undefined);
      },
      (code) => setGpsError(RunRecording_gpsErrorText(code))
    );
  }, [recording.status]);

  useEffect(() => RunSensors_keepScreenOn(setScreenAwake), []);

  useEffect(() => {
    const timer = setInterval(() => {
      const at = Date.now();
      setNow(at);
      if (!closing.current) {
        const next = RunRecording_pauseStale(current.current, at);
        if (next !== current.current || RunRecording_isSaveDue(next.savedAt, at)) {
          persist(next);
          setRecording(current.current);
        }
      }
    }, 1000);
    const onVisibility = (): void => {
      if (document.visibilityState === "hidden" && !closing.current) {
        persist(RunRecording_markHidden(current.current, Date.now()));
        setRecording(current.current);
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }
    return () => {
      clearInterval(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
      if (!closing.current) {
        persist(RunRecording_pause(current.current, Date.now()));
      }
    };
  }, [persist]);

  const change = (next: IRunRecording): void => {
    persist(next);
    setRecording(current.current);
    setNow(Date.now());
    setGpsError(undefined);
  };

  const finish = async (): Promise<void> => {
    setBusy(true);
    if (await Dialog_confirm("Finish this run? Runs without enough GPS points will be discarded.")) {
      closing.current = true;
      change(RunRecording_pause(RunRecording_pauseStale(current.current, Date.now()), Date.now()));
      try {
        await props.onFinish(RunRecording_toRun(current.current, Date.now()));
      } catch {
        closing.current = false;
        setSaveError("Could not finish saving. Your run is paused. Tap Finish to try again.");
      }
    }
    setBusy(false);
  };

  return (
    <View testID="run-recorder" className="pb-6">
      <Text className="text-lg font-bold">{recording.status === "paused" ? "Run paused" : "Recording run"}</Text>
      {recording.wasRestored && (
        <Text className="mt-2 text-text-secondary">Your run was recovered paused. Tap Resume when you are ready.</Text>
      )}
      {recording.pausedByScreen && (
        <Text className="mt-2 text-text-secondary">
          Paused while the screen was off. Tap Resume when you are ready.
        </Text>
      )}
      <RecordingStats recording={recording} now={now} />
      <Text className="mb-2 text-sm text-text-secondary">{gpsError ?? RunRecording_fixText(recording, now)}</Text>
      <Text className="mb-2 text-sm text-text-secondary">{recording.dropped} GPS points dropped</Text>
      <Text className="mb-3 font-semibold">Keep the screen on. Locking the phone stops GPS.</Text>
      {!screenAwake && (
        <Text className="mb-3 text-sm text-text-error">
          Screen wake lock is unavailable. Keep the display awake manually.
        </Text>
      )}
      {saveError != null && (
        <Text accessibilityRole="alert" className="mb-3 text-text-error">
          {saveError}
        </Text>
      )}
      <View className="flex-row" style={{ gap: 8 }}>
        <Button
          name="run-pause-resume"
          kind="pill"
          className="flex-1"
          disabled={busy}
          onPress={() =>
            change(
              recording.status === "paused"
                ? RunRecording_resume(current.current, Date.now())
                : RunRecording_pause(current.current, Date.now())
            )
          }
        >
          {recording.status === "paused" ? "Resume" : "Pause"}
        </Button>
        <Button name="run-finish" kind="pill-outline" className="flex-1" disabled={busy} onPress={finish}>
          Finish
        </Button>
      </View>
      <View className="flex-row mt-3">
        <Button name="run-lock" kind="pill-outline" className="flex-1" onPress={() => setLocked(true)}>
          Lock touches
        </Button>
      </View>
      <Modal visible={locked} animationType="fade" onRequestClose={() => {}} presentationStyle="fullScreen">
        <SafeAreaView style={{ flex: 1, backgroundColor: "#0b0716" }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
            <Text className="text-lg font-semibold text-center text-white">Touches locked · {recording.status}</Text>
            <RecordingStats recording={recording} now={now} dark />
            <Text className="mb-4 text-center text-white">Keep the screen on. Locking the phone stops GPS.</Text>
            <Pressable
              testID="run-unlock"
              accessibilityRole="button"
              accessibilityLabel="Hold for 1.5 seconds to unlock touches"
              delayLongPress={1500}
              onLongPress={() => setLocked(false)}
              className="items-center p-4 border border-white rounded-full"
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Text className="text-base font-semibold text-white">Hold 1.5 seconds to unlock</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
