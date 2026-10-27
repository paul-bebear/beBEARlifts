import { ReportsHub_title } from "./reportsHub";

export type IPhoneSheetTarget =
  | { kind: "screen"; screen: "settings"; tab: "me" }
  | { kind: "screen"; screen: "reportsHub"; tab: "graphs" }
  | { kind: "screen"; screen: "friends"; tab: "friends" }
  | { kind: "addFriend" }
  | { kind: "restore" };

export interface IPhoneSheetRow {
  id: "restore" | "settings" | "more" | "friends";
  title: string;
  subtitle: string;
  target: IPhoneSheetTarget;
}

export interface IPhoneSheetInput {
  friendCount: number;
  isOffline: boolean;
  hasPendingRestore: boolean;
}

// The phone on the dock holds what left the home screen: Settings, the reports list and friends. A pending cloud
// restore goes first, because the offline build has no other place that shows it.
export function PhoneSheet_rows(input: IPhoneSheetInput): IPhoneSheetRow[] {
  const restore: IPhoneSheetRow[] =
    input.isOffline && input.hasPendingRestore
      ? [{ id: "restore", title: "Cloud backup", subtitle: "Pick which data to keep", target: { kind: "restore" } }]
      : [];
  const hasFriends = input.friendCount > 0;
  return [
    ...restore,
    {
      id: "settings",
      title: "Settings",
      subtitle: "Units, account and plates",
      target: { kind: "screen", screen: "settings", tab: "me" },
    },
    {
      id: "more",
      title: ReportsHub_title,
      subtitle: "Graphs, honey, badges and more",
      target: { kind: "screen", screen: "reportsHub", tab: "graphs" },
    },
    {
      id: "friends",
      title: "Friends",
      subtitle: hasFriends
        ? `${input.friendCount} ${input.friendCount === 1 ? "friend" : "friends"}`
        : "Add a friend to see their workouts",
      target: hasFriends ? { kind: "screen", screen: "friends", tab: "friends" } : { kind: "addFriend" },
    },
  ];
}
