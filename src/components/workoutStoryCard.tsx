import { JSX, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { IHistoryRecord, IScreenMuscle, ISettings } from "../types";
import {
  IWorkoutStoryStats,
  WorkoutStoryCard_muscles,
  WorkoutStoryCard_stats,
  WorkoutStoryCard_weightNumber,
} from "../models/workoutStoryCard";
import { ILiftEquivalent, LiftEquivalents_pick } from "../models/liftEquivalents";
import { FrontMusclesSvg } from "./muscles/images/frontMusclesSvg";
import { BackMusclesSvg, IMuscleStyle } from "./muscles/images/backMusclesSvg";
import { ImageResize_toJpegDataUrl } from "../utils/imageResize";
import { ImageShareUtils } from "../utils/imageshare";
import { useStoryImage } from "../utils/storyImage";
import { Dialog_alert } from "../utils/dialog";
import { FoodPrimaryButton } from "./foodUi";
import { GroupHeader } from "./groupHeader";

interface IProps {
  record: IHistoryRecord;
  settings: ISettings;
}

const cardWidth = 360;
const cardHeight = 640;
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
    <View className="items-center" style={{ minWidth: 96 }}>
      <Text className="font-bold text-white" style={{ fontSize: 34, lineHeight: 40, ...textShadow }}>
        {props.value}
      </Text>
      <Text className="text-xs font-semibold tracking-widest text-white" style={{ opacity: 0.85, ...textShadow }}>
        {props.label}
      </Text>
    </View>
  );
}

function MuscleMaps(props: { muscles: Partial<Record<IScreenMuscle, IMuscleStyle>>; width: number }): JSX.Element {
  const contour = { fill: "#ffffff", opacity: 0.85 };
  return (
    <View className="flex-row justify-center" style={{ gap: props.width / 6 }}>
      <View style={{ width: props.width }}>
        <FrontMusclesSvg muscles={props.muscles} contour={contour} defaultOpacity={0.12} />
      </View>
      <View style={{ width: props.width }}>
        <BackMusclesSvg muscles={props.muscles} contour={contour} defaultOpacity={0.12} />
      </View>
    </View>
  );
}

function Scrim(props: { edge: "top" | "bottom"; height: number; opacity: number }): JSX.Element {
  const direction = props.edge === "top" ? "180deg" : "0deg";
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        [props.edge]: 0,
        height: props.height,
        background: `linear-gradient(${direction}, rgba(0,0,0,${props.opacity}) 0%, rgba(0,0,0,${props.opacity * 0.6}) 55%, rgba(0,0,0,0) 100%)`,
      }}
    />
  );
}

interface IStoryCardProps {
  record: IHistoryRecord;
  settings: ISettings;
  stats: IWorkoutStoryStats;
  photo?: string;
  equivalent?: ILiftEquivalent;
}

