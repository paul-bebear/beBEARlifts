import { AppState } from "react-native";
import { AccountPlanClient_clear, AccountPlanClient_sync, AccountPlanStore } from "./accountPlanClient";
import { Purchases_configure, Purchases_identify, Purchases_isAvailable } from "./purchases";
import { CloudStore } from "./supabaseClient";

export function PlanFollowsSignIn_start(): () => void {
  const purchases = Purchases_isAvailable();
  let lastUserId: string | undefined;
  let started = false;
  const onUserIdChange = (userId: string | undefined): void => {
    if (started && userId === lastUserId) {
      return;
    }
    const firstRun = !started;
    started = true;
    lastUserId = userId;
    if (purchases && firstRun) {
      Purchases_configure(userId);
    } else if (purchases) {
      Purchases_identify(userId);
    }
    (userId == null ? AccountPlanClient_clear() : AccountPlanClient_sync()).catch(() => undefined);
  };
  CloudStore.load()
    .then((cloud) => onUserIdChange(cloud.session?.userId))
    .catch(() => undefined);
  const unsubscribe = CloudStore.subscribe((cloud) => started && onUserIdChange(cloud.session?.userId));
  const appState = AppState.addEventListener("change", (next) => {
    if (next === "active" && AccountPlanStore.get().status === "activating") {
      AccountPlanClient_sync().catch(() => undefined);
    }
  });
  return () => {
    unsubscribe();
    appState.remove();
  };
}
