import { JSX, useEffect, useReducer } from "react";
import { CloudStore } from "../utils/supabaseClient";
import { InviteClient_current, InviteClient_run, InviteClient_save, InviteStore } from "../utils/inviteClient";
import { Invite_empty, Invite_reduce } from "../models/invite";
import { ForkSheet, ForkSheetButton, ForkSheet_input } from "./forkSheet";

export function InviteRequest(): JSX.Element | null {
  const cloud = CloudStore.use();
  const pending = InviteStore.use();
  const [flow, emit] = useReducer(Invite_reduce, undefined, Invite_empty);
  const signedIn = cloud.session != null;
  const busy = flow.command != null;

  useEffect(() => {
    const handle = InviteClient_current();
    if (handle != null) {
      InviteClient_save(handle).catch(() => undefined);
    }
  }, []);
  useEffect(() => {
    emit({ type: "pending", handle: pending.handle, signedIn });
  }, [pending.handle, signedIn]);
  useEffect(() => {
    if (flow.command != null) {
      InviteClient_run(flow.command, emit);
    }
  }, [flow.command]);

  const inviter = flow.inviter;
  const name = inviter?.displayName ?? `@${flow.pending ?? ""}`;
  const error = flow.error != null && flow.step !== "failed" && (
    <p role="alert" className="text-sm text-text-error">
      {flow.error}
    </p>
  );
  switch (flow.step) {
    case "profile":
      return (
        <ForkSheet title={`${name} invited you`} testId="invite-profile">
          <p>Pick a handle so {name} can find you. Friends see your name and handle. Only friends see your workouts.</p>
          <label className="block">
            Your handle
            <input
              className={ForkSheet_input}
              value={flow.myHandle}
              autoCapitalize="none"
              autoCorrect="off"
              maxLength={21}
              disabled={busy}
              onChange={(e) => emit({ type: "myHandle", value: e.currentTarget.value })}
            />
          </label>
          <p className="text-sm text-text-secondary">3 to 20 letters, numbers or _.</p>
          <label className="block">
            Your name
            <input
              className={ForkSheet_input}
              value={flow.myName}
              maxLength={40}
              disabled={busy}
              onChange={(e) => emit({ type: "myName", value: e.currentTarget.value })}
            />
          </label>
          {error}
          <ForkSheetButton primary label="Save" disabled={busy} onClick={() => emit({ type: "saveProfile" })} />
          <ForkSheetButton label="Not now" disabled={busy} onClick={() => emit({ type: "notNow" })} />
        </ForkSheet>
      );
    case "confirm":
      return (
        <ForkSheet title={`Send a friend request to ${name}?`} testId="invite-confirm">
          <p>
            {name} @{inviter?.handle} sees your workouts once they accept, and you see theirs.
          </p>
          {error}
          <ForkSheetButton primary label="Send request" disabled={busy} onClick={() => emit({ type: "send" })} />
          <ForkSheetButton label="Not now" disabled={busy} onClick={() => emit({ type: "notNow" })} />
        </ForkSheet>
      );
    case "incoming":
      return (
        <ForkSheet title={`${name} sent you a friend request`} testId="invite-incoming">
          <p>Accept to see each other’s workouts. Not now leaves the request in Friends.</p>
          {error}
          <ForkSheetButton primary label="Accept" disabled={busy} onClick={() => emit({ type: "accept" })} />
          <ForkSheetButton label="Not now" disabled={busy} onClick={() => emit({ type: "notNow" })} />
        </ForkSheet>
      );
    case "done":
      return (
        <ForkSheet
          title={flow.status === "accepted" ? `You and ${name} are friends` : "Request sent"}
          testId="invite-done"
        >
          <p>
            {flow.status === "accepted"
              ? "Your workouts show in each other’s Friends tab."
              : `You see each other’s workouts once ${name} accepts.`}
          </p>
          <ForkSheetButton primary label="OK" disabled={busy} onClick={() => emit({ type: "close" })} />
        </ForkSheet>
      );
    case "notFound":
      return (
        <ForkSheet title={`No one has the handle @${flow.pending ?? ""}`} testId="invite-not-found">
          <p>Check the spelling with your friend, then add them in Friends.</p>
          <ForkSheetButton primary label="OK" disabled={busy} onClick={() => emit({ type: "close" })} />
        </ForkSheet>
      );
    case "failed":
      return flow.canRetry ? (
        <ForkSheet title="Friend request waiting" testId="invite-offline">
          <p>No connection. The request to @{flow.pending} is sent when you retry with a signal.</p>
          <ForkSheetButton primary label="Retry" onClick={() => emit({ type: "retry" })} />
          <ForkSheetButton label="Later" onClick={() => emit({ type: "later" })} />
        </ForkSheet>
      ) : (
        <ForkSheet title="Friend request not sent" testId="invite-failed">
          <p>{flow.error?.replace(/\.?$/, ".")} Add your friend in the Friends tab.</p>
          <ForkSheetButton primary label="OK" disabled={busy} onClick={() => emit({ type: "close" })} />
        </ForkSheet>
      );
    default:
      return null;
  }
}
