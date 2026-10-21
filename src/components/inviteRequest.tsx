import { JSX, useEffect, useState } from "react";
import { CloudStore } from "../utils/supabaseClient";
import {
  InviteClient_current,
  InviteClient_isStandalone,
  InviteClient_save,
  InviteClient_request,
  InviteStore,
} from "../utils/inviteClient";

export function InviteRequest(): JSX.Element | null {
  const cloud = CloudStore.use();
  const pending = InviteStore.use();
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const handle = InviteClient_current();
    if (handle != null) {
      InviteClient_save(handle).catch(() => setError("Could not save the invite. Enter the handle in setup."));
    }
  }, []);
  useEffect(() => {
    if (InviteClient_isStandalone() && cloud.session != null && pending.handle != null) {
      setError(undefined);
      InviteClient_request(pending.handle)
        .then((r) => setError(r.ok ? undefined : r.error))
        .catch(() => setError("The friend request could not be sent."));
    }
  }, [cloud.session?.userId, pending.handle, attempt]);
  return error == null ? null : (
    <div
      className="fixed z-50 bottom-20 inset-x-4 p-4 rounded-xl bg-background-default text-text-primary border border-border-prominent"
      role="alert"
    >
      <p>{error}</p>
      <button className="p-3 text-text-link" onClick={() => setAttempt((n) => n + 1)}>
        Retry friend request
      </button>
      <button className="p-3 text-text-link" onClick={() => setError(undefined)}>
        Dismiss
      </button>
    </div>
  );
}
