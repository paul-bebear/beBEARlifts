import { JSX } from "react";
import { Pressable, View } from "react-native";
import { CubNumber_label } from "../models/cubNumber";
import { Text } from "./primitives/text";
import { CubCard, ICubCardData } from "./shareCards/cubCard";
import { ShareCardExportSurface } from "./shareCards/shareCardExportSurface";
import { ShareCardTheme as T } from "./shareCards/shareCardTheme";
import { useShareCardExport } from "./shareCards/useShareCardExport";

const sharePage = "cub";
const previewScale = 0.5;

export function CubShare(props: { data: ICubCardData }): JSX.Element {
  const exporter = useShareCardExport<ICubCardData>("bebear-cub");
  const frozen = exporter.job.frozen;
  return (
    <View className="items-center" style={{ gap: 12 }} testID="cub-share" data-testid="cub-share">
      <View
        style={{
          width: T.width * previewScale,
          height: T.height * previewScale,
          borderRadius: 16,
          overflow: "hidden",
        }}
        accessibilityLabel={`Your cub card: ${CubNumber_label(props.data.number)}`}
      >
        <View style={{ transform: [{ scale: previewScale }], transformOrigin: "top left" }}>
          <CubCard data={props.data} />
        </View>
      </View>
      <Pressable
        testID="cub-share-button"
        data-testid="cub-share-button"
        accessibilityRole="button"
        disabled={exporter.isBusy}
        onPress={() => exporter.share([sharePage], props.data)}
        className="items-center px-8 py-3 rounded-full"
        style={{ backgroundColor: T.honey, opacity: exporter.isBusy ? 0.5 : 1 }}
      >
        <Text className="text-base font-semibold" style={{ color: T.greenDark }}>
          {exporter.title("Share")}
        </Text>
      </Pressable>
      {exporter.job.error != null && <Text className="text-sm text-center">{exporter.job.error}</Text>}
      {frozen != null && exporter.needsSurface && (
        <ShareCardExportSurface
          key={exporter.job.id}
          pages={exporter.job.pages}
          setRef={exporter.setRef}
          onLayout={exporter.onLayout}
          renderPage={() => <CubCard data={frozen} />}
        />
      )}
    </View>
  );
}
