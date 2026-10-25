import { JSX, useEffect, useMemo, useState } from "react";
import { Image, View, useWindowDimensions } from "react-native";
import { IRun, RunLog_cardDate, RunLog_pace } from "../models/runLog";
import { RunTrack_formatDuration, RunTrack_formatKm, RunTrack_formatPaceNumber } from "../models/runTrack";
import { RunEquivalents_pick } from "../models/runEquivalents";
import { ILatLon, IRouteMap, RunRoute_forCard, RunRoute_hiddenEndsM } from "../models/runRoute";
import { RunMapSnapshot_render } from "../utils/runMapSnapshot";
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
  route: ILatLon[][];
  map?: IRouteMap;
  photo?: string;
  seed: number;
  onImageLoad?: (uri: string) => void;
}

const mapWidth = 312;
const mapHeight = 270;
const mapPadding = 24;

function Stat(props: { label: string; value: string }): JSX.Element {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <ShareCardText size={24} weight="bold">
        {props.value}
      </ShareCardText>
      <ShareCardText size={10} weight="semibold" spacing={2} style={{ opacity: 0.85 }}>
        {props.label}
      </ShareCardText>
    </View>
  );
}

function RunStoryCard(props: ICardProps): JSX.Element {
  const run = props.run;
  const photo = props.photo;
  const map = props.map;
  const equivalent = RunEquivalents_pick(run.distanceM, props.seed);
  return (
    <ShareCardFrame background={T.green}>
      {photo != null && (
        <Image
          source={{ uri: photo }}
          resizeMode="cover"
          onLoad={() => props.onImageLoad?.(photo)}
          style={{ position: "absolute", top: 0, left: 0, width: T.width, height: T.height }}
        />
      )}
      <ShareCardScrim edge="top" height={320} opacity={photo != null ? 0.75 : 0.3} />
      <ShareCardScrim edge="bottom" height={260} opacity={photo != null ? 0.85 : 0.3} />
      <View style={{ alignItems: "center", paddingTop: 22, paddingHorizontal: 24 }}>
        <ShareCardBrand size={28} color={T.cream} faceColor={T.green} />
        <ShareCardText size={13} weight="semibold" style={{ marginTop: 4, opacity: 0.85 }}>
          {RunLog_cardDate(run.startedAt)}
        </ShareCardText>
        <ShareCardText size={64} weight="bold" style={{ marginTop: 6 }}>
          {RunTrack_formatKm(run.distanceM)}
          <ShareCardText size={24} weight="bold">
            {" km"}
          </ShareCardText>
        </ShareCardText>
        <View style={{ flexDirection: "row", width: "100%" }}>
          <Stat label="MOVING TIME" value={RunTrack_formatDuration(run.movingMs)} />
          <Stat label="PACE /KM" value={RunTrack_formatPaceNumber(RunLog_pace(run))} />
          <Stat label="CLIMB" value={`${run.elevationGainM} m`} />
        </View>
        <View
          style={{
            width: mapWidth,
            height: mapHeight,
            marginTop: 14,
            borderRadius: 18,
            overflow: "hidden",
            backgroundColor: T.greenDark,
          }}
        >
          {map != null && (
            <Image
              source={{ uri: map.uri }}
              onLoad={() => props.onImageLoad?.(map.uri)}
              style={{ position: "absolute", top: 0, left: 0, width: mapWidth, height: mapHeight }}
            />
          )}
          <RunRouteSvg
            route={props.route}
            drawing={map?.drawing}
            width={mapWidth}
            height={mapHeight}
            color={T.honey}
            lineWidth={6}
            outline="rgba(0, 0, 0, 0.45)"
          />
        </View>
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
  route: ILatLon[][];
  map?: IRouteMap;
}

const page = "run";

export function RunShareCard(props: { run: IRun }): JSX.Element {
  const [photo, setPhoto] = useState<string>();
  const [seed, setSeed] = useState(0);
  const [hideEnds, setHideEnds] = useState(false);
  const [map, setMap] = useState<IRouteMap>();
  const exporter = useShareCardExport<IFrozen>("bebear-run");
  const { width } = useWindowDimensions();
  const previewScale = Math.min(0.86, (width - 32) / T.width);
  const frozen = exporter.job.frozen;
  const { prepare } = exporter;
  const route = useMemo(() => RunRoute_forCard(props.run.route, hideEnds), [props.run.route, hideEnds]);
  const images = [photo, map?.uri].filter((uri): uri is string => uri != null);
  const current: IFrozen = { seed, photo, route, map };
  useEffect(() => {
    let active = true;
    setMap(undefined);
    RunMapSnapshot_render(route, mapWidth, mapHeight, mapPadding).then((next) => {
      if (active) {
        setMap(next);
      }
    });
    return () => {
      active = false;
    };
  }, [route]);
  useEffect(() => {
    if (ShareCardImage_prepareAhead) {
      prepare([page], current, images);
    }
  }, [props.run, seed, photo, route, map]);
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
          <RunStoryCard run={props.run} route={route} map={map} photo={photo} seed={seed} />
        </View>
      </View>
      <Text className="mt-3 mb-2 text-sm text-text-secondary">Start and finish on the card</Text>
      <View className="flex-row" style={{ gap: 8 }}>
        <Button
          name="run-share-ends-recorded"
          kind={hideEnds ? "pill-outline" : "pill"}
          className="flex-1"
          disabled={exporter.isBusy}
          onPress={() => setHideEnds(false)}
        >
          As recorded
        </Button>
        <Button
          name="run-share-ends-hidden"
          kind={hideEnds ? "pill" : "pill-outline"}
          className="flex-1"
          disabled={exporter.isBusy}
          onPress={() => setHideEnds(true)}
        >
          {`Hide ${RunRoute_hiddenEndsM} m`}
        </Button>
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
          onPress={() => exporter.share([page], current, images)}
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
            <RunStoryCard
              run={props.run}
              route={frozen.route}
              map={frozen.map}
              photo={frozen.photo}
              seed={frozen.seed}
              onImageLoad={exporter.onImageLoad}
            />
          )}
        />
      )}
    </View>
  );
}
