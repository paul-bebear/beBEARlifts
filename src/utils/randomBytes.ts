interface IRandomSource {
  crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array };
}

// Hermes (the iPhone JS engine) has no Web Crypto, so the phone falls back to Math.random, which is not secure.
// react-native-get-random-values would install a secure crypto.getRandomValues. The owner has not chosen it yet.
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
