import { JSX } from "react";
import { Modal, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "./primitives/text";
import { BadgeCoin } from "./badgeCoin";
import { Confetti } from "./confetti";
import { BadgeCard } from "./shareCards/badgeCard";
import { ShareCardExportSurface } from "./shareCards/shareCardExportSurface";
import { ShareCardTheme as T } from "./shareCards/shareCardTheme";
import { useShareCardExport } from "./shareCards/useShareCardExport";
import { IBearBadgeInfo } from "../models/bearBadges";

interface IProps {
  badge: IBearBadgeInfo;
  onClose: () => void;
  onViewAll: () => void;
}

const sharePage = "badge";

export function BadgeUnlockedSheet(props: IProps): JSX.Element {
  const { badge } = props;
  const exporter = useShareCardExport<IBearBadgeInfo>("bebear-badge");
  const frozen = exporter.job.frozen;
  return (
    <Modal visible={true} animationType="fade" presentationStyle="fullScreen" onRequestClose={props.onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: T.green }} testID="badge-unlocked" data-testid="badge-unlocked">
        <View className="items-end px-4 pt-2">
          <Pressable
            testID="badge-unlocked-close"
            data-testid="badge-unlocked-close"
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={props.onClose}
            className="items-center justify-center rounded-full"
            style={{ width: 40, height: 40 }}
          >
            <Text className="text-xl" style={{ color: T.cream }}>
              ✕
            </Text>
          </Pressable>
        </View>
        <View className="items-center justify-center flex-1 px-6">
          <BadgeCoin info={badge} isEarned={true} size={200} testID="badge-unlocked-coin" />
          <Text className="mt-8 text-sm font-bold tracking-widest uppercase" style={{ color: T.honey }}>
            Badge unlocked
          </Text>
          <Text
            className="mt-2 text-3xl font-bold text-center"
            style={{ color: T.cream }}
            testID="badge-unlocked-name"
            data-testid="badge-unlocked-name"
          >
            {badge.name}
          </Text>
          <Text className="mt-2 text-base text-center" style={{ color: T.cream }}>
            {badge.description}
          </Text>
        </View>
        <View className="px-6 pb-4">
          <Pressable
            testID="badge-unlocked-share"
            data-testid="badge-unlocked-share"
            accessibilityRole="button"
            disabled={exporter.isBusy}
            onPress={() => exporter.share([sharePage], badge)}
            className="items-center py-4 rounded-full"
            style={{ backgroundColor: T.honey, opacity: exporter.isBusy ? 0.5 : 1 }}
          >
            <Text className="text-base font-semibold" style={{ color: T.greenDark }}>
              {exporter.title("Share your badge")}
            </Text>
          </Pressable>
          <Pressable
            testID="badge-unlocked-view-all"
            data-testid="badge-unlocked-view-all"
            accessibilityRole="button"
            onPress={props.onViewAll}
            className="items-center py-4 mt-3 border rounded-full"
            style={{ borderColor: T.cream }}
          >
            <Text className="text-base font-semibold" style={{ color: T.cream }}>
              View all badges
            </Text>
          </Pressable>
          {exporter.job.error != null && (
            <Text className="mt-2 text-sm text-center" style={{ color: T.honey }}>
              {exporter.job.error}
            </Text>
          )}
        </View>
        <Confetti />
        {frozen != null && exporter.needsSurface && (
          <ShareCardExportSurface
            key={exporter.job.id}
            pages={exporter.job.pages}
            setRef={exporter.setRef}
            onLayout={exporter.onLayout}
            renderPage={() => <BadgeCard info={frozen} />}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
