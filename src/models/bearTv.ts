import { BearArt_sprite } from "./bearArt";
import { BearScene_canvas, IBearBox, IBearRect } from "./bearScene";
import { Feed_ago, IFeedItem } from "./feed";
import { IPostBear, WorkoutPost_feedLine } from "./workoutPost";

// tv_safe_rect from images/bear/male/manifest.json, in the 1024 by 1536 art canvas. Every gym shares it.
// test/workoutFeed.test.ts reads the manifest and fails when the art moves the TV.
export const BearTv_rect: IBearRect = [875, 345, 1000, 530];

export type IBearTvScreen =
  | { kind: "empty"; text: string; label: string }
  | { kind: "post"; sprite: string; text: string; label: string };

export function BearTv_box(sceneWidth: number): IBearBox {
  const unit = sceneWidth / BearScene_canvas.width;
  const [x1, y1, x2, y2] = BearTv_rect;
  const round = (value: number): number => Math.round(value * 10) / 10;
  return {
    left: round(x1 * unit),
    top: round(y1 * unit),
    width: round((x2 - x1) * unit),
    height: round((y2 - y1) * unit),
  };
}

// A friend whose posts predate version 2 shows as a cub, the same bear every new account starts with.
export function BearTv_sprite(bear: IPostBear | undefined): string {
  return BearArt_sprite(bear?.line ?? "male", bear?.level ?? 1, bear?.mood ?? "normal");
}

export function BearTv_screen(input: {
  signedIn: boolean;
  friendCount: number;
  items: IFeedItem[];
  now: number;
}): IBearTvScreen {
  if (!input.signedIn || input.friendCount === 0) {
    return { kind: "empty", text: "No friends yet", label: "No friends yet. Open the friends screen." };
  }
  const item = input.items.find((i) => !i.isMine);
  if (item == null) {
    return { kind: "empty", text: "No posts yet", label: "No posts from friends yet. Open the feed." };
  }
  const name = item.author.displayName;
  const ago = Feed_ago(item.post.postedAt, input.now);
  const label =
    item.kind === "workout"
      ? `${name} lifted: ${WorkoutPost_feedLine(item.post.summary)}, ${ago}. Open the feed.`
      : `${name} shared a meal: ${item.post.description}, ${ago}. Open the feed.`;
  return {
    kind: "post",
    sprite: BearTv_sprite(item.bear),
    text: `${item.kind === "workout" ? "\u{1F3CB}" : "\u{1F37D}"} ${name}`,
    label,
  };
}
