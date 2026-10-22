import { FeedModeration_reportOutcome, IBlockedUser, IReportReason } from "../models/feedModeration";
import { IFeedReportTarget } from "../models/feed";
import { FeedClient_report } from "./feedClient";
import { FriendsClient_block, FriendsClient_unblock } from "./friendsClient";
import { Dialog_alert, Dialog_confirm } from "./dialog";

export async function ModerationCommand_report(
  target: IFeedReportTarget | undefined,
  reason: IReportReason,
  note: string
): Promise<ReturnType<typeof FeedModeration_reportOutcome>> {
  try {
    return FeedModeration_reportOutcome(await FeedClient_report(target, reason, note));
  } catch {
    return FeedModeration_reportOutcome({ ok: false, error: "Could not send the report. Try again." });
  }
}

export async function ModerationCommand_block(user: IBlockedUser): Promise<void> {
  if (
    !(await Dialog_confirm(
      `Block ${user.displayName}? Their posts will disappear and your friendship will be removed.`
    ))
  ) {
    return;
  }
  try {
    const result = await FriendsClient_block(user);
    if (!result.ok) {
      Dialog_alert(result.error);
    }
  } catch {
    Dialog_alert("Could not block this user. Try again.");
  }
}

export async function ModerationCommand_unblock(user: IBlockedUser): Promise<void> {
  if (!(await Dialog_confirm(`Unblock ${user.displayName}? Add each other as friends again to see their posts.`))) {
    return;
  }
  try {
    const result = await FriendsClient_unblock(user.userId);
    if (!result.ok) {
      Dialog_alert(result.error);
    }
  } catch {
    Dialog_alert("Could not unblock this user. Try again.");
  }
}
