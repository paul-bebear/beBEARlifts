import { IDispatch } from "../ducks/types";
import { Thunk_startProgramDay } from "../ducks/thunks";
import { EditProgram_setNextDay } from "../models/editProgram";
import { IGymBagPlan } from "../models/gymBagCheck";
import { IQuickActionsWorkout } from "../models/quickActions";
import { navigateToModal } from "../navigation/navigationService";

export function WorkoutStart_open(action: IQuickActionsWorkout["action"], dispatch: IDispatch): void {
  switch (action) {
    case "resume":
      dispatch(Thunk_startProgramDay());
      return;
    case "bagCheck":
      navigateToModal("gymBagCheckModal");
      return;
    case "pick":
      navigateToModal("nextWorkoutModal");
      return;
  }
}

export function WorkoutStart_go(dispatch: IDispatch, programId: string | undefined, plan: IGymBagPlan): void {
  if (programId != null && plan.kind === "today") {
    EditProgram_setNextDay(dispatch, programId, plan.day);
  }
  dispatch(Thunk_startProgramDay());
}
