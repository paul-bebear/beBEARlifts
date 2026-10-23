// index.native.ts installs no crypto polyfill, so the iPhone build may lack crypto.getRandomValues.
export function RandomBytes_get(count: number): Uint8Array {
  const bytes = new Uint8Array(count);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    return crypto.getRandomValues(bytes);
  }
  for (let i = 0; i < count; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}
