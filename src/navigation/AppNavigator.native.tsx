import { createContext, JSX, useContext } from "react";
import { Platform } from "react-native";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import { SheetBackdropLift, SheetBackdropPresence } from "./SheetBackdropContext";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type {
  IOnboardingStackParamList,
  IHomeStackParamList,
  IProgramStackParamList,
  IWorkoutStackParamList,
  IGraphsStackParamList,
  IFoodStackParamList,
  IFriendsStackParamList,
  IMeStackParamList,
  IRootTabParamList,
  IRootStackParamList,
} from "./types";
import type { IScreen } from "../models/screen";
import { NavScreenMain } from "./screens/NavScreenHome";
import {
  NavScreenPrograms,
  NavScreenEditProgram,
  NavScreenMuscles,
  NavScreenOnerms,
  NavScreenProgramSelect,
  NavScreenProgramPreview,
} from "./screens/NavScreenProgram";
import {
  NavScreenFirst,
  NavScreenUnits,
  NavScreenSetupEquipment,
  NavScreenSetupPlates,
  NavScreenHearAboutUs,
  NavScreenProgramSelectOnboarding,
  NavScreenProgramsOnboarding,
  NavScreenProgramPreviewOnboarding,
} from "./screens/NavScreenOnboarding";
import { NavScreenProgress, NavScreenFinishDay, NavScreenSubscription } from "./screens/NavScreenWorkout";
import { NavScreenGraphs } from "./screens/NavScreenGraphs";
import { NavScreenFoodAdd } from "./screens/NavScreenFoodAdd";
import { ScreenMyBear } from "../components/screenMyBear";
import { NavScreenFood } from "./screens/NavScreenFood";
import { NavModalFoodEdit } from "./modals/NavModalFoodEdit";
import { NavModalFoodGoals } from "./modals/NavModalFoodGoals";
import { NavScreenMusic } from "./screens/NavScreenMusic";
import { NavScreenReports } from "./screens/NavScreenReports";
import { NavScreenBodyScans } from "./screens/NavScreenBodyScans";
import { NavScreenRuns } from "./screens/NavScreenRuns";
import { NavScreenGoalWizard } from "./screens/NavScreenGoalWizard";
import { NavScreenSteps } from "./screens/NavScreenSteps";
import { NavScreenProgressPhotos } from "./screens/NavScreenProgressPhotos";
import { NavScreenStreak } from "./screens/NavScreenStreak";
import { NavScreenFriends } from "./screens/NavScreenFriends";
import { OfflineOnly_isEnabled } from "../utils/offlineOnly";
import { NavModalExerciseLiftoEditor } from "./modals/NavModalExerciseLiftoEditor";
import { NavModalDayLiftoEditor } from "./modals/NavModalDayLiftoEditor";
import {
  NavScreenSettings,
  NavScreenAccount,
  NavScreenTimers,
  NavScreenPlates,
  NavScreenGyms,
  NavScreenExercises,
  NavScreenAppleHealth,
  NavScreenGoogleHealth,
  NavScreenMuscleGroups,
  NavScreenStats,
  NavScreenMeasurements,
  NavScreenSleepNutrition,
  NavScreenExerciseStats,
  NavScreenApiKeys,
  NavScreenRecentImports,
  NavScreenImportPreview,
} from "./screens/NavScreenMe";
import { Footer2Wrapper } from "./screens/NavScreenFooter2";
import { NavModalMonthCalendar } from "./modals/NavModalMonthCalendar";
import { NavModalTour } from "./modals/NavModalTour";
import { NavModalChangeNextDay } from "./modals/NavModalChangeNextDay";
import { NavModalExercisePicker } from "./modals/NavModalExercisePicker";
import { NavModalExerciseImageSource } from "./modals/NavModalExerciseImageSource";
import { NavModalExerciseImageLibrary } from "./modals/NavModalExerciseImageLibrary";
import { NavModalExerciseCloneLibrary } from "./modals/NavModalExerciseCloneLibrary";
import { NavModalCustomExercise } from "./modals/NavModalCustomExercise";
import { NavModalMusclesOverride } from "./modals/NavModalMusclesOverride";
import { NavModalExerciseTypesPicker } from "./modals/NavModalExerciseTypesPicker";
import { NavModalExerciseMusclesPicker } from "./modals/NavModalExerciseMusclesPicker";
import { NavModalExercisePickerSettings } from "./modals/NavModalExercisePickerSettings";
import { NavModalWeekInsightsDetails } from "./modals/NavModalWeekInsightsDetails";
import { NavModalSetSplit } from "./modals/NavModalSetSplit";
import { NavModalPlannerSettings } from "./modals/NavModalPlannerSettings";
import { NavModalMuscleGroupMusclePicker } from "./modals/NavModalMuscleGroupMusclePicker";
import { NavModalAccount } from "./modals/NavModalAccount";
import { NavModalEmailAuth } from "./modals/NavModalEmailAuth";
import { NavModalChangePassword } from "./modals/NavModalChangePassword";
import { NavModalCreateProgram } from "./modals/NavModalCreateProgram";
import { NavModalImportFromLink } from "./modals/NavModalImportFromLink";
import { NavModalProgramInfo } from "./modals/NavModalProgramInfo";
import { NavModalInputSelect } from "./modals/NavModalInputSelect";
import { NavModalStateVars } from "./modals/NavModalStateVars";
import { NavModalAcrossProgram } from "./modals/NavModalAcrossProgram";
import { NavModalCreateStateVar } from "./modals/NavModalCreateStateVar";
import { NavModalPlaygroundEditExercise } from "./modals/NavModalPlaygroundEditExercise";
import { NavModalProgramPreviewMuscles } from "./modals/NavModalProgramPreviewMuscles";
import { NavModalAmrap } from "./modals/NavModalAmrap";
import { NavModalNextWorkout } from "./modals/NavModalNextWorkout";
import { NavModalEditTarget } from "./modals/NavModalEditTarget";
import { NavModalSetTimer } from "./modals/NavModalSetTimer";
import { NavModalSetTimerEdit } from "./modals/NavModalSetTimerEdit";
import { NavModalRoundingInfo } from "./modals/NavModalRoundingInfo";
import { NavModalGraphs } from "./modals/NavModalGraphs";
import { NavModalStatsSettings } from "./modals/NavModalStatsSettings";
import { NavModal1RM } from "./modals/NavModal1RM";
import { NavModalRepMaxCalculator } from "./modals/NavModalRepMaxCalculator";
import { NavModalDayFromAdhoc } from "./modals/NavModalDayFromAdhoc";
import { NavModalEquipment } from "./modals/NavModalEquipment";
import { NavModalDate } from "./modals/NavModalDate";
import { NavModalWorkoutSuperset } from "./modals/NavModalWorkoutSuperset";
import { NavModalNewGym } from "./modals/NavModalNewGym";
import { NavModalNewEquipment } from "./modals/NavModalNewEquipment";
import { NavModalPlates } from "./modals/NavModalPlates";
import { NavModalNewFixedWeight } from "./modals/NavModalNewFixedWeight";
import { NavModalEditProgramMenu } from "./modals/NavModalEditProgramMenu";
import { NavModalEditProgramExercisePicker } from "./modals/NavModalEditProgramExercisePicker";
import { NavModalLiftoEditorExercisePicker } from "./modals/NavModalLiftoEditorExercisePicker";
import { NavModalProgramNextDay } from "./modals/NavModalProgramNextDay";
import { NavModalProgramRevisions } from "./modals/NavModalProgramRevisions";
import { NavModalProgramImageExport } from "./modals/NavModalProgramImageExport";
import { NavModalWeekStats } from "./modals/NavModalWeekStats";
import { NavModalDayStats } from "./modals/NavModalDayStats";
import { NavModalExerciseStats } from "./modals/NavModalExerciseStats";
import { NavModalEditExerciseChange } from "./modals/NavModalEditExerciseChange";
import { NavModalWorkoutShare } from "./modals/NavModalWorkoutShare";
import { NavModalSocialShare } from "./modals/NavModalSocialShare";
import { NavModalPhotoPicker } from "./modals/NavModalPhotoPicker";
import { NavModalHelp } from "./modals/NavModalHelp";
import { NavModalAffiliate } from "./modals/NavModalAffiliate";
import { NavModalCorruptedState } from "./modals/NavModalCorruptedState";
import { NavModalCoupon } from "./modals/NavModalCoupon";
import { NavModalDebug } from "./modals/NavModalDebug";
import { NavModalEditMuscleGroups } from "./modals/NavModalEditMuscleGroups";
import { NavModalImportFromOtherApps } from "./modals/NavModalImportFromOtherApps";
import { NavModalSignupRequest } from "./modals/NavModalSignupRequest";
import { NavModalHearAboutUs } from "./modals/NavModalHearAboutUs";
import { NavModalSubscriptionInfo } from "./modals/NavModalSubscriptionInfo";
import { NavModalTextInput } from "./modals/NavModalTextInput";
import { NavModalEditDetails } from "./modals/NavModalEditDetails";
import { NavModalWhatsnew } from "./modals/NavModalWhatsnew";
import { NavHeader } from "./NavHeader";
import { ScreenErrorBoundary } from "../components/screenErrorBoundary";

