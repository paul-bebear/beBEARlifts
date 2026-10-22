import {
  Friends_displayNameError,
  Friends_handleError,
  Friends_normalizeHandle,
  IFriendStatus,
  IFriendsState,
} from "./friends";
import { IFoundProfile } from "./friendsForm";

export function Invite_parseHandle(value: unknown): string | undefined {
  return typeof value === "string" && /^[a-z0-9_]{3,20}$/.test(value) ? value : undefined;
}

export function Invite_fromUrl(url: string): string | undefined {
  try {
    const values = new URL(url).searchParams.getAll("invite");
    return values.length === 1 ? Invite_parseHandle(values[0]) : undefined;
  } catch {
    return undefined;
  }
}

export function Invite_link(origin: string, handle: string): string {
  return `${origin}/app/?invite=${encodeURIComponent(handle)}`;
}

export function Invite_shareText(displayName: string): string {
  return `Train with ${displayName} on beBEAR. Open this link in Safari on your iPhone and add it to your Home Screen.`;
}

export function Invite_shareMessage(result: "shared" | "copied" | "cancelled" | "failed"): string | undefined {
  switch (result) {
    case "copied":
      return "Invite link copied. Paste it in a message to your friend.";
    case "failed":
      return "Could not share the link. Your friend can type your handle in Friends instead.";
    default:
      return undefined;
  }
}

// Safari and the Home Screen app keep separate storage, so a page that is not the installed app shows the
// install guide first. A visitor who taps "Open here anyway" keeps using this browser.
export function Invite_surface(input: {
  offline: boolean;
  standalone: boolean;
  openHere?: boolean;
  handle?: string;
  historyCount: number;
  programCount: number;
}): "guide" | "chat" | "app" {
  if (!input.offline) {
    return "app";
  }
  if (!input.standalone && !input.openHere) {
    return "guide";
  }
  return input.historyCount === 0 && input.programCount === 0 ? "chat" : "app";
}

