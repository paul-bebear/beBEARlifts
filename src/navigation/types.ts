import type { NavigatorScreenParams } from "@react-navigation/native";
import type {
  IDayData,
  IEquipment,
  IExerciseType,
  IHistoryRecord,
  IScreenMuscle,
  IShortDayData,
  IStatsKey,
} from "../types";
import type { IHelpKey } from "../components/help/helpRegistry";
import type { IFoodMeal } from "../models/foodLog";

export type IHomeStackParamList = {
  main: { historyRecordId?: number } | undefined;
  progress: { id?: number } | undefined;
  exerciseStats: undefined;
};

export type IOnboardingStackParamList = {
  first: undefined;
  units: undefined;
  setupequipment: undefined;
  setupplates: undefined;
  hearaboutus: undefined;
  programselect: undefined;
  programs: undefined;
  programPreview: undefined;
  onerms: undefined;
};

export type IProgramStackParamList = {
  programs: undefined;
  editProgram: { programId: string };
  onerms: undefined;
  programselect: undefined;
  programPreview: undefined;
  exerciseStats: undefined;
};

export type IWorkoutStackParamList = {
  progress: { id?: number } | undefined;
  finishDay: { id: number } | undefined;
  music: undefined;
  reports: undefined;
  muscles: undefined;
  exerciseStats: undefined;
};

// The Progress tab lives on the graphs stack and opens the Me screens on top of itself, so they get a back arrow.
export type IGraphsStackParamList = IMeStackParamList & {
  progressDashboard: undefined;
  programselect: undefined;
  music: undefined;
  reports: undefined;
  bodyScans: undefined;
  runs: undefined;
  goalWizard: IGoalWizardScreenParams | undefined;
  steps: undefined;
  progressPhotos: undefined;
  streak: undefined;
  graphsList: undefined;
};

export type IFriendsStackParamList = {
  friends: undefined;
};

export type IFoodStackParamList = {
  food: undefined;
  foodAdd: IFoodAddScreenParams;
};

export type IMeStackParamList = {
  settings: undefined;
  account: undefined;
  timers: undefined;
  plates: undefined;
  gyms: undefined;
  exercises: undefined;
  appleHealth: undefined;
  googleHealth: undefined;
  muscleGroups: undefined;
  stats: undefined;
  measurements: { key: IStatsKey } | undefined;
  sleepNutrition: undefined;
  exerciseStats: undefined;
  apiKeys: undefined;
  recentImports: undefined;
  importPreview: undefined;
  programs: undefined;
  programPreview: undefined;
  progress: { id?: number } | undefined;
  onerms: undefined;
  editProgram: { programId: string };
};

export type IRootTabParamList = {
  home: NavigatorScreenParams<IHomeStackParamList>;
  friends: NavigatorScreenParams<IFriendsStackParamList>;
  program: NavigatorScreenParams<IProgramStackParamList>;
  workout: NavigatorScreenParams<IWorkoutStackParamList>;
  food: NavigatorScreenParams<IFoodStackParamList>;
  graphs: NavigatorScreenParams<IGraphsStackParamList>;
  me: NavigatorScreenParams<IMeStackParamList>;
};

