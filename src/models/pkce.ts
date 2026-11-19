import { RandomBytes_get } from "../utils/randomBytes";
import { Sha256_digest } from "./sha256";

export interface IPkcePair {
  verifier: string;
  challenge: string;
}

export const Pkce_alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
export const Pkce_verifierLength = 64;
const acceptBelow = 256 - (256 % Pkce_alphabet.length);

export function Pkce_randomString(
  length: number,
  randomBytes: (count: number) => Uint8Array = RandomBytes_get
): string {
  let out = "";
  while (out.length < length) {
    for (const byte of randomBytes(length - out.length)) {
      if (byte < acceptBelow && out.length < length) {
        out += Pkce_alphabet[byte % Pkce_alphabet.length];
      }
    }
  }
  return out;
}

export function Pkce_base64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function Pkce_challenge(verifier: string): string {
  return Pkce_base64Url(Sha256_digest(new TextEncoder().encode(verifier)));
}

export function Pkce_pair(randomBytes: (count: number) => Uint8Array = RandomBytes_get): IPkcePair {
  const verifier = Pkce_randomString(Pkce_verifierLength, randomBytes);
  return { verifier, challenge: Pkce_challenge(verifier) };
}
