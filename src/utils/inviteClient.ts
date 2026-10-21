import {
  IInviteCommand,
  IInviteEvent,
  Invite_check,
  Invite_fromUrl,
  Invite_isIos,
  Invite_link,
  Invite_parseHandle,
  Invite_shareText,
} from "../models/invite";
import { JsonStore_create } from "./jsonStore";
import {
  FriendsClient_accept,
  FriendsClient_find,
  FriendsClient_load,
  FriendsClient_request,
  FriendsClient_saveProfile,
} from "./friendsClient";
import { Friends_errorText } from "../models/friends";
import { ProgramsHost_fork } from "./programsHost";

interface IPendingInvite {
  handle?: string;
}

function parse(raw: unknown): IPendingInvite {
  return { handle: Invite_parseHandle((raw as IPendingInvite | undefined)?.handle) };
}

export const InviteStore = JsonStore_create<IPendingInvite>("bebear_invite", parse, () => ({}));

const openHereKey = "bebear_open_here";

export function InviteClient_isStandalone(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) {
    return true;
  }
  return typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches === true;
}

export function InviteClient_isIos(): boolean {
  return (
    typeof navigator !== "undefined" &&
    Invite_isIos(navigator.userAgent ?? "", navigator.platform ?? "", navigator.maxTouchPoints ?? 0)
  );
}

// localStorage is read before IndexedDB opens, so the guide decision does not wait for the app's storage.
export function InviteClient_openHere(): boolean {
  try {
    return window.localStorage.getItem(openHereKey) === "1";
  } catch {
    return false;
  }
}

export function InviteClient_rememberOpenHere(): void {
  try {
    window.localStorage.setItem(openHereKey, "1");
  } catch {
    // Private browsing can refuse the write. The guide then shows again on the next visit.
  }
}

export function InviteClient_current(): string | undefined {
  return typeof window === "undefined" ? undefined : Invite_fromUrl(window.location.href);
}

export async function InviteClient_save(handle: string): Promise<void> {
  const parsed = Invite_parseHandle(handle);
  if (parsed != null) {
    await InviteStore.update(() => ({ handle: parsed }));
  }
}

async function run(command: IInviteCommand): Promise<IInviteEvent> {
  switch (command.type) {
    case "check": {
      const loaded = await FriendsClient_load();
      if (!loaded.ok) {
        return { type: "failed", error: loaded.error };
      }
      const found = await FriendsClient_find(command.handle);
      if (!found.ok) {
        return { type: "failed", error: found.error };
      }
      return { type: "checked", result: Invite_check(command.handle, loaded.value, found.value) };
    }
    case "saveProfile": {
      const saved = await FriendsClient_saveProfile(command.handle, command.displayName, true);
      if (!saved.ok) {
        return { type: "failed", error: Friends_errorText(saved.error) };
      }
      await FriendsClient_load();
      return { type: "profileSaved" };
    }
    case "send": {
      const sent = await FriendsClient_request(command.handle);
      if (!sent.ok) {
        return { type: "failed", error: sent.error };
      }
      await FriendsClient_load();
      return { type: "requested", status: sent.value };
    }
    case "accept": {
      const accepted = await FriendsClient_accept(command.userId);
      if (!accepted.ok) {
        return { type: "failed", error: accepted.error };
      }
      await FriendsClient_load();
      return { type: "requested", status: "accepted" };
    }
    case "forget":
      await InviteStore.update((pending) => (pending.handle === command.handle ? {} : pending));
      return { type: "forgotten" };
  }
}

export async function InviteClient_run(command: IInviteCommand, emit: (event: IInviteEvent) => void): Promise<void> {
  try {
    emit(await run(command));
  } catch (error) {
    emit({ type: "failed", error: error instanceof Error ? error.message : "The friend request could not be sent." });
  }
}

export type IInviteShareResult = "shared" | "copied" | "cancelled" | "failed";

export async function InviteClient_share(handle: string, displayName: string): Promise<IInviteShareResult> {
  const url = Invite_link(ProgramsHost_fork, handle);
  const text = Invite_shareText(displayName);
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: "beBEAR", text, url });
      return "shared";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return "cancelled";
      }
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return "copied";
  } catch {
    return "failed";
  }
}
