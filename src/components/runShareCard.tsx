import { JSX, useMemo, useRef, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { IRun, RunLog_pace } from "../models/runLog";
import { RunTrack_formatDuration, RunTrack_formatKm, RunTrack_formatPaceNumber } from "../models/runTrack";
import { RunEquivalents_pick } from "../models/runEquivalents";
import { ImageResize_toJpegDataUrl } from "../utils/imageResize";
import { ImageShareUtils } from "../utils/imageshare";
import { useStoryImage } from "../utils/storyImage";
import { Dialog_alert } from "../utils/dialog";
import { Text } from "./primitives/text";
import { FoodPrimaryButton } from "./foodUi";
import { RunRouteSvg } from "./runRouteSvg";

const cardWidth = 360;
const cardHeight = 640;

function StoryCard(props: { run: IRun; photo?: string; seed: number }): JSX.Element {
  const run = props.run;
  const equivalent = RunEquivalents_pick(run.distanceM, props.seed);
  return (
    <View style={{ width: cardWidth, height: cardHeight, overflow: "hidden", backgroundColor: "#1b1033" }}>
      {props.photo != null && (
        <img
          alt="Your run photo"
          src={props.photo}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(160deg, rgba(59,29,122,0.85) 0%, rgba(11,7,22,0.55) 45%, rgba(11,7,22,0.95) 100%)",
        }}
      />
      <View className="items-center px-6 pt-8">
        <Text className="text-xs font-semibold tracking-widest text-white">RAN TODAY</Text>
        <Text className="font-bold text-white" style={{ fontSize: 64, lineHeight: 80 }}>
          {RunTrack_formatKm(run.distanceM)}
          <Text className="text-2xl text-white"> km</Text>
        </Text>
        <View className="flex-row justify-around w-full mt-2">
          <View className="items-center">
            <Text className="text-3xl font-bold text-white">{RunTrack_formatDuration(run.movingMs)}</Text>
            <Text className="text-xs text-white">MOVING TIME</Text>
          </View>
          <View className="items-center">
            <Text className="text-3xl font-bold text-white">{RunTrack_formatPaceNumber(RunLog_pace(run))}</Text>
            <Text className="text-xs text-white">PACE /KM</Text>
          </View>
        </View>
        <View className="w-full mt-4">
          <RunRouteSvg route={run.route} width={312} height={250} color="#ffffff" />
        </View>
        <Text className="text-base font-semibold text-white">{run.elevationGainM} m climb</Text>
      </View>
      <View className="absolute bottom-0 left-0 right-0 items-center px-6 pb-6">
        {equivalent != null && (
          <View className="items-center">
            <Text className="text-lg text-center text-white">{equivalent.lead}</Text>
            <Text className="text-2xl font-bold text-center text-white">
              {equivalent.number} {equivalent.noun}
            </Text>
            {equivalent.tail !== "" && <Text className="text-base text-center text-white">{equivalent.tail}</Text>}
          </View>
        )}
        <Text className="mt-4 text-xs font-semibold tracking-widest text-white">BEBEARLIFTS</Text>
      </View>
    </View>
  );
}

export function RunShareCard(props: { run: IRun }): JSX.Element {
  const cardRef = useRef<View>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string>();
  const [seed, setSeed] = useState(0);
  const [sharing, setSharing] = useState(false);
  const source = useMemo(() => ({ photo, seed, run: props.run }), [photo, seed, props.run]);
  const { dataUrl, error, retry } = useStoryImage(cardRef, source, { width: cardWidth, height: cardHeight });
  const { width } = useWindowDimensions();
  const previewScale = Math.min(0.86, (width - 32) / cardWidth);
  const share = async (): Promise<void> => {
    if (dataUrl == null) {
      return;
    }
    setSharing(true);
    try {
      await new ImageShareUtils(dataUrl, "run-story.png").shareOrDownload();
    } catch {
      Dialog_alert("Could not make the run image. Try again.");
    }
    setSharing(false);
  };
  return (
    <View className="mt-6" testID="run-share-card">
      <Text className="mb-3 text-lg font-semibold">Story card</Text>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label="Choose run photo"
        style={{ display: "none" }}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file != null) {
            try {
              setPhoto(await ImageResize_toJpegDataUrl(file, 1600));
            } catch {
              Dialog_alert("Could not open that photo. Try another photo.");
            }
          }
        }}
      />
      <View className="items-center" style={{ height: cardHeight * previewScale }}>
        <View style={{ transform: [{ scale: previewScale }], transformOrigin: "top center" }}>
          <View ref={cardRef} collapsable={false}>
            <StoryCard run={props.run} photo={photo} seed={seed} />
          </View>
        </View>
      </View>
      <View className="flex-row mt-3" style={{ gap: 8 }}>
        <FoodPrimaryButton
          title={photo == null ? "Add photo" : "Change photo"}
          kind="outline"
          testID="run-share-photo"
          disabled={sharing}
          onPress={() => inputRef.current?.click()}
        />
        <FoodPrimaryButton
          title="Shuffle"
          kind="outline"
          testID="run-share-shuffle"
          disabled={sharing}
          onPress={() => setSeed((value) => value + 1)}
        />
      </View>
      <View className="flex-row mt-3">
        <FoodPrimaryButton
          title={error != null ? "Retry image" : sharing ? "Sharing…" : dataUrl == null ? "Making image…" : "Share run"}
          disabled={sharing || (dataUrl == null && error == null)}
          testID="run-share"
          onPress={error != null ? retry : share}
        />
      </View>
      {error != null && <Text className="mt-2 text-sm text-text-error">{error}</Text>}
    </View>
  );
}