function renderScreenWithErrorBoundary(args: {
  route: { name: string };
  navigation: { canGoBack?: () => boolean; goBack?: () => void };
  children: JSX.Element;
}): JSX.Element {
  return (
    <ScreenErrorBoundary screenName={args.route.name} navigation={args.navigation}>
      {args.children}
    </ScreenErrorBoundary>
  );
}

function renderFormSheetScreen(args: {
  route: { name: string };
  navigation: { canGoBack?: () => boolean; goBack?: () => void };
  children: JSX.Element;
}): JSX.Element {
  return (
    <>
      {renderScreenWithErrorBoundary(args)}
      <SheetBackdropPresence />
    </>
  );
}

// The lift has to live inside whichever screen a sheet is presented over: Android draws its sheet
// and scrim in this same hierarchy, so an overlay any higher up would cover the sheet itself.
// react-navigation leaves the screen below the focused one unfrozen, so this keeps animating.
function renderPresentingScreen(args: {
  route: { name: string };
  navigation: { canGoBack?: () => boolean; goBack?: () => void };
  children: JSX.Element;
}): JSX.Element {
  return (
    <>
      {renderScreenWithErrorBoundary(args)}
      <SheetBackdropLift />
    </>
  );
}

const OnboardingStack = createNativeStackNavigator<IOnboardingStackParamList>();
const HomeStack = createNativeStackNavigator<IHomeStackParamList>();
const ProgramStack = createNativeStackNavigator<IProgramStackParamList>();
const WorkoutStack = createNativeStackNavigator<IWorkoutStackParamList>();
const GraphsStack = createNativeStackNavigator<IGraphsStackParamList>();
const FoodStack = createNativeStackNavigator<IFoodStackParamList>();
const FriendsStack = createNativeStackNavigator<IFriendsStackParamList>();
const MeStack = createNativeStackNavigator<IMeStackParamList>();
const Tab = createBottomTabNavigator<IRootTabParamList>();
const RootStack = createNativeStackNavigator<IRootStackParamList>();

