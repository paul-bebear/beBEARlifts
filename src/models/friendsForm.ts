import { Friends_displayNameError, Friends_handleError, Friends_normalizeHandle, IFriendStatus } from "./friends";

export interface IFoundProfile {
  handle: string;
  displayName: string;
}

export type IFriendsCommand =
  | { type: "load" }
  | { type: "saveProfile"; handle: string; displayName: string; isNew: boolean }
  | { type: "find"; handle: string }
  | { type: "request"; handle: string }
  | { type: "accept"; userId: string }
  | { type: "remove"; userId: string };

export interface IFriendsForm {
  handle: string;
  displayName: string;
  editingProfile: boolean;
  search: string;
  found?: IFoundProfile;
  command?: IFriendsCommand;
  error?: string;
  message?: string;
}

export type IFriendsFormEvent =
  | { type: "handle" | "displayName" | "search"; value: string }
  | { type: "editProfile"; handle: string; displayName: string }
  | { type: "cancelEdit" }
  | { type: "saveProfile"; isNew: boolean }
  | { type: "find" }
  | { type: "request" }
  | { type: "accept" | "remove"; userId: string }
  | { type: "load" }
  | { type: "found"; profile?: IFoundProfile }
  | { type: "requested"; status: IFriendStatus }
  | { type: "done"; message?: string }
  | { type: "failed"; error: string };

export function FriendsForm_empty(): IFriendsForm {
  return { handle: "", displayName: "", editingProfile: false, search: "" };
}

function start(state: IFriendsForm, command: IFriendsCommand): IFriendsForm {
  return { ...state, command, error: undefined, message: undefined };
}

export function FriendsForm_reduce(state: IFriendsForm, event: IFriendsFormEvent): IFriendsForm {
  switch (event.type) {
    case "failed":
      return { ...state, command: undefined, error: event.error, message: undefined };
    case "done":
      return {
        ...state,
        command: undefined,
        message: event.message,
        editingProfile: state.command?.type === "saveProfile" ? false : state.editingProfile,
      };
    case "found":
      return event.profile == null
        ? { ...state, command: undefined, found: undefined, error: "No one has that handle." }
        : { ...state, command: undefined, found: event.profile };
    case "requested":
      return {
        ...state,
        command: undefined,
        search: "",
        found: undefined,
        message: event.status === "accepted" ? "You are now friends." : "Request sent.",
      };
  }
  if (state.command != null) {
    return state;
  }
  switch (event.type) {
    case "handle":
    case "displayName":
      return { ...state, [event.type]: event.value, error: undefined, message: undefined };
    case "search":
      return { ...state, search: event.value, found: undefined, error: undefined, message: undefined };
    case "editProfile":
      return {
        ...state,
        editingProfile: true,
        handle: event.handle,
        displayName: event.displayName,
        error: undefined,
        message: undefined,
      };
    case "cancelEdit":
      return { ...state, editingProfile: false, error: undefined };
    case "load":
      return start(state, { type: "load" });
    case "saveProfile": {
      const error = Friends_handleError(state.handle) ?? Friends_displayNameError(state.displayName);
      if (error != null) {
        return { ...state, error };
      }
      const handle = Friends_normalizeHandle(state.handle);
      const displayName = state.displayName.trim() || handle;
      return start(state, { type: "saveProfile", handle, displayName, isNew: event.isNew });
    }
    case "find": {
      const error = Friends_handleError(state.search);
      return error != null
        ? { ...state, error }
        : start({ ...state, found: undefined }, { type: "find", handle: Friends_normalizeHandle(state.search) });
    }
    case "request":
      return state.found == null ? state : start(state, { type: "request", handle: state.found.handle });
    case "accept":
    case "remove":
      return start(state, { type: event.type, userId: event.userId });
  }
}
