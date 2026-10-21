import { JSX, useEffect } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import { useTrackedState, useTrackedDispatch, untrack } from "../TrackedStateContext";
import { buildNavCommon } from "../utils";
import { ProgramHistoryView } from "../../components/programHistory";
import { ChooseProgramView } from "../../components/chooseProgram";
import { Program_getProgram } from "../../models/program";
import { useScreenPerf } from "../../utils/useScreenPerf";
import { ImagePreloader_preload } from "../../utils/imagePreloader";
import { OnboardingChat } from "../../components/onboardingChat";
import { Invite_surface } from "../../models/invite";
import { OfflineOnly_isEnabled } from "../../utils/offlineOnly";

const subscriptionImages = ["/images/subscriptionhero.png"];

export function NavScreenMain(): JSX.Element {
  const state = useTrackedState();
  const dispatch = useTrackedDispatch();
  useScreenPerf("main");

  useEffect(() => {
    for (const path of subscriptionImages) {
      ImagePreloader_preload(path);
    }
  }, []);
  const navCommon = untrack(buildNavCommon(state));
  const route = useRoute<{ key: string; name: "main"; params?: { historyRecordId?: number } }>();
  const ongoingProgress = untrack(state.storage.progress?.[0]);
  const currentProgram = untrack(
    state.storage.currentProgramId != null ? Program_getProgram(state, state.storage.currentProgramId) : undefined
  );
  const insets = useSafeAreaInsets();
  const showChat =
    Invite_surface({
      offline: OfflineOnly_isEnabled(),
      standalone: true,
      historyCount: state.storage.history.length,
      programCount: state.storage.programs.length,
    }) === "chat";

  if (currentProgram == null) {
    return (
      <View className="flex-1 bg-background-default" style={{ paddingTop: insets.top }}>
        <OnboardingHome enabled={showChat} dispatch={dispatch}>
          <ChooseProgramView
            navCommon={navCommon}
            settings={untrack(state.storage.settings)}
            dispatch={dispatch}
            progress={ongoingProgress}
            programs={untrack(state.programs || [])}
            programsIndex={untrack(state.programsIndex || [])}
            customPrograms={untrack(state.storage.programs || [])}
            editProgramId={ongoingProgress?.programId}
            hasBottomNav={true}
          />
        </OnboardingHome>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-default" style={{ paddingTop: insets.top }}>
      <ProgramHistoryView
        progress={ongoingProgress}
        navCommon={navCommon}
        program={currentProgram}
        settings={untrack(state.storage.settings)}
        history={untrack(state.storage.history)}
        subscription={untrack(state.storage.subscription)}
        dispatch={dispatch}
        initialHistoryRecordId={route.params?.historyRecordId}
      />
    </View>
  );
}

function OnboardingHome(props: {
  enabled: boolean;
  dispatch: Parameters<typeof OnboardingChat>[0]["dispatch"];
  children: JSX.Element;
}): JSX.Element {
  return props.enabled ? <OnboardingChat dispatch={props.dispatch}>{props.children}</OnboardingChat> : props.children;
}
