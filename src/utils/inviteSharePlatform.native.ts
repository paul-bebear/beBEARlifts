import { Share } from "react-native";
import { IInviteSharePlatform } from "../models/invite";
import { ClipboardUtils_copy } from "./clipboard";

// React Native has no navigator.share or navigator.clipboard, so the web version always ended in "failed".
export const InviteSharePlatform: IInviteSharePlatform = {
  share: async (text, url) => {
    const result = await Share.share({ title: "beBEAR", message: `${text} ${url}` });
    return result.action === Share.dismissedAction ? "cancelled" : "shared";
  },
  copy: ClipboardUtils_copy,
};
