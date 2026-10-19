import { JSX, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import * as htmlToImage from "html-to-image";
import { Text } from "./primitives/text";
import { IHistoryRecord, IScreenMuscle, ISettings } from "../types";
import { WorkoutStoryCard_muscles, WorkoutStoryCard_stats } from "../models/workoutStoryCard";
import { LiftEquivalents_pick } from "../models/liftEquivalents";
import { FrontMusclesSvg } from "./muscles/images/frontMusclesSvg";
import { BackMusclesSvg, IMuscleStyle } from "./muscles/images/backMusclesSvg";
import { ImageResize_toJpegDataUrl } from "../utils/imageResize";
import { ImageShareUtils } from "../utils/imageshare";
import { Dialog_alert } from "../utils/dialog";
import { FoodPrimaryButton } from "./foodUi";
import { GroupHeader } from "./groupHeader";

interface IProps {
  record: IHistoryRecord;
  settings: ISettings;
}

const cardWidth = 360;
const cardHeight = 640;
// 360 x 640 CSS px at 3x is 1080 x 1920, the Instagram story size.
const pixelRatio = 3;
const previewScale = 0.86;
const muscleColor = "#ff6b3d";
const textShadow = {
  textShadowColor: "rgba(0,0,0,0.75)",
  textShadowRadius: 8,
  textShadowOffset: { width: 0, height: 1 },
};

function muscleStyles(levels: Partial<Record<IScreenMuscle, number>>): Partial<Record<IScreenMuscle, IMuscleStyle>> {
  const styles: Partial<Record<IScreenMuscle, IMuscleStyle>> = {};
  for (const [muscle, level] of Object.entries(levels) as [IScreenMuscle, number][]) {
    styles[muscle] = { fill: muscleColor, opacity: 0.25 + level * 0.75 };
  }
  return styles;
}

function Stat(props: { label: string; value: string }): JSX.Element {
  return (
    <View className="items-center mb-3">
      <Text className="text-base font-semibold text-white" style={textShadow}>
        {props.label}
      </Text>
      <Text className="font-bold text-white" style={{ fontSize: 40, lineHeight: 46, ...textShadow }}>
        {props.value}
      </Text>
    </View>
  );
}

function StoryCard(props: { record: IHistoryRecord; settings: ISettings; photo?: string; seed: number }): JSX.Element {
  const stats = WorkoutStoryCard_stats(props.record, props.settings);
  const muscles = useMemo(
    () => muscleStyles(WorkoutStoryCard_muscles(props.record, props.settings)),
    [props.record, props.settings]
  );
  const equivalent = LiftEquivalents_pick(stats.weightKg, props.seed);
  const contour = { fill: "#ffffff", opacity: 0.85 };
  return (
    <View style={{ width: cardWidth, height: cardHeight, backgroundColor: "#1b1033", overflow: "hidden" }}>
      {props.photo != null ? (
        <img
          src={props.photo}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(160deg, #3b1d7a 0%, #1b1033 55%, #0b0716 100%)",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 45%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      <View className="items-center pt-10">
        <Stat label="Weight lifted" value={`${stats.weight.value.toLocaleString("en-US")} ${stats.weight.unit}`} />
        <Stat label="Duration" value={stats.duration} />
        <Stat label="Total Sets" value={`${stats.sets}`} />
      </View>
      <View className="flex-row justify-center" style={{ gap: 14, marginTop: 4 }}>
        <View style={{ width: 92 }}>
          <FrontMusclesSvg muscles={muscles} contour={contour} defaultOpacity={0.12} />
        </View>
        <View style={{ width: 92 }}>
          <BackMusclesSvg muscles={muscles} contour={contour} defaultOpacity={0.12} />
        </View>
      </View>
      <View className="absolute left-0 right-0 items-center px-6" style={{ bottom: 34 }}>
        {equivalent != null && (
          <View className="px-4 py-2 rounded-2xl" style={{ backgroundColor: "rgba(0,0,0,0.55)" }}>
            <Text className="text-lg font-bold text-center text-white">
              {equivalent.emoji} {equivalent.text}
            </Text>
          </View>
        )}
        <Text className="mt-3 text-xs font-semibold tracking-widest text-white" style={{ opacity: 0.8 }}>
          BEBEARLIFTS
        </Text>
      </View>
    </View>
  );
}

// html-to-image inlines images and fonts on the first passes; Safari often drops them from the first render.
async function toPng(element: HTMLElement): Promise<string> {
  const options = { pixelRatio, width: cardWidth, height: cardHeight };
  await htmlToImage.toPng(element, options);
  await htmlToImage.toPng(element, options);
  return htmlToImage.toPng(element, options);
}

export function WorkoutStoryCardSection(props: IProps): JSX.Element {
  const cardRef = useRef<View>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [seed, setSeed] = useState(() => Math.floor(Date.now() / 1000));
  const [isSharing, setIsSharing] = useState(false);

  const share = async (): Promise<void> => {
    setIsSharing(true);
    try {
      const dataUrl = await toPng(cardRef.current as unknown as HTMLElement);
      await new ImageShareUtils(dataUrl, "workout-story.png").shareOrDownload();
    } catch (e) {
      console.error(e);
      Dialog_alert("Couldn't make the story image");
    }
    setIsSharing(false);
  };

  return (
    <View className="px-gutter py-4" testID="workout-story" data-testid="workout-story">
      <GroupHeader name="Story card" />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        data-testid="workout-story-photo-input"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file != null) {
            setPhoto(await ImageResize_toJpegDataUrl(file, 1600).catch(() => undefined));
          }
        }}
      />
      <View className="items-center" style={{ height: cardHeight * previewScale }}>
        <View style={{ transform: [{ scale: previewScale }], transformOrigin: "top center" }}>
          <View ref={cardRef} collapsable={false}>
            <StoryCard record={props.record} settings={props.settings} photo={photo} seed={seed} />
          </View>
        </View>
      </View>
      <View className="flex-row mt-3" style={{ gap: 8 }}>
        <FoodPrimaryButton
          testID="workout-story-photo"
          kind="outline"
          title={photo == null ? "Add photo" : "Change photo"}
          onPress={() => inputRef.current?.click()}
        />
        <FoodPrimaryButton
          testID="workout-story-shuffle"
          kind="outline"
          title="Shuffle"
          onPress={() => setSeed(seed + 1)}
        />
      </View>
      <View className="flex-row mt-2">
        <FoodPrimaryButton
          testID="workout-story-share"
          title={isSharing ? "Making image…" : "Share"}
          disabled={isSharing}
          onPress={share}
        />
      </View>
    </View>
  );
}
