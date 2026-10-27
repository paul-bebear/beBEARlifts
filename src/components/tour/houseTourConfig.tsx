import { TextRaw as Text } from "../primitives/text";
import { BearHouse_objects, BearHouse_room } from "../../models/bearHouse";
import { HouseTour_canStart, HouseTour_steps } from "../../models/houseTour";
import { PlusOfferClient_isBusy } from "../../utils/plusOfferClient";
import { Program_getEvaluatedProgramFromState, Program_isEmpty } from "../../models/program";
import { Progress_getCurrentProgress } from "../../models/progress";
import { getCurrentScreenData } from "../../navigation/navigationService";
import { ITourConfig } from "./tourTypes";

const paraCn = "text-base leading-relaxed text-center text-text-secondary";
const imagePrefix = "/images/";

const dayZero = BearHouse_objects(
  "trailer",
  0,
  {
    kcal: 0,
    kcalTarget: 0,
    hasNoteToday: false,
    streak: 0,
    friendCount: 0,
    pendingRequests: 0,
    honeyEarned: 0,
    badgeCount: 0,
    isOffline: false,
  },
  undefined
);

export const houseTourConfig: ITourConfig = {
  id: "house",
  shouldStart: (state) => {
    const evaluatedProgram = Program_getEvaluatedProgramFromState(state);
    return HouseTour_canStart({
      screen: getCurrentScreenData()?.name,
      hasProgram: evaluatedProgram != null && !Program_isEmpty(evaluatedProgram),
      hasWorkoutInProgress: Progress_getCurrentProgress(state) != null,
      isOfferBusy: PlusOfferClient_isBusy(),
    });
  },
  steps: HouseTour_steps(dayZero, BearHouse_room("trailer")).map((step) => ({
    id: step.id,
    title: step.title,
    dino: step.image.slice(imagePrefix.length),
    content: () => <Text className={paraCn}>{step.line}</Text>,
  })),
};
