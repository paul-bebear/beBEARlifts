export type IReportsHubScreen = "runs" | "graphsList" | "reports" | "exercises";

export interface IReportsHubRow {
  id: string;
  title: string;
  subtitle: string;
  screen: IReportsHubScreen;
}

export interface IReportsHubInput {
  isOffline: boolean;
  hasRunSensors: boolean;
}

export function ReportsHub_rows(input: IReportsHubInput): IReportsHubRow[] {
  const rows: IReportsHubRow[] = [];
  if (input.isOffline && input.hasRunSensors) {
    rows.push({ id: "runs", title: "Runs", subtitle: "Your logged runs", screen: "runs" });
  }
  rows.push({ id: "graphs", title: "Graphs", subtitle: "Lifts and body over time", screen: "graphsList" });
  if (input.isOffline) {
    rows.push({ id: "reports", title: "Workout reports", subtitle: "Reports on past workouts", screen: "reports" });
  }
  rows.push({
    id: "exercise-stats",
    title: "Exercise stats",
    subtitle: "History for each exercise",
    screen: "exercises",
  });
  return rows;
}
