import * as RNKeychain from "react-native-keychain";

export const SecureStore_isAvailable = true;

const ACCOUNT = "token";

function service(name: string): string {
  return `com.liftosaur.www.${name}`;
}

export async function SecureStore_get(name: string): Promise<string | undefined> {
  const result = await RNKeychain.getGenericPassword({ service: service(name) });
  return result === false ? undefined : result.password;
}

// AFTER_FIRST_UNLOCK, because the app refreshes the Spotify token while the phone is locked during a workout.
export async function SecureStore_set(name: string, value: string): Promise<void> {
  const result = await RNKeychain.setGenericPassword(ACCOUNT, value, {
    service: service(name),
    accessible: RNKeychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
  if (result === false) {
    throw new Error("Keychain write failed");
  }
}

export async function SecureStore_remove(name: string): Promise<void> {
  await RNKeychain.resetGenericPassword({ service: service(name) });
}