const pushAnimation = Platform.OS === "android" ? ("ios_from_right" as const) : ("slide_from_right" as const);
const pushAnimationDuration = Platform.OS === "android" ? 350 : undefined;

const stackScreenOptions = {
  headerShown: false,
  animation: pushAnimation,
  animationDuration: pushAnimationDuration,
  freezeOnBlur: true,
};
const navHeaderScreenOptions = {
  headerShown: true,
  animation: pushAnimation,
  animationDuration: pushAnimationDuration,
  freezeOnBlur: true,
  header: NavHeader,
};

function OnboardingStackScreen(): JSX.Element {
  const initialScreen = useContext(InitialScreenContext) as keyof IOnboardingStackParamList | undefined;
  return (
    <OnboardingStack.Navigator
      screenOptions={stackScreenOptions}
      screenLayout={renderScreenWithErrorBoundary}
      initialRouteName={initialScreen || "first"}
    >
      <OnboardingStack.Screen name="first" component={NavScreenFirst} />
      <OnboardingStack.Screen name="units" component={NavScreenUnits} />
      <OnboardingStack.Screen name="setupequipment" component={NavScreenSetupEquipment} />
      <OnboardingStack.Screen name="setupplates" component={NavScreenSetupPlates} />
      <OnboardingStack.Screen
        name="hearaboutus"
        component={NavScreenHearAboutUs}
        options={{ headerShown: true, header: NavHeader }}
      />
      <OnboardingStack.Screen name="programselect" component={NavScreenProgramSelectOnboarding} />
      <OnboardingStack.Screen
        name="programs"
        component={NavScreenProgramsOnboarding}
        options={{ headerShown: true, header: NavHeader }}
      />
      <OnboardingStack.Screen
        name="programPreview"
        component={NavScreenProgramPreviewOnboarding}
        options={{ headerShown: true, header: NavHeader }}
      />
      <OnboardingStack.Screen
        name="onerms"
        component={NavScreenOnerms}
        options={{ headerShown: true, header: NavHeader }}
      />
    </OnboardingStack.Navigator>
  );
}

