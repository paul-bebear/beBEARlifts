import { FeatureLayer_of, IFeature, IFeatureLayer } from "./featureLayer";
import type { ITab } from "./screen";

export type IReportsHubScreen =
  | "runs"
  | "graphsList"
  | "reports"
  | "exercises"
  | "measurements"
  | "bodyScans"
  | "music"
  | "friends"
  | "streak"
  | "steps"
  | "progressPhotos";

export type IReportsHubAction =
  | { kind: "screen"; screen: IReportsHubScreen; tab?: ITab }
  | { kind: "addFriend" }
  | { kind: "newNote"; day: string }
  | { kind: "seasons" }
  | { kind: "honey" }
  | { kind: "checkIn" };

export interface IReportsHubRow {
  id: string;
  title: string;
  subtitle: string;
  feature: IFeature;
  action: IReportsHubAction;
}

export interface IReportsHubGroup {
  id: "numbers" | "extras";
  title: string;
  layer: IFeatureLayer;
  hasStatsSections: boolean;
  rows: IReportsHubRow[];
}

export interface IReportsHubInput {
  isOffline: boolean;
  hasRunSensors: boolean;
  today: string;
}

export const ReportsHub_title = "More";

function screenRow(
  id: string,
  title: string,
  subtitle: string,
  feature: IFeature,
  screen: IReportsHubScreen,
  tab?: ITab
): IReportsHubRow {
  return { id, title, subtitle, feature, action: { kind: "screen", screen, tab } };
}

export function ReportsHub_rows(input: IReportsHubInput): IReportsHubRow[] {
  const rows: IReportsHubRow[] = [
    screenRow("graphs", "Graphs", "Lifts and body over time", "graphs", "graphsList"),
    screenRow("exercise-stats", "Exercise stats", "History for each exercise", "exerciseStats", "exercises"),
    screenRow("friends", "Friends", "The feed and your friends list", "friends", "friends", "friends"),
    {
      id: "add-friend",
      title: "Add a friend",
      subtitle: "Share your code or enter one",
      feature: "friends",
      action: { kind: "addFriend" },
    },
    {
      id: "honey",
      title: "Honey",
      subtitle: "Your balance and how you earned it",
      feature: "honey",
      action: { kind: "honey" },
    },
    screenRow("badges", "Badges and streak", "Every badge and your day streak", "badges", "streak"),
    {
      id: "notes",
      title: "New note",
      subtitle: "Write a note for today",
      feature: "notes",
      action: { kind: "newNote", day: input.today },
    },
    {
      id: "check-ins",
      title: "Check-ins",
      subtitle: "Check in today and see the trend",
      feature: "checkIn",
      action: { kind: "checkIn" },
    },
  ];
  if (input.isOffline) {
    rows.push(screenRow("music", "Workout music", "Songs from your workouts", "music", "music"));
  }
  if (input.isOffline && input.hasRunSensors) {
    rows.push(screenRow("runs", "Runs", "Start a run or see your logged runs", "runs", "runs"));
  }
  if (input.isOffline) {
    rows.push(screenRow("reports", "Workout reports", "Reports on past workouts", "reports", "reports"));
  }
  rows.push(
    screenRow("measurements", "Body measurements", "Waist, arms and more", "measurements", "measurements"),
    screenRow("body-scans", "Body composition", "Body fat and muscle from scans", "bodyScans", "bodyScans"),
    screenRow("steps", "Daily steps", "Your steps and your goal", "steps", "steps"),
    screenRow("photos", "Progress photos", "Photos of you over time", "photos", "progressPhotos"),
    {
      id: "seasons",
      title: "Seasons",
      subtitle: "Bulk in winter, lean in summer",
      feature: "seasons",
      action: { kind: "seasons" },
    }
  );
  return rows;
}

export function ReportsHub_groups(input: IReportsHubInput): IReportsHubGroup[] {
  const rows = ReportsHub_rows(input);
  return [
    {
      id: "numbers",
      title: "Your numbers",
      layer: 2,
      hasStatsSections: true,
      rows: rows.filter((row) => FeatureLayer_of(row.feature) === 2),
    },
    {
      id: "extras",
      title: "Extras",
      layer: 3,
      hasStatsSections: false,
      rows: rows.filter((row) => FeatureLayer_of(row.feature) === 3),
    },
  ];
}
