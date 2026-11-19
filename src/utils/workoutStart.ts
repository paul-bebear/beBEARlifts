import { IDispatch } from "../ducks/types";
import { Thunk_startProgramDay } from "../ducks/thunks";
import { EditProgram_setNextDay } from "../models/editProgram";
import { GymBagCheck_startDay, IGymBagPlan } from "../models/gymBagCheck";
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
  const day = GymBagCheck_startDay(programId, plan);
  if (programId != null && day != null) {
    EditProgram_setNextDay(dispatch, programId, day);
  }
  dispatch(Thunk_startProgramDay());
}