export type IRootStackParamList = {
  onboarding: NavigatorScreenParams<IOnboardingStackParamList>;
  mainTabs: NavigatorScreenParams<IRootTabParamList>;
  subscription: undefined;
  exerciseLiftoEditorModal:
    | { programId: string; key: string; dayData: Required<IDayData>; fromWorkout?: boolean }
    | undefined;
  // The absolute day number, not week/dayInWeek — the same thing a workout carries, and the
  // sheet resolves the planner indices from it so they can't go stale.
  dayLiftoEditorModal: { programId: string; day: number; fromWorkout?: boolean } | undefined;
  liftoEditorExercisePickerModal: undefined;
  amrapModal: NonNullable<IHistoryRecord["amrapModal"]> &
    ({ context: "workout"; progressId: number } | { context: "playground"; weekIndex: number; dayIndex: number });
  exercisePickerModal: { progressId: number };
  editProgramExercisePickerModal: {
    programId: string;
    dayData: IShortDayData;
    change: "one" | "all" | "duplicate" | "variationAdd" | "variationEdit";
    variationIndex?: number;
    exerciseKey?: string;
  };
  editSetTargetModal:
    | { context: "workout"; progressId: number }
    | { context: "playground"; weekIndex: number; dayIndex: number };
  setTimerModal:
    | { context: "workout"; progressId: number }
    | { context: "playground"; weekIndex: number; dayIndex: number };
  setTimerEditModal:
    | { context: "workout"; progressId: number }
    | { context: "playground"; weekIndex: number; dayIndex: number };
  roundingInfoModal:
    | { context: "workout"; progressId: number }
    | { context: "playground"; weekIndex: number; dayIndex: number };
  dateModal: { progressId: number };
  equipmentModal: { context: "workout"; progressId: number } | { context: "preview"; programId: string };
  rm1Modal: { context: "workout"; progressId: number } | { context: "preview"; programId: string };
  supersetPickerModal: { progressId: number };
  playgroundEditModal:
    | { context: "playground"; weekIndex: number; dayIndex: number }
    | { context: "preview"; programId: string };
  couponModal: undefined;
  newGymModal: undefined;
  newEquipmentModal: undefined;
  newPlateModal: { equipment: IEquipment };
  newFixedWeightModal: { equipment: IEquipment };
  createProgramModal: { adhocProgressId?: number; adhocHistoryRecordId?: number } | undefined;
  importFromLinkModal: undefined;
  affiliateModal: undefined;
  importFromOtherAppsModal: undefined;
  dayFromAdhocModal: { progressId?: number; historyRecordId?: number };
  nextWorkoutModal: undefined;
  plusSheetModal: undefined;
  addFriendModal: undefined;
  whatsnewModal: undefined;
  signupRequestModal: undefined;
  hearAboutUsModal: undefined;
  corruptedStateModal: undefined;
  debugModal: undefined;
  workoutShareModal: { progressId: number };
  socialShareModal: { type: "igstory" | "igfeed" | "tiktok"; progressId?: number; historyRecordId?: number };
  customExerciseModal: { exerciseId?: string };
  musclesOverrideModal: { exerciseType: IExerciseType };
  tourModal: undefined;
  editProgramMenuModal: { programId: string };
  programNextDayModal: { programId: string };
  programImageExportModal: { programId: string };
  programRevisionsModal: { programId: string };
  monthCalendarModal: undefined;
  accountModal: undefined;
  emailAuthModal: { navigateHomeOnSignIn?: boolean } | undefined;
  changePasswordModal: undefined;
  subscriptionInfoModal: { type: "platesCalculator" | "graphs" | "notifications" | "weekInsights" | "watch" | "mcp" };
  weekInsightsDetailsModal: { selectedFirstDayOfWeek: number };
  setSplitModal: {
    exercises: { exerciseName: string; isSynergist: boolean; strengthSets: number; hypertrophySets: number }[];
  };
  plannerSettingsModal: { context: "programHistory" } | { context: "editProgram"; programId: string };
  editMuscleGroupsModal: { context: "programHistory" } | { context: "editProgram"; programId: string };
  weekStatsModal: { programId: string };
  dayStatsModal: { programId: string };
  exerciseStatsModal: { programId: string };
  editExerciseChangeModal: { programId: string };
  graphsModal: undefined;
  statsSettingsModal: undefined;
  programInfoModal: { programId: string; hasCustomPrograms: boolean };
  changeNextDayModal: undefined;
  inputSelectModal: undefined;
  stateVarsModal: undefined;
  // Data and result travel through ModalStateContext, not route params.
  acrossProgramModal: undefined;
  createStateVarModal: undefined;
  textInputModal: undefined;
  editDetailsModal: undefined;
  repMaxCalculatorModal: undefined;
  muscleGroupMusclePickerModal: { muscleGroup: IScreenMuscle };
  programPreviewMusclesModal: { type: "program" } | { type: "day"; dayIndex: number };
  exerciseImageSourceModal: undefined;
  exerciseImageLibraryModal: undefined;
  exerciseCloneLibraryModal: undefined;
  exerciseTypesPickerModal: undefined;
  exerciseMusclesPickerModal: undefined;
  exercisePickerSettingsModal: undefined;
  photoPickerModal: undefined;
  helpModal: { helpKey: IHelpKey };
  foodEditModal: IFoodEditModalParams;
  foodGoalsModal: undefined;
};

export type IFoodEditModalParams = { entryId: string };

export type IGoalWizardScreenParams = { mode?: "goal" | "pace" };

export type IFoodAddScreenParams = { day: string; meal: IFoodMeal; mode?: "barcode" | "photo" | "describe" | "quick" };

export type IRootLevelScreenParamList = {
  subscription: undefined;
};

export type IAllScreenParamList = IOnboardingStackParamList &
  IHomeStackParamList &
  IProgramStackParamList &
  IWorkoutStackParamList &
  IGraphsStackParamList &
  IFoodStackParamList &
  IFriendsStackParamList &
  IMeStackParamList &
  IRootLevelScreenParamList;