function HomeStackScreen(): JSX.Element {
  return (
    <HomeStack.Navigator screenOptions={stackScreenOptions} screenLayout={renderScreenWithErrorBoundary}>
      <HomeStack.Screen name="main" component={NavScreenMain} />
      <HomeStack.Screen
        name="progress"
        component={NavScreenProgress}
        getId={({ params }) => String(params?.id ?? 0)}
        options={{ headerShown: true, header: NavHeader }}
      />
      <ProgramStack.Screen
        name="exerciseStats"
        component={NavScreenExerciseStats}
        options={{ headerShown: true, header: NavHeader }}
      />
    </HomeStack.Navigator>
  );
}

function ProgramStackScreen(): JSX.Element {
  return (
    <ProgramStack.Navigator screenOptions={navHeaderScreenOptions} screenLayout={renderScreenWithErrorBoundary}>
      <ProgramStack.Screen name="programs" component={NavScreenPrograms} />
      <ProgramStack.Screen name="editProgram" component={NavScreenEditProgram} />
      <ProgramStack.Screen name="onerms" component={NavScreenOnerms} />
      <ProgramStack.Screen name="programselect" component={NavScreenProgramSelect} />
      <ProgramStack.Screen name="programPreview" component={NavScreenProgramPreview} />
      <ProgramStack.Screen name="exerciseStats" component={NavScreenExerciseStats} />
    </ProgramStack.Navigator>
  );
}

function WorkoutStackScreen(): JSX.Element {
  return (
    <WorkoutStack.Navigator screenOptions={stackScreenOptions} screenLayout={renderScreenWithErrorBoundary}>
      <WorkoutStack.Screen
        name="progress"
        component={NavScreenProgress}
        getId={({ params }) => String(params?.id ?? 0)}
        options={{ headerShown: true, header: NavHeader }}
      />
      <WorkoutStack.Screen
        name="finishDay"
        component={NavScreenFinishDay}
        options={{ headerShown: true, header: NavHeader }}
      />
      <WorkoutStack.Screen name="music" component={NavScreenMusic} options={{ headerShown: true, header: NavHeader }} />
      <WorkoutStack.Screen
        name="reports"
        component={NavScreenReports}
        options={{ headerShown: true, header: NavHeader }}
      />
      <WorkoutStack.Screen
        name="muscles"
        component={NavScreenMuscles}
        options={{ headerShown: true, header: NavHeader }}
      />
      <WorkoutStack.Screen
        name="exerciseStats"
        component={NavScreenExerciseStats}
        options={{ headerShown: true, header: NavHeader }}
      />
    </WorkoutStack.Navigator>
  );
}

function GraphsStackScreen(): JSX.Element {
  return (
    <GraphsStack.Navigator screenOptions={stackScreenOptions} screenLayout={renderScreenWithErrorBoundary}>
      <GraphsStack.Screen
        name="progressDashboard"
        component={ScreenMyBear}
        options={{ headerShown: true, header: NavHeader }}
      />
      <GraphsStack.Screen
        name="graphsList"
        component={NavScreenGraphs}
        options={{ headerShown: true, header: NavHeader }}
      />
      <GraphsStack.Group screenOptions={navHeaderScreenOptions}>
        <GraphsStack.Screen name="music" component={NavScreenMusic} />
        <GraphsStack.Screen name="reports" component={NavScreenReports} />
        <GraphsStack.Screen name="bodyScans" component={NavScreenBodyScans} />
        <GraphsStack.Screen name="runs" component={NavScreenRuns} />
        <GraphsStack.Screen name="goalWizard" component={NavScreenGoalWizard} />
        <GraphsStack.Screen name="steps" component={NavScreenSteps} />
        <GraphsStack.Screen name="progressPhotos" component={NavScreenProgressPhotos} />
        <GraphsStack.Screen name="streak" component={NavScreenStreak} />
        {OfflineOnly_isEnabled() && <GraphsStack.Screen name="programselect" component={NavScreenProgramSelect} />}
        {renderMeScreens(GraphsStack.Screen as unknown as typeof MeStack.Screen)}
      </GraphsStack.Group>
    </GraphsStack.Navigator>
  );
}

