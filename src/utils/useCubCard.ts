import { CubNumber_mine } from "../models/cubNumber";
import { Friends_forUser } from "../models/friends";
import { ICubCardData } from "../components/shareCards/cubCard";
import { CubStore } from "./cubStore";
import { FriendsStore } from "./friendsClient";
import { CloudStore } from "./supabaseClient";
import { useBear } from "./useBear";

export function useCubCard(): ICubCardData | undefined {
  const session = CloudStore.use().session;
  const number = CubNumber_mine(CubStore.use(), session);
  const handle = Friends_forUser(FriendsStore.use(), session?.userId).me?.handle;
  const fur = useBear().state.fur;
  return number == null ? undefined : { number, handle, fur };
}
