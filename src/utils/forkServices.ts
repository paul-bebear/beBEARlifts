export function ForkServices_plan(
  offline: boolean,
  premiumUnlocked = false
): {
  rollbar: boolean;
  analytics: boolean;
  telemetry: boolean;
  push: boolean;
  serverStartup: boolean;
  storeKit: boolean;
  universalLinks: boolean;
  ota: boolean;
  upstreamLogin: boolean;
} {
  return {
    rollbar: !offline,
    analytics: !offline,
    telemetry: !offline,
    push: !offline,
    serverStartup: !offline,
    storeKit: !offline && !premiumUnlocked,
    universalLinks: !offline,
    ota: !offline,
    upstreamLogin: !offline,
  };
}

export function ForkServices_hosts(
  offline: boolean,
  local: boolean,
  webHost: string,
  apiHost: string
): { host: string; apiHost: string } {
  if (offline) {
    return { host: "https://lifts.paulbebear.com", apiHost: "https://lifts.paulbebear.com" };
  }
  return local
    ? { host: webHost, apiHost }
    : { host: "https://www.liftosaur.com", apiHost: "https://api3.liftosaur.com" };
}
