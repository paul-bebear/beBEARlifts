import { IInviteSharePlatform } from "../models/invite";

export const InviteSharePlatform: IInviteSharePlatform = {
  share:
    typeof navigator !== "undefined" && typeof navigator.share === "function"
      ? async (text, url) => {
          await navigator.share({ title: "beBEAR", text, url });
          return "shared";
        }
      : undefined,
  copy: (text) => navigator.clipboard.writeText(text),
};
