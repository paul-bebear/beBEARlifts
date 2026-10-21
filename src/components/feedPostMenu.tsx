import { JSX, useState } from "react";
import { Pressable, View } from "react-native";
import { IFeedItem } from "../models/feed";
import { FeedModeration_menu, FeedModeration_reasons, IPostMenuItem, IReportReason } from "../models/feedModeration";
import { ModerationCommand_block, ModerationCommand_report } from "../utils/moderationCommand";
import { Text } from "./primitives/text";
import { TextInput } from "./primitives/textInput";
import { Button } from "./button";

export function FeedPostMenu(props: { item: IFeedItem }): JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<IReportReason>("spam");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const items = FeedModeration_menu(props.item);
  const actions: Record<IPostMenuItem, () => void> = {
    "Report post": () => setReporting(true),
    "Block user": async () => {
      setBusy(true);
      await ModerationCommand_block(props.item.author);
      setBusy(false);
    },
  };
  if (items.length === 0) {
    return null;
  }
  return (
    <View className="mt-2">
      <Pressable accessibilityLabel="Post options" onPress={() => setOpen(!open)} testID="feed-post-menu">
        <Text className="text-xl text-text-link">⋯</Text>
      </Pressable>
      {open &&
        items.map((item) => (
          <Button key={item} name={`feed-${item}`} kind="lightgrayv3" disabled={busy} onClick={actions[item]}>
            {item}
          </Button>
        ))}
      {open && reporting && (
        <View style={{ gap: 8 }}>
          <Text className="text-sm font-semibold">Report post</Text>
          <View className="flex-row" style={{ gap: 8 }}>
            {FeedModeration_reasons.map((r) => (
              <Button
                key={r}
                name={`report-reason-${r}`}
                kind={reason === r ? "purple" : "lightgrayv3"}
                disabled={busy}
                onClick={() => setReason(r)}
              >
                {r}
              </Button>
            ))}
          </View>
          <TextInput
            accessibilityLabel="Report note (optional)"
            placeholder="Note (optional)"
            value={note}
            maxLength={2000}
            editable={!busy}
            onChangeText={setNote}
            className="p-3 border rounded-lg border-border-neutral text-text-primary"
          />
          <Button
            name="report-submit"
            kind="purple"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const outcome = await ModerationCommand_report(props.item.post.id, reason, note);
              setMessage(outcome.message);
              setOpen(outcome.keepOpen);
              setReporting(outcome.keepOpen);
              setBusy(false);
            }}
          >
            Send report
          </Button>
        </View>
      )}
      {message != null && (
        <Text className="mt-2 text-sm" accessibilityLiveRegion="polite">
          {message}
        </Text>
      )}
    </View>
  );
}