function FriendsStackScreen(): JSX.Element {
  return (
    <FriendsStack.Navigator screenOptions={navHeaderScreenOptions} screenLayout={renderScreenWithErrorBoundary}>
      <FriendsStack.Screen name="friends" component={NavScreenFriends} />
    </FriendsStack.Navigator>
  );
}

function FoodStackScreen(): JSX.Element {
  return (
    <FoodStack.Navigator screenOptions={navHeaderScreenOptions} screenLayout={renderScreenWithErrorBoundary}>
      <FoodStack.Screen name="food" component={NavScreenFood} />
      <FoodStack.Screen name="foodAdd" component={NavScreenFoodAdd} />
    </FoodStack.Navigator>
  );
}

function renderMeScreens(Screen: typeof MeStack.Screen): JSX.Element {
  return (
    <>
      <Screen name="settings" component={NavScreenSettings} />
      <Screen name="account" component={NavScreenAccount} />
      <Screen name="timers" component={NavScreenTimers} />
      <Screen name="plates" component={NavScreenPlates} />
      <Screen name="gyms" component={NavScreenGyms} />
      <Screen name="exercises" component={NavScreenExercises} />
      <Screen name="appleHealth" component={NavScreenAppleHealth} />
      <Screen name="googleHealth" component={NavScreenGoogleHealth} />
      <Screen name="muscleGroups" component={NavScreenMuscleGroups} />
      <Screen name="stats" component={NavScreenStats} />
      <Screen name="measurements" component={NavScreenMeasurements} />
      <Screen name="sleepNutrition" component={NavScreenSleepNutrition} />
      <Screen name="exerciseStats" component={NavScreenExerciseStats} />
      <Screen name="apiKeys" component={NavScreenApiKeys} />
      <Screen name="recentImports" component={NavScreenRecentImports} />
      <Screen name="importPreview" component={NavScreenImportPreview} />
      <Screen name="programs" component={NavScreenPrograms} />
      <Screen name="progress" component={NavScreenProgress} getId={({ params }) => String(params?.id ?? 0)} />
      <Screen name="onerms" component={NavScreenOnerms} />
      <Screen name="editProgram" component={NavScreenEditProgram} />
      <Screen name="programPreview" component={NavScreenProgramPreview} />
    </>
  );
}

function MeStackScreen(): JSX.Element {
  return (
    <MeStack.Navigator screenOptions={navHeaderScreenOptions} screenLayout={renderScreenWithErrorBoundary}>
      {renderMeScreens(MeStack.Screen)}
    </MeStack.Navigator>
  );
}

const tabScreenOptions = { headerShown: false };

function MainTabsScreen(): JSX.Element {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions} tabBar={(tabProps) => <Footer2Wrapper {...tabProps} />}>
      <Tab.Screen name="home" component={HomeStackScreen} />
      {OfflineOnly_isEnabled() ? (
        <Tab.Screen name="friends" component={FriendsStackScreen} />
      ) : (
        <Tab.Screen name="program" component={ProgramStackScreen} />
      )}
      <Tab.Screen name="workout" component={WorkoutStackScreen} />
      <Tab.Screen name="food" component={FoodStackScreen} />
      <Tab.Screen name="graphs" component={GraphsStackScreen} />
      <Tab.Screen name="me" component={MeStackScreen} />
    </Tab.Navigator>
  );
}

const onboardingScreens: IScreen[] = [
  "first",
  "units",
  "setupequipment",
  "setupplates",
  "hearaboutus",
  "programselect",
];

const InitialScreenContext = createContext<IScreen | undefined>(undefined);

