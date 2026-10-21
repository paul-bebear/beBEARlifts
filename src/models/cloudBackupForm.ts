import { CloudBackup_isCode, CloudBackup_isEmail, ICloudCopy } from "./cloudBackup";
import {
  AccountDeletion_confirmWord,
  AccountDeletion_doneMessage,
  AccountDeletion_isConfirmed,
} from "./accountDeletion";

export type ICloudBackupOperation =
  | "sendCode"
  | "verify"
  | "backup"
  | "restore"
  | "keepPhone"
  | "signOut"
  | "deleteAccount";
export type ICloudBackupCommand = { operation: ICloudBackupOperation; email: string; code: string; copy?: ICloudCopy };

export interface ICloudBackupForm {
  step: "email" | "code" | "signedIn";
  email: string;
  code: string;
  command?: ICloudBackupCommand;
  error?: string;
  message?: string;
  showOlderCopies: boolean;
  // undefined while the delete confirmation is closed.
  deleteText?: string;
}

export type ICloudBackupEvent =
  | { type: "email" | "code" | "deleteText"; value: string }
  | { type: "deleteOpen" | "deleteCancel" | "toggleOlderCopies" }
  | { type: "deleted" }
  | { type: "session"; email?: string }
  | { type: "request"; operation: ICloudBackupOperation; copy?: ICloudCopy }
  | { type: "sent" }
  | { type: "verified" }
  | { type: "done"; message?: string }
  | { type: "signedOut" }
  | { type: "failed"; error: string }
  | { type: "changeEmail" };

export function CloudBackupForm_empty(): ICloudBackupForm {
  return { step: "email", email: "", code: "", showOlderCopies: false };
}

export function CloudBackupForm_reduce(state: ICloudBackupForm, event: ICloudBackupEvent): ICloudBackupForm {
  if (event.type === "session") {
    return event.email != null
      ? { ...state, step: "signedIn", email: event.email }
      : state.step === "signedIn" && state.command == null
        ? CloudBackupForm_empty()
        : state;
  }
  if (event.type === "failed") {
    return { ...state, command: undefined, error: event.error, message: undefined };
  }
  if (event.type === "sent") {
    return { ...state, step: "code", command: undefined, code: "", message: "Check your email for the code." };
  }
  if (event.type === "verified") {
    return {
      ...state,
      step: "signedIn",
      code: "",
      command: undefined,
      message: "Signed in. Backups upload after each workout.",
    };
  }
  if (event.type === "done") {
    return { ...state, command: undefined, message: event.message, showOlderCopies: false };
  }
  if (event.type === "signedOut") {
    return CloudBackupForm_empty();
  }
  if (event.type === "deleted") {
    return { ...CloudBackupForm_empty(), message: AccountDeletion_doneMessage };
  }
  if (state.command != null) {
    return state;
  }
  if (event.type === "changeEmail") {
    return { ...CloudBackupForm_empty(), email: state.email };
  }
  if (event.type === "email" || event.type === "code") {
    return { ...state, [event.type]: event.value, error: undefined, message: undefined };
  }
  if (event.type === "deleteOpen") {
    return state.step === "signedIn" ? { ...state, deleteText: "", error: undefined, message: undefined } : state;
  }
  if (event.type === "toggleOlderCopies") {
    return { ...state, showOlderCopies: !state.showOlderCopies, error: undefined, message: undefined };
  }
  if (event.type === "deleteCancel") {
    return { ...state, deleteText: undefined, error: undefined };
  }
  if (event.type === "deleteText") {
    return state.deleteText == null ? state : { ...state, deleteText: event.value, error: undefined };
  }
  if (event.type === "request") {
    if (event.operation === "sendCode" && !CloudBackup_isEmail(state.email)) {
      return { ...state, error: "Enter a valid email address." };
    }
    if (event.operation === "verify" && !CloudBackup_isCode(state.code)) {
      return { ...state, error: "Enter the 6 to 10 digit code from your email." };
    }
    if (event.operation === "deleteAccount" && !AccountDeletion_isConfirmed(state.deleteText ?? "")) {
      return state.deleteText == null ? state : { ...state, error: `Type ${AccountDeletion_confirmWord} to confirm.` };
    }
    const signedOutOperation = event.operation === "sendCode" || event.operation === "verify";
    if (signedOutOperation === (state.step === "signedIn") || (event.operation === "verify" && state.step !== "code")) {
      return state;
    }
    return {
      ...state,
      error: undefined,
      message: undefined,
      command: { operation: event.operation, email: state.email.trim(), code: state.code.trim(), copy: event.copy },
    };
  }
  return state;
}
