import { JSX, useEffect } from "react";
import { View } from "react-native";
import { AiConsent_showFeatures } from "../models/aiConsent";
import { FeedModeration_users } from "../models/feedModeration";
import { AiConsent_ensure, AiConsentStore } from "../utils/aiConsentClient";
import { BlocksStore } from "../utils/moderationStore";
import { CloudStore } from "../utils/supabaseClient";
import { FriendsClient_loadBlocks } from "../utils/friendsClient";
import { ModerationCommand_unblock } from "../utils/moderationCommand";
import { Dialog_alert } from "../utils/dialog";
import { Text } from "./primitives/text";
import { Button } from "./button";

export function AppStoreSettings(): JSX.Element {
  const consent = AiConsentStore.use();
  const userId = CloudStore.use().session?.userId;
  const blocked = FeedModeration_users(BlocksStore.use(), userId);
  useEffect(() => {
    if (userId != null) {
      FriendsClient_loadBlocks()
        .then((result) => {
          if (!result.ok) {
            Dialog_alert(result.error);
          }
        })
        .catch(() => Dialog_alert("Could not load blocked users."));
    }
  }, [userId]);
  return (
    <View className="py-4" style={{ gap: 12 }}>
      <Text className="text-base font-semibold">AI features</Text>
      <Text className="text-sm text-text-secondary">
        {consent.choice === "allowed" ? "Allowed" : "Permission required"}
      </Text>
      <Button name="settings-ai-consent" kind="lightgrayv3" onClick={() => AiConsent_ensure(true)}>
        {AiConsent_showFeatures(consent) ? "Change AI permission" : "Enable AI features"}
      </Button>
      {userId != null && (
        <>
          <Text className="text-base font-semibold">Blocked users</Text>
          {blocked.length === 0 && <Text className="text-sm text-text-secondary">No blocked users</Text>}
          {blocked.map((user) => (
            <View key={user.userId} className="flex-row items-center justify-between">
              <Text className="flex-1 text-sm">{user.displayName}</Text>
              <Button
                name={`unblock-${user.userId}`}
                kind="lightgrayv3"
                onClick={() => ModerationCommand_unblock(user)}
              >
                Unblock
              </Button>
            </View>
          ))}
        </>
      )}
    </View>
  );
}
