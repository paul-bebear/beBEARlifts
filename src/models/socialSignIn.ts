import { FeedPost_maxComment, IFeedAudience, IFeedDraft } from "./feedPost";
import { Friends_normalizeUsername, Friends_usernameError } from "./friends";

export type IFeedResult<T> = { ok: true; value: T } | { ok: false; message: string };

export interface ISocialMe {
  userId: string;
  username?: string;
}

export type ISocialShareIntent = { kind: "share"; draft: IFeedDraft };
export type ISocialIntent = { kind: "join" } | ISocialShareIntent;

export type ISocialSheet =
  | { step: "closed" }
  | { step: "checking"; intent: ISocialIntent }
  | { step: "failed"; intent: ISocialIntent; message: string }
  | { step: "account"; intent: ISocialIntent; mode: "signUp" | "signIn"; isBusy: boolean; error?: string }
  | { step: "username"; intent: ISocialIntent; isBusy: boolean; username?: string; error?: string }
  | {
      step: "compose";
      intent: ISocialShareIntent;
      audience: IFeedAudience;
      comment: string;
      isBusy: boolean;
      error?: string;
    }
  | { step: "done"; intent: ISocialIntent; message: string };

export type ISocialEvent =
  | { type: "open"; intent: ISocialIntent }
  | { type: "close" }
  | { type: "retry" }
  | { type: "loaded"; me: ISocialMe | undefined }
  | { type: "loadFailed"; message: string }
  | { type: "switchMode" }
  | { type: "submitAccount"; email: string; password: string }
  | { type: "accountDone"; result: IFeedResult<ISocialMe> }
  | { type: "submitUsername"; username: string }
  | { type: "usernameDone"; result: IFeedResult<void> }
  | { type: "setAudience"; audience: IFeedAudience }
  | { type: "setComment"; comment: string }
  | { type: "submitShare" }
  | { type: "shareDone"; result: IFeedResult<void> };

export type ISocialEffect =
  | { type: "loadMe" }
  | { type: "signUp" | "signIn"; email: string; password: string }
  | { type: "createProfile"; username: string }
  | { type: "share"; draft: IFeedDraft; audience: IFeedAudience; comment?: string }
  | { type: "authChanged" }
  | { type: "shared"; clientKey: string };

interface INext {
  sheet: ISocialSheet;
  effects: ISocialEffect[];
}

const minPassword = 6;

function stay(sheet: ISocialSheet): INext {
  return { sheet, effects: [] };
}

function afterProfile(intent: ISocialIntent, username: string): ISocialSheet {
  return intent.kind === "share"
    ? { step: "compose", intent, audience: "friends", comment: "", isBusy: false }
    : { step: "done", intent, message: `You're in as @${username}. Add friends on the Friends tab.` };
}

function afterMe(intent: ISocialIntent, me: ISocialMe | undefined): ISocialSheet {
  if (me == null) {
    return { step: "account", intent, mode: "signUp", isBusy: false };
  }
  return me.username == null ? { step: "username", intent, isBusy: false } : afterProfile(intent, me.username);
}

function accountError(email: string, password: string): string | undefined {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Check the email address.";
  }
  return password.length < minPassword ? `Use a password of at least ${minPassword} characters.` : undefined;
}

export function SocialSignIn_next(sheet: ISocialSheet, event: ISocialEvent): INext {
  if (event.type === "open") {
    return { sheet: { step: "checking", intent: event.intent }, effects: [{ type: "loadMe" }] };
  }
  if (event.type === "close") {
    return stay({ step: "closed" });
  }
  switch (sheet.step) {
    case "checking":
      if (event.type === "loaded") {
        return stay(afterMe(sheet.intent, event.me));
      }
      return event.type === "loadFailed"
        ? stay({ step: "failed", intent: sheet.intent, message: event.message })
        : stay(sheet);
    case "failed":
      return event.type === "retry"
        ? { sheet: { step: "checking", intent: sheet.intent }, effects: [{ type: "loadMe" }] }
        : stay(sheet);
    case "account": {
      if (event.type === "switchMode" && !sheet.isBusy) {
        return stay({ ...sheet, mode: sheet.mode === "signUp" ? "signIn" : "signUp", error: undefined });
      }
      if (event.type === "submitAccount" && !sheet.isBusy) {
        const error = accountError(event.email, event.password);
        if (error != null) {
          return stay({ ...sheet, error });
        }
        const effect: ISocialEffect = { type: sheet.mode, email: event.email.trim(), password: event.password };
        return { sheet: { ...sheet, isBusy: true, error: undefined }, effects: [effect] };
      }
      if (event.type === "accountDone" && sheet.isBusy) {
        return event.result.ok
          ? { sheet: afterMe(sheet.intent, event.result.value), effects: [{ type: "authChanged" }] }
          : stay({ ...sheet, isBusy: false, error: event.result.message });
      }
      return stay(sheet);
    }
    case "username": {
      if (event.type === "submitUsername" && !sheet.isBusy) {
        const username = Friends_normalizeUsername(event.username);
        const error = Friends_usernameError(username);
        return error != null
          ? stay({ ...sheet, error })
          : {
              sheet: { ...sheet, isBusy: true, username, error: undefined },
              effects: [{ type: "createProfile", username }],
            };
      }
      if (event.type === "usernameDone" && sheet.isBusy) {
        return event.result.ok
          ? { sheet: afterProfile(sheet.intent, sheet.username ?? ""), effects: [{ type: "authChanged" }] }
          : stay({ ...sheet, isBusy: false, error: event.result.message });
      }
      return stay(sheet);
    }
    case "compose": {
      if (sheet.isBusy) {
        if (event.type !== "shareDone") {
          return stay(sheet);
        }
        if (!event.result.ok) {
          return stay({ ...sheet, isBusy: false, error: event.result.message });
        }
        const message = sheet.audience === "public" ? "Shared with everyone." : "Shared with your friends.";
        return {
          sheet: { step: "done", intent: sheet.intent, message },
          effects: [{ type: "shared", clientKey: sheet.intent.draft.clientKey }],
        };
      }
      if (event.type === "setAudience") {
        return stay({ ...sheet, audience: event.audience });
      }
      if (event.type === "setComment") {
        return stay({ ...sheet, comment: event.comment.slice(0, FeedPost_maxComment) });
      }
      if (event.type === "submitShare") {
        const comment = sheet.comment.trim();
        const effect: ISocialEffect = {
          type: "share",
          draft: sheet.intent.draft,
          audience: sheet.audience,
          ...(comment !== "" ? { comment } : {}),
        };
        return { sheet: { ...sheet, isBusy: true, error: undefined }, effects: [effect] };
      }
      return stay(sheet);
    }
    default:
      return stay(sheet);
  }
}

export function SocialSignIn_errorText(error: { code?: string; message?: string; status?: number }): string {
  switch (error.code) {
    case "23505":
      return "That username is taken.";
    case "invalid_credentials":
      return "Wrong email or password.";
    case "user_already_exists":
    case "email_exists":
      return "That email already has an account. Sign in instead.";
    case "weak_password":
      return `Use a longer password, at least ${minPassword} characters.`;
    case "email_address_invalid":
      return "Check the email address.";
    case "email_not_confirmed":
      return "Turn off email confirmation in Supabase, then sign in.";
  }
  if (error.status === 429 || error.code?.startsWith("over_") === true) {
    return "Too many tries. Wait a minute and try again.";
  }
  const message = error.message ?? "";
  if (/failed to fetch|network|load failed/i.test(message) || error.status === 0) {
    return "No connection. Try again with a signal.";
  }
  return message !== "" ? message : "Something went wrong. Try again.";
}
