// The native app has no page origin, so a relative "/api/..." fetch has no host to go to.
const apiOrigin = "https://lifts.paulbebear.com";

export function ApiUrl_for(path: string): string {
  return `${apiOrigin}${path}`;
}
