import { IBearBoardTarget } from "./bearBoard";
import { IBearHouseScreen, IBearHouseTarget } from "./bearHouse";
import { IQuickActionsWorkout, QuickActions_workout } from "./quickActions";
import type { ITab } from "./screen";

export type IHomeModal = "plusSheetModal" | "bearPanelModal" | "phoneSheetModal";

export type IHomeCommand =
  | { kind: "modal"; name: IHomeModal }
  | { kind: "goalWizard"; mode: "goal" | "pace"; tab: ITab }
  | { kind: "screen"; screen: "streak" | IBearHouseScreen; tab: ITab }
  | { kind: "workout"; action: IQuickActionsWorkout["action"] };

export function HomeTargets_forBoard(target: IBearBoardTarget, hasGoal: boolean): IHomeCommand {
  if (target === "goal") {
    return { kind: "goalWizard", mode: hasGoal ? "pace" : "goal", tab: "graphs" };
  }
  if (target === "streak") {
    return { kind: "screen", screen: "streak", tab: "graphs" };
  }
  return { kind: "modal", name: target === "plus" ? "plusSheetModal" : "bearPanelModal" };
}

export function HomeTargets_forHouse(
  target: IBearHouseTarget,
  isBagCheckOn: boolean,
  isOngoingProgress: boolean
): IHomeCommand {
  switch (target.kind) {
    case "plus":
      return { kind: "modal", name: "plusSheetModal" };
    case "door":
      return { kind: "workout", action: QuickActions_workout({ isOngoingProgress, isBagCheckOn }).action };
    case "bearPanel":
      return { kind: "modal", name: "bearPanelModal" };
    case "screen":
      return { kind: "screen", screen: target.screen, tab: target.tab };
    case "phone":
      return { kind: "modal", name: "phoneSheetModal" };
  }
}
