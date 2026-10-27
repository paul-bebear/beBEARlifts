import { CubNumber_fromRows, CubNumber_needsFetch } from "../models/cubNumber";
import { CubStore } from "./cubStore";
import { CloudStore, SupabaseClient_call, SupabaseClient_readJson, SupabaseClient_signedIn } from "./supabaseClient";

let running = false;
let again = false;

async function refresh(): Promise<void> {
  const [cloud, cub] = await Promise.all([CloudStore.load(), CubStore.load()]);
  if (!CubNumber_needsFetch(cub, cloud.session, Date.now())) {
    return;
  }
  const auth = await SupabaseClient_signedIn();
  if (!auth.ok) {
    return;
  }
  const { userId, accessToken } = auth.value;
  const result = await SupabaseClient_call(
    `/rest/v1/cubs?select=user_id,number&user_id=eq.${encodeURIComponent(userId)}`,
    { method: "GET" },
    accessToken
  );
  if (!result.ok) {
    return;
  }
  const next = CubNumber_fromRows(await SupabaseClient_readJson(result.value), userId, Date.now());
  if ((await CloudStore.load()).session?.userId === userId) {
    await CubStore.replace(next);
  }
}

// A sign-in during a fetch that started signed out asks again once that fetch ends.
export async function CubClient_refresh(): Promise<void> {
  if (running) {
    again = true;
    return;
  }
  running = true;
  try {
    do {
      again = false;
      await refresh().catch(() => undefined);
    } while (again);
  } finally {
    running = false;
  }
}

export function CubClient_followSignIn(): () => void {
  let lastUserId: string | undefined;
  return CloudStore.subscribe((cloud) => {
    const userId = cloud.session?.userId;
    if (userId !== lastUserId) {
      lastUserId = userId;
      CubClient_refresh().catch(() => undefined);
    }
  });
}
