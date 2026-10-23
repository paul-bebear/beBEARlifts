import { Friends_errorText, Friends_profileSavedMessage } from "../models/friends";
import { IFriendsCommand, IFriendsFormEvent } from "../models/friendsForm";
import {
  FriendsClient_accept,
  FriendsClient_find,
  FriendsClient_load,
  FriendsClient_loadBlocks,
  FriendsClient_remove,
  FriendsClient_request,
  FriendsClient_saveProfile,
} from "./friendsClient";
import { ICloudResult } from "./supabaseClient";
import { FeedClient_refresh } from "./feedClient";

function failed(result: { ok: false; error: string }): IFriendsFormEvent {
  return { type: "failed", error: Friends_errorText(result.error) };
}

// Every change reloads the lists, so the screen shows what the server now holds.
async function thenLoad(result: ICloudResult<unknown>, message?: string): Promise<IFriendsFormEvent> {
  if (!result.ok) {
    return failed(result);
  }
  const loaded = await FriendsClient_load();
  return loaded.ok ? { type: "done", message } : failed(loaded);
}

async function run(command: IFriendsCommand): Promise<IFriendsFormEvent> {
  switch (command.type) {
    case "load": {
      const blocks = await FriendsClient_loadBlocks();
      if (!blocks.ok) {
        return failed(blocks);
      }
      const loaded = await FriendsClient_load();
      if (!loaded.ok) {
        return failed(loaded);
      }
      const feed = await FeedClient_refresh();
      return feed.ok ? { type: "done" } : failed(feed);
    }
    case "saveProfile":
      return thenLoad(
        await FriendsClient_saveProfile(command.handle, command.displayName, command.isNew),
        Friends_profileSavedMessage
      );
    case "find": {
      const result = await FriendsClient_find(command.handle);
      return result.ok ? { type: "found", profile: result.value } : failed(result);
    }
    case "request": {
      const result = await FriendsClient_request(command.handle);
      if (!result.ok) {
        return failed(result);
      }
      const loaded = await FriendsClient_load();
      return loaded.ok ? { type: "requested", status: result.value } : failed(loaded);
    }
    case "accept":
      return thenLoad(await FriendsClient_accept(command.userId));
    case "remove":
      return thenLoad(await FriendsClient_remove(command.userId));
  }
}

export async function FriendsCommand_run(
  command: IFriendsCommand,
  emit: (event: IFriendsFormEvent) => void
): Promise<void> {
  try {
    emit(await run(command));
  } catch (error) {
    emit({ type: "failed", error: error instanceof Error ? error.message : "Friends request failed" });
  }
}
