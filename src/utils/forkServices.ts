import { ProgramsHost_fork } from "./programsHost";

export function ForkServices_plan(
  offline: boolean,
  premiumUnlocked = false,
  ios = false
): {
  rollbar: boolean;
  analytics: boolean;
  telemetry: boolean;
  push: boolean;
  serverStartup: boolean;
  storeKit: boolean;
  revenueCat: boolean;
  universalLinks: boolean;
  ota: boolean;
  upstreamLogin: boolean;
  appleSignIn: boolean;
  googleSignIn: boolean;
} {
  const storeKit = !offline && !premiumUnlocked;
  return {
    rollbar: !offline,
    analytics: !offline,
    telemetry: !offline,
    push: !offline,
    serverStartup: !offline,
    storeKit,
    // Upstream's react-native-iap listeners would also finish RevenueCat's transactions, so only one of the two runs.
    revenueCat: ios && !storeKit,
    universalLinks: !offline,
    ota: !offline,
    upstreamLogin: !offline,
    appleSignIn: true,
    googleSignIn: true,
  };
}

export function ForkServices_hosts(
  offline: boolean,
  local: boolean,
  webHost: string,
  apiHost: string
): { host: string; apiHost: string } {
  // Liftosaur's author asked the fork to stop calling liftosaur.com, so even the opt-in online build stays on the fork.
  return local && !offline ? { host: webHost, apiHost } : { host: ProgramsHost_fork, apiHost: ProgramsHost_fork };
}
