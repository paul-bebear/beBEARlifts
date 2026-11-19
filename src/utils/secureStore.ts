export const SecureStore_isAvailable: boolean = false;

export async function SecureStore_get(_name: string): Promise<string | undefined> {
  return undefined;
}

export async function SecureStore_set(_name: string, _value: string): Promise<void> {
  throw new Error("No secure store on the web");
}

export async function SecureStore_remove(_name: string): Promise<void> {
  return;
}
