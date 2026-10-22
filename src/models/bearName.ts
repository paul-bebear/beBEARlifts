import { Friends_handleError, Friends_normalizeHandle, Friends_profileSavedMessage, IProfile } from "./friends";
import { FriendsForm_empty, FriendsForm_reduce, IFriendsForm } from "./friendsForm";

export type IBearNameStage = "signedOut" | "loading" | "failed" | "form";

export interface IBearNameSheet {
  stage: IBearNameStage;
  heading: string;
  hint: string;
  fieldError?: string;
  canSave: boolean;
  saveLabel: string;
  isNew: boolean;
}

export interface IBearNameInput {
  userId?: string;
  hasLoaded: boolean;
  me?: IProfile;
  form: IFriendsForm;
}

const defaultTitle = "My bear";
const heading = "Name your bear";

export function BearName_title(me: IProfile | undefined): string {
  return me?.handle ?? defaultTitle;
}

export function BearName_initialForm(me: IProfile | undefined): IFriendsForm {
  return FriendsForm_reduce(FriendsForm_empty(), {
    type: "editProfile",
    handle: me?.handle ?? "",
    displayName: me?.displayName ?? "",
  });
}

export function BearName_isSaved(form: IFriendsForm): boolean {
  return form.message === Friends_profileSavedMessage;
}

function stage(input: IBearNameInput): IBearNameStage {
  if (input.userId == null) {
    return "signedOut";
  }
  if (!input.hasLoaded) {
    return input.form.error == null ? "loading" : "failed";
  }
  return "form";
}

function hintFor(current: IBearNameStage, form: IFriendsForm): string {
  switch (current) {
    case "signedOut":
      return "Sign in to name your bear";
    case "loading":
      return "Loading…";
    case "failed":
      return form.error ?? "Could not load your profile.";
    case "form":
      return "Friends find you by it. Letters, numbers, underscore.";
  }
}

export function BearName_sheet(input: IBearNameInput): IBearNameSheet {
  const current = stage(input);
  const typed = input.form.handle.trim();
  const formatError = typed === "" ? undefined : Friends_handleError(typed);
  const isChanged = Friends_normalizeHandle(typed) !== input.me?.handle;
  return {
    stage: current,
    heading,
    hint: hintFor(current, input.form),
    fieldError: current === "form" ? (input.form.error ?? formatError) : undefined,
    canSave: current === "form" && input.form.command == null && typed !== "" && formatError == null && isChanged,
    saveLabel: input.form.command?.type === "saveProfile" ? "Saving…" : "Save",
    isNew: input.me == null,
  };
}