export function Invite_isIos(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

export interface IInviter extends IFoundProfile {
  userId?: string;
}

export type IInviteCheck =
  | { kind: "notFound" }
  | { kind: "nothingToDo" }
  | { kind: "incoming"; inviter: IInviter }
  | { kind: "needsProfile"; inviter: IInviter }
  | { kind: "confirm"; inviter: IInviter };

// The invite never accepts a request on its own. request_friend accepts a pending request from the other
// side, so an incoming request goes to an explicit Accept tap instead of a send.
export function Invite_check(handle: string, friends: IFriendsState, found: IFoundProfile | undefined): IInviteCheck {
  if (found == null) {
    return { kind: "notFound" };
  }
  if (friends.me?.handle === found.handle) {
    return { kind: "nothingToDo" };
  }
  const link = friends.links.find((l) => l.other.handle === found.handle);
  if (link != null && (link.status === "accepted" || !link.incoming)) {
    return { kind: "nothingToDo" };
  }
  if (link != null) {
    return { kind: "incoming", inviter: { ...found, userId: link.other.userId } };
  }
  return friends.me == null ? { kind: "needsProfile", inviter: found } : { kind: "confirm", inviter: found };
}

export type IInviteStep = "idle" | "checking" | "profile" | "confirm" | "incoming" | "done" | "notFound" | "failed";

export type IInviteCommand =
  | { type: "check"; handle: string }
  | { type: "saveProfile"; handle: string; displayName: string }
  | { type: "send"; handle: string }
  | { type: "accept"; userId: string }
  | { type: "forget"; handle: string };

export interface IInviteFlow {
  step: IInviteStep;
  pending?: string;
  signedIn: boolean;
  hidden: boolean;
  inviter?: IInviter;
  myHandle: string;
  myName: string;
  status?: IFriendStatus;
  canRetry?: boolean;
  command?: IInviteCommand;
  error?: string;
}

export type IInviteEvent =
  | { type: "pending"; handle?: string; signedIn: boolean }
  | { type: "checked"; result: IInviteCheck }
  | { type: "myHandle" | "myName"; value: string }
  | { type: "saveProfile" | "send" | "accept" | "notNow" | "close" | "retry" | "later" }
  | { type: "profileSaved" }
  | { type: "requested"; status: IFriendStatus }
  | { type: "forgotten" }
  | { type: "failed"; error: string };

export const Invite_offlineError = "No connection";

export function Invite_empty(): IInviteFlow {
  return { step: "idle", signedIn: false, hidden: false, myHandle: "", myName: "" };
}

function begin(state: IInviteFlow): IInviteFlow {
  const base: IInviteFlow = { ...state, step: "idle", inviter: undefined, error: undefined, canRetry: undefined };
  return state.pending != null && state.signedIn && !state.hidden
    ? { ...base, step: "checking", command: { type: "check", handle: state.pending } }
    : base;
}

function forget(state: IInviteFlow, next: Partial<IInviteFlow>): IInviteFlow {
  const handle = state.inviter?.handle ?? state.pending;
  return handle == null
    ? { ...state, ...next, command: undefined }
    : { ...state, ...next, command: { type: "forget", handle } };
}

const active: IInviteStep[] = ["checking", "profile", "confirm", "incoming"];

function failed(state: IInviteFlow, error: string): IInviteFlow {
  const command = state.command;
  if (command?.type === "forget") {
    return { ...state, command: undefined };
  }
  if (command?.type === "saveProfile" || (error === Invite_offlineError && command?.type !== "check")) {
    return { ...state, command: undefined, error };
  }
  if (error === Invite_offlineError) {
    return { ...state, step: "failed", command: undefined, canRetry: true, error };
  }
  return forget(state, { step: "failed", canRetry: false, error });
}

export function Invite_reduce(state: IInviteFlow, event: IInviteEvent): IInviteFlow {
  switch (event.type) {
    case "pending": {
      const next = { ...state, pending: event.handle, signedIn: event.signedIn };
      if (state.command != null) {
        return next;
      }
      if (state.step === "idle") {
        return begin(next);
      }
      return active.includes(state.step) && (event.handle == null || !event.signedIn) ? begin(next) : next;
    }
    case "checked": {
      const result = event.result;
      const base = { ...state, command: undefined, error: undefined };
      switch (result.kind) {
        case "notFound":
          return forget(base, { step: "notFound" });
        case "nothingToDo":
          return forget(base, { step: "idle" });
        case "incoming":
          return { ...base, step: "incoming", inviter: result.inviter };
        case "needsProfile":
          return { ...base, step: "profile", inviter: result.inviter };
        case "confirm":
          return { ...base, step: "confirm", inviter: result.inviter };
      }
      return base;
    }
    case "profileSaved":
      return { ...state, step: "confirm", command: undefined, error: undefined };
    case "requested":
      return forget({ ...state, error: undefined }, { step: "done", status: event.status });
    case "forgotten":
      return { ...state, command: undefined };
    case "failed":
      return failed(state, event.error);
  }
  if (state.command != null) {
    return state;
  }
  switch (event.type) {
    case "myHandle":
      return { ...state, myHandle: event.value, error: undefined };
    case "myName":
      return { ...state, myName: event.value, error: undefined };
    case "saveProfile": {
      if (state.step !== "profile") {
        return state;
      }
      const error = Friends_handleError(state.myHandle) ?? Friends_displayNameError(state.myName);
      if (error != null) {
        return { ...state, error };
      }
      const handle = Friends_normalizeHandle(state.myHandle);
      return {
        ...state,
        error: undefined,
        command: { type: "saveProfile", handle, displayName: state.myName.trim() || handle },
      };
    }
    case "send":
      return state.step === "confirm" && state.inviter != null
        ? { ...state, error: undefined, command: { type: "send", handle: state.inviter.handle } }
        : state;
    case "accept":
      return state.step === "incoming" && state.inviter?.userId != null
        ? { ...state, error: undefined, command: { type: "accept", userId: state.inviter.userId } }
        : state;
    case "notNow":
      return active.includes(state.step) ? forget(state, { step: "idle", error: undefined }) : state;
    case "retry":
      return state.step === "failed" && state.canRetry === true ? begin(state) : state;
    case "later":
      return state.step === "failed" ? { ...state, step: "idle", hidden: true, error: undefined } : state;
    case "close":
      return state.step === "done" || state.step === "notFound" || state.step === "failed" ? begin(state) : state;
  }
  return state;
}
