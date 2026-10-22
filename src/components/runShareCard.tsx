import { JSX, useEffect, useState } from "react";
import { Image, View, useWindowDimensions } from "react-native";
import { IRun, RunLog_pace } from "../models/runLog";
import { RunTrack_formatDuration, RunTrack_formatKm, RunTrack_formatPaceNumber } from "../models/runTrack";
import { RunEquivalents_pick } from "../models/runEquivalents";
import { ProgressPhotoPick_pick } from "../utils/progressPhotoPick";
import { Dialog_alert } from "../utils/dialog";
import { ShareCardImage_prepareAhead } from "../utils/shareCardImage";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { RunRouteSvg } from "./runRouteSvg";
import { ShareCardBrand, ShareCardFrame, ShareCardScrim, ShareCardText } from "./shareCards/cardParts";
import { ShareCardExportSurface } from "./shareCards/shareCardExportSurface";
import { useShareCardExport } from "./shareCards/useShareCardExport";
import { ShareCardTheme as T } from "./shareCards/shareCardTheme";

interface ICardProps {
  run: IRun;
  photo?: string;
  seed: number;
  onPhotoLoad?: (photo: string) => void;
}

function Stat(props: { label: string; value: string }): JSX.Element {
  return (
    <View style={{ alignItems: "center" }}>
      <ShareCardText size={28} weight="bold">
        {props.value}
      </ShareCardText>
      <ShareCardText size={11} weight="semibold" spacing={2} style={{ opacity: 0.85 }}>
        {props.label}
      </ShareCardText>
    </View>
  );
}

function RunStoryCard(props: ICardProps): JSX.Element {
  const run = props.run;
  const photo = props.photo;
  const equivalent = RunEquivalents_pick(run.distanceM, props.seed);
  return (
    <ShareCardFrame background={T.green}>
      {photo != null && (
        <Image
          source={{ uri: photo }}
          resizeMode="cover"
          onLoad={() => props.onPhotoLoad?.(photo)}
          style={{ position: "absolute", top: 0, left: 0, width: T.width, height: T.height }}
        />
      )}
      <ShareCardScrim edge="top" height={320} opacity={photo != null ? 0.75 : 0.3} />
      <ShareCardScrim edge="bottom" height={260} opacity={photo != null ? 0.85 : 0.3} />
      <View style={{ alignItems: "center", paddingTop: 26, paddingHorizontal: 24 }}>
        <ShareCardBrand size={32} color={T.cream} faceColor={T.green} />
        <ShareCardText size={72} weight="bold" style={{ marginTop: 14 }}>
          {RunTrack_formatKm(run.distanceM)}
          <ShareCardText size={26} weight="bold">
            {" km"}
          </ShareCardText>
        </ShareCardText>
        <View style={{ flexDirection: "row", justifyContent: "space-around", width: "100%", marginTop: 4 }}>
          <Stat label="MOVING TIME" value={RunTrack_formatDuration(run.movingMs)} />
          <Stat label="PACE /KM" value={RunTrack_formatPaceNumber(RunLog_pace(run))} />
        </View>
        <View style={{ width: "100%", marginTop: 16 }}>
          <RunRouteSvg route={run.route} width={312} height={220} color={T.honey} />
        </View>
        <ShareCardText size={15} weight="semibold">{`${run.elevationGainM} m climb`}</ShareCardText>
      </View>
      <View
        style={{ position: "absolute", left: 0, right: 0, bottom: 28, alignItems: "center", paddingHorizontal: 24 }}
      >
        {equivalent != null && (
          <>
            <ShareCardText size={16} align="center">
              {equivalent.lead}
            </ShareCardText>
            <ShareCardText size={26} weight="bold" align="center">
              {`${equivalent.number} ${equivalent.noun}`}
            </ShareCardText>
            {equivalent.tail !== "" && (
              <ShareCardText size={15} align="center">
                {equivalent.tail}
              </ShareCardText>
            )}
          </>
        )}
      </View>
    </ShareCardFrame>
  );
}

interface IFrozen {
  seed: number;
  photo?: string;
}

const page = "run";

export function RunShareCard(props: { run: IRun }): JSX.Element {
  const [photo, setPhoto] = useState<string>();
  const [seed, setSeed] = useState(0);
  const exporter = useShareCardExport<IFrozen>("bebear-run");
  const { width } = useWindowDimensions();
  const previewScale = Math.min(0.86, (width - 32) / T.width);
  const frozen = exporter.job.frozen;
  const { prepare } = exporter;
  useEffect(() => {
    if (ShareCardImage_prepareAhead) {
      prepare([page], { seed, photo }, photo);
    }
  }, [props.run, seed, photo]);
  const pickPhoto = async (): Promise<void> => {
    try {
      setPhoto(await ProgressPhotoPick_pick("photo-library"));
    } catch {
      Dialog_alert("Could not open that photo. Try another photo.");
    }
  };
  return (
    <View className="mt-6" testID="run-share-card">
      <Text className="mb-3 text-lg font-semibold">Story card</Text>
      <View className="items-center" style={{ height: T.height * previewScale }}>
        <View style={{ transform: [{ scale: previewScale }], transformOrigin: "top center" }}>
          <RunStoryCard run={props.run} photo={photo} seed={seed} />
        </View>
      </View>
      <View className="flex-row mt-3" style={{ gap: 8 }}>
        <Button
          name="run-share-photo"
          kind="pill-outline"
          className="flex-1"
          disabled={exporter.isBusy}
          onPress={pickPhoto}
        >
          {photo == null ? "Add photo" : "Change photo"}
        </Button>
        <Button
          name="run-share-shuffle"
          kind="pill-outline"
          className="flex-1"
          disabled={exporter.isBusy}
          onPress={() => setSeed((value) => value + 1)}
        >
          Shuffle
        </Button>
      </View>
      <View className="flex-row mt-3">
        <Button
          name="run-share"
          kind="pill"
          className="flex-1"
          disabled={exporter.isBusy}
          onPress={() => exporter.share([page], { seed, photo }, photo)}
        >
          {exporter.title("Share run")}
        </Button>
      </View>
      {exporter.job.error != null && <Text className="mt-2 text-sm text-text-error">{exporter.job.error}</Text>}
      {frozen != null && exporter.needsSurface && (
        <ShareCardExportSurface
          key={exporter.job.id}
          pages={exporter.job.pages}
          setRef={exporter.setRef}
          onLayout={exporter.onLayout}
          renderPage={() => (
            <RunStoryCard run={props.run} photo={frozen.photo} seed={frozen.seed} onPhotoLoad={exporter.onPhotoLoad} />
          )}
        />
      )}
    </View>
  );
}
