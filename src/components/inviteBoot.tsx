import { createRoot } from "react-dom/client";
import { Invite_fromUrl, Invite_surface } from "../models/invite";
import { InviteGuide } from "./inviteGuide";
import {
  InviteClient_isIos,
  InviteClient_isStandalone,
  InviteClient_openHere,
  InviteClient_rememberOpenHere,
} from "../utils/inviteClient";
import { OfflineOnly_isEnabled } from "../utils/offlineOnly";

export function InviteBoot_start(load: () => unknown): void {
  const surface = Invite_surface({
    offline: OfflineOnly_isEnabled(),
    standalone: InviteClient_isStandalone(),
    openHere: InviteClient_openHere(),
    historyCount: 0,
    programCount: 0,
  });
  if (surface !== "guide") {
    load();
    return;
  }
  const root = createRoot(document.getElementById("app")!);
  const openHere = (): void => {
    InviteClient_rememberOpenHere();
    root.unmount();
    load();
  };
  root.render(
    <InviteGuide handle={Invite_fromUrl(window.location.href)} isIos={InviteClient_isIos()} onOpenHere={openHere} />
  );
}
