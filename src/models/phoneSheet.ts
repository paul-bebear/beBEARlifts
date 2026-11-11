import type { ITab } from "./screen";

export const PhoneSheet_feedLabel = "Beargram";

export type IPhoneSheetTarget =
  | {
      kind: "screen";
      screen: "settings" | "reportsHub" | "friends" | "music" | "progressPhotos" | "streak";
      tab?: ITab;
    }
  | { kind: "addFriend" };

export type IPhoneSheetAppId = "feed" | "music" | "photos" | "stats" | "badges" | "settings";

export interface IPhoneSheetApp {
  id: IPhoneSheetAppId;
  label: string;
  target: IPhoneSheetTarget;
  badge?: number;
}

export interface IPhoneSheetInput {
  friendCount: number;
  pendingRequests: number;
  isOffline: boolean;
  hasPendingRestore: boolean;
}

export function PhoneSheet_hasRestoreNotice(input: IPhoneSheetInput): boolean {
  return input.isOffline && input.hasPendingRestore;
}

export function PhoneSheet_apps(input: IPhoneSheetInput): IPhoneSheetApp[] {
  const hasFriends = input.friendCount > 0 || input.pendingRequests > 0;
  return [
    {
      id: "feed",
      label: PhoneSheet_feedLabel,
      target: hasFriends ? { kind: "screen", screen: "friends", tab: "friends" } : { kind: "addFriend" },
      badge: input.pendingRequests,
    },
    { id: "music", label: "Music", target: { kind: "screen", screen: "music" } },
    { id: "photos", label: "Photos", target: { kind: "screen", screen: "progressPhotos" } },
    { id: "stats", label: "Stats", target: { kind: "screen", screen: "reportsHub", tab: "graphs" } },
    { id: "badges", label: "Badges", target: { kind: "screen", screen: "streak" } },
    { id: "settings", label: "Settings", target: { kind: "screen", screen: "settings", tab: "me" } },
  ];
}