export function AppNavigator(props: { initialScreen?: IScreen }): JSX.Element {
  const { initialScreen } = props;
  const isOnboarding = initialScreen ? onboardingScreens.includes(initialScreen) : false;
  return (
    <InitialScreenContext.Provider value={initialScreen}>
      <RootStack.Navigator
        screenOptions={{ headerShown: false, animation: "none", freezeOnBlur: true }}
        screenLayout={renderScreenWithErrorBoundary}
        initialRouteName={isOnboarding ? "onboarding" : "mainTabs"}
      >
        <RootStack.Group screenLayout={renderPresentingScreen}>
          <RootStack.Screen name="onboarding" component={OnboardingStackScreen} />
          <RootStack.Screen name="mainTabs" component={MainTabsScreen} />
          <RootStack.Screen
            name="subscription"
            component={NavScreenSubscription}
            options={{ headerShown: true, header: NavHeader }}
          />
        </RootStack.Group>
        <RootStack.Group
          screenOptions={{
            presentation: "transparentModal",
            headerShown: false,
            animation: "none",
          }}
        >
          <RootStack.Screen name="monthCalendarModal" component={NavModalMonthCalendar} />
          <RootStack.Screen name="exerciseLiftoEditorModal" component={NavModalExerciseLiftoEditor} />
          <RootStack.Screen name="dayLiftoEditorModal" component={NavModalDayLiftoEditor} />
          <RootStack.Screen name="foodEditModal" component={NavModalFoodEdit} />
          <RootStack.Screen name="foodGoalsModal" component={NavModalFoodGoals} />
          <RootStack.Screen name="programRevisionsModal" component={NavModalProgramRevisions} />
          <RootStack.Screen name="programImageExportModal" component={NavModalProgramImageExport} />
          <RootStack.Screen name="exercisePickerModal" component={NavModalExercisePicker} />
          <RootStack.Screen name="exerciseImageLibraryModal" component={NavModalExerciseImageLibrary} />
          <RootStack.Screen name="exerciseCloneLibraryModal" component={NavModalExerciseCloneLibrary} />
          <RootStack.Screen name="customExerciseModal" component={NavModalCustomExercise} />
          <RootStack.Screen name="editProgramExercisePickerModal" component={NavModalEditProgramExercisePicker} />
          <RootStack.Screen name="liftoEditorExercisePickerModal" component={NavModalLiftoEditorExercisePicker} />
          {/* Sheets that host the custom keypad. Not formSheets: that sheet takes its height when
              it is first laid out and never grows, so on Android the keypad landed below the
              bottom of the screen. These draw their own sheet, which can grow. */}
          <RootStack.Screen name="stateVarsModal" component={NavModalStateVars} />
          <RootStack.Screen name="acrossProgramModal" component={NavModalAcrossProgram} />
          <RootStack.Screen name="editSetTargetModal" component={NavModalEditTarget} />
        </RootStack.Group>
        <RootStack.Group
          screenLayout={renderFormSheetScreen}
          screenOptions={{
            presentation: "formSheet",
            headerShown: false,
            animation: "default",
            sheetAllowedDetents: "fitToContents",
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: Tailwind_semantic().background.default },
          }}
        >
          <RootStack.Screen name="weekInsightsDetailsModal" component={NavModalWeekInsightsDetails} />
          <RootStack.Screen name="setSplitModal" component={NavModalSetSplit} />
          <RootStack.Screen name="plannerSettingsModal" component={NavModalPlannerSettings} />
          <RootStack.Screen name="muscleGroupMusclePickerModal" component={NavModalMuscleGroupMusclePicker} />
          <RootStack.Screen name="accountModal" component={NavModalAccount} />
          <RootStack.Screen name="emailAuthModal" component={NavModalEmailAuth} />
          <RootStack.Screen name="changePasswordModal" component={NavModalChangePassword} />
          <RootStack.Screen name="createProgramModal" component={NavModalCreateProgram} />
          <RootStack.Screen name="importFromLinkModal" component={NavModalImportFromLink} />
          <RootStack.Screen name="programInfoModal" component={NavModalProgramInfo} />
          <RootStack.Screen name="inputSelectModal" component={NavModalInputSelect} />
          <RootStack.Screen name="createStateVarModal" component={NavModalCreateStateVar} />
          <RootStack.Screen name="playgroundEditModal" component={NavModalPlaygroundEditExercise} />
          <RootStack.Screen name="amrapModal" component={NavModalAmrap} />
          <RootStack.Screen
            name="setTimerModal"
            component={NavModalSetTimer}
            options={{ sheetAllowedDetents: "fitToContents" }}
          />
          <RootStack.Screen
            name="setTimerEditModal"
            component={NavModalSetTimerEdit}
            options={{ sheetAllowedDetents: "fitToContents" }}
          />
          <RootStack.Screen
            name="roundingInfoModal"
            component={NavModalRoundingInfo}
            options={{ sheetAllowedDetents: "fitToContents" }}
          />
          <RootStack.Screen name="programPreviewMusclesModal" component={NavModalProgramPreviewMuscles} />
          <RootStack.Screen name="nextWorkoutModal" component={NavModalNextWorkout} />
          <RootStack.Screen name="graphsModal" component={NavModalGraphs} options={{ sheetAllowedDetents: [0.9] }} />
          <RootStack.Screen name="statsSettingsModal" component={NavModalStatsSettings} />
          <RootStack.Screen name="rm1Modal" component={NavModal1RM} />
          <RootStack.Screen name="repMaxCalculatorModal" component={NavModalRepMaxCalculator} />
          <RootStack.Screen name="dayFromAdhocModal" component={NavModalDayFromAdhoc} />
          <RootStack.Screen name="equipmentModal" component={NavModalEquipment} />
          <RootStack.Screen name="dateModal" component={NavModalDate} />
          <RootStack.Screen name="supersetPickerModal" component={NavModalWorkoutSuperset} />
          <RootStack.Screen name="exerciseImageSourceModal" component={NavModalExerciseImageSource} />
          <RootStack.Screen name="exercisePickerSettingsModal" component={NavModalExercisePickerSettings} />
          <RootStack.Screen name="exerciseTypesPickerModal" component={NavModalExerciseTypesPicker} />
          <RootStack.Screen name="newGymModal" component={NavModalNewGym} />
          <RootStack.Screen name="newEquipmentModal" component={NavModalNewEquipment} />
          <RootStack.Screen name="newPlateModal" component={NavModalPlates} />
          <RootStack.Screen name="newFixedWeightModal" component={NavModalNewFixedWeight} />
          <RootStack.Screen name="exerciseMusclesPickerModal" component={NavModalExerciseMusclesPicker} />
          <RootStack.Screen name="editProgramMenuModal" component={NavModalEditProgramMenu} />
          <RootStack.Screen name="musclesOverrideModal" component={NavModalMusclesOverride} />
          <RootStack.Screen name="programNextDayModal" component={NavModalProgramNextDay} />
          <RootStack.Screen name="weekStatsModal" component={NavModalWeekStats} />
          <RootStack.Screen name="dayStatsModal" component={NavModalDayStats} />
          <RootStack.Screen name="exerciseStatsModal" component={NavModalExerciseStats} />
          <RootStack.Screen name="editExerciseChangeModal" component={NavModalEditExerciseChange} />
          <RootStack.Screen name="workoutShareModal" component={NavModalWorkoutShare} />
          <RootStack.Screen
            name="socialShareModal"
            component={NavModalSocialShare}
            options={{ sheetAllowedDetents: [0.9] }}
          />
          <RootStack.Screen name="photoPickerModal" component={NavModalPhotoPicker} />
          <RootStack.Screen name="tourModal" component={NavModalTour} />
          <RootStack.Screen name="helpModal" component={NavModalHelp} />
          <RootStack.Screen name="affiliateModal" component={NavModalAffiliate} />
          <RootStack.Screen name="couponModal" component={NavModalCoupon} />
          <RootStack.Screen name="debugModal" component={NavModalDebug} />
          <RootStack.Screen name="editMuscleGroupsModal" component={NavModalEditMuscleGroups} />
          <RootStack.Screen name="importFromOtherAppsModal" component={NavModalImportFromOtherApps} />
          <RootStack.Screen name="signupRequestModal" component={NavModalSignupRequest} />
          <RootStack.Screen name="hearAboutUsModal" component={NavModalHearAboutUs} />
          <RootStack.Screen name="subscriptionInfoModal" component={NavModalSubscriptionInfo} />
          <RootStack.Screen name="textInputModal" component={NavModalTextInput} />
          <RootStack.Screen name="editDetailsModal" component={NavModalEditDetails} />
          <RootStack.Screen
            name="whatsnewModal"
            component={NavModalWhatsnew}
            options={{ sheetAllowedDetents: [0.9] }}
          />
          <RootStack.Screen
            name="corruptedStateModal"
            component={NavModalCorruptedState}
            options={{ gestureEnabled: false }}
          />
          <RootStack.Screen name="changeNextDayModal" component={NavModalChangeNextDay} />
        </RootStack.Group>
      </RootStack.Navigator>
    </InitialScreenContext.Provider>
  );
}
