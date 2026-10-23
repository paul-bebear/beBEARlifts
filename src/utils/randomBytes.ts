interface IRandomSource {
  crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array };
}

// Hermes (the iPhone and Android JS engine) has no Web Crypto, so the native app falls back to Math.random.
export function RandomBytes_get(
  length: number,
  source: IRandomSource = globalThis as IRandomSource,
  rand: () => number = Math.random
): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof source.crypto?.getRandomValues === "function") {
    return source.crypto.getRandomValues(bytes);
  }
  for (let i = 0; i < length; i += 1) {
    bytes[i] = Math.floor(rand() * 256);
  }
  return bytes;
}