function StoryCard(props: IStoryCardProps): JSX.Element {
  const stats = props.stats;
  const muscles = useMemo(
    () => muscleStyles(WorkoutStoryCard_muscles(props.record, props.settings)),
    [props.record, props.settings]
  );
  const hasPhoto = props.photo != null;
  const equivalent = props.equivalent;
  return (
    <View style={{ width: cardWidth, height: cardHeight, backgroundColor: "#1b1033", overflow: "hidden" }}>
      {hasPhoto ? (
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
      <Scrim edge="top" height={300} opacity={hasPhoto ? 0.75 : 0.35} />
      <Scrim edge="bottom" height={360} opacity={hasPhoto ? 0.85 : 0.45} />
      <View className="items-center pt-9">
        <Text className="text-xs font-semibold tracking-widest text-white" style={{ opacity: 0.85, ...textShadow }}>
          {stats.weightKg > 0 ? "LIFTED TODAY" : "TRAINED TODAY"}
        </Text>
        <View className="flex-row" style={{ alignItems: "baseline" }}>
          <Text className="font-bold text-white" style={{ fontSize: 76, lineHeight: 88, ...textShadow }}>
            {stats.weightKg > 0 ? WorkoutStoryCard_weightNumber(stats.weight) : stats.sets}
          </Text>
          <Text className="ml-2 font-bold text-white" style={{ fontSize: 28, ...textShadow }}>
            {stats.weightKg > 0 ? stats.weight.unit : stats.sets === 1 ? "set" : "sets"}
          </Text>
        </View>
        <View className="flex-row items-center mt-2" style={{ gap: 12 }}>
          <Stat label="TIME" value={stats.duration} />
          {hasPhoto && <MuscleMaps muscles={muscles} width={40} />}
          <Stat label="SETS" value={`${stats.sets}`} />
        </View>
      </View>
      {!hasPhoto && (
        <View style={{ marginTop: 22 }}>
          <MuscleMaps muscles={muscles} width={96} />
        </View>
      )}
      <View className="absolute left-0 right-0 items-center px-6" style={{ bottom: 26 }}>
        {equivalent != null && (
          <View className="items-center" testID="workout-story-equivalent" data-testid="workout-story-equivalent">
            <Text style={{ fontSize: 44, lineHeight: 52 }}>{equivalent.emoji}</Text>
            <Text className="text-lg font-semibold text-center text-white" style={textShadow}>
              {equivalent.lead}
            </Text>
            <Text className="font-bold text-center text-white" style={{ fontSize: 32, lineHeight: 38, ...textShadow }}>
              {equivalent.number} {equivalent.noun}
            </Text>
            {equivalent.tail !== "" && (
              <Text className="text-lg font-semibold text-center text-white" style={textShadow}>
                {equivalent.tail}
              </Text>
            )}
          </View>
        )}
        <Text className="mt-4 font-semibold tracking-widest text-white" style={{ fontSize: 10, opacity: 0.7 }}>
          BEBEARLIFTS
        </Text>
      </View>
    </View>
  );
}

export function WorkoutStoryCardSection(props: IProps): JSX.Element {
  const cardRef = useRef<View>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [seed, setSeed] = useState(() => Math.floor(Date.now() / 1000));
  const [isSharing, setIsSharing] = useState(false);
  const source = useMemo(
    () => ({ photo, seed, record: props.record, settings: props.settings }),
    [photo, seed, props.record, props.settings]
  );
  const { dataUrl, error, retry } = useStoryImage(cardRef, source, { width: cardWidth, height: cardHeight });
  const stats = WorkoutStoryCard_stats(props.record, props.settings);
  const equivalent = LiftEquivalents_pick(stats.weightKg, seed);

  const share = async (): Promise<void> => {
    if (dataUrl == null) {
      return;
    }
    setIsSharing(true);
    try {
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
            <StoryCard
              record={props.record}
              settings={props.settings}
              stats={stats}
              photo={photo}
              equivalent={equivalent}
            />
          </View>
        </View>
      </View>
      <View className="flex-row mt-3" style={{ gap: 8 }}>
        <FoodPrimaryButton
          testID="workout-story-photo"
          kind="outline"
          title={photo == null ? "Add photo" : "Change photo"}
          disabled={isSharing}
          onPress={() => inputRef.current?.click()}
        />
        {equivalent != null && (
          <FoodPrimaryButton
            testID="workout-story-shuffle"
            kind="outline"
            title="Shuffle"
            disabled={isSharing}
            onPress={() => setSeed((value) => value + 1)}
          />
        )}
      </View>
      <View className="flex-row mt-2">
        <FoodPrimaryButton
          testID="workout-story-share"
          title={error != null ? "Retry image" : isSharing ? "Sharing…" : dataUrl == null ? "Making image…" : "Share"}
          disabled={isSharing || (dataUrl == null && error == null)}
          onPress={error != null ? retry : share}
        />
      </View>
      {error != null && <Text className="mt-2 text-sm text-text-error">{error}</Text>}
    </View>
  );
}
