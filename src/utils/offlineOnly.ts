declare let __OFFLINE_ONLY__: boolean | undefined;
declare let __SOURCE_CODE_URL__: string | undefined;

const UPSTREAM_SOURCE_CODE_URL = "https://github.com/astashov/liftosaur";
export const OfflineOnly_allowedOrigins = [
  "https://api.spotify.com",
  "https://accounts.spotify.com",
  "https://qvqwvuuwfueccrmzwyct.supabase.co",
];

export function OfflineOnly_isEnabled(): boolean {
  return typeof __OFFLINE_ONLY__ !== "undefined" && __OFFLINE_ONLY__ === true;
}

export function OfflineOnly_sourceCodeUrl(): string {
  return typeof __SOURCE_CODE_URL__ !== "undefined" && __SOURCE_CODE_URL__
    ? __SOURCE_CODE_URL__
    : UPSTREAM_SOURCE_CODE_URL;
}

export function OfflineOnly_isRequestAllowed(requestUrl: string, appOrigin: string): boolean {
  let url: URL;
  try {
    url = new URL(requestUrl, appOrigin);
  } catch {
    return false;
  }
  if (url.protocol === "data:" || url.protocol === "blob:") {
    return true;
  }
  return url.origin === appOrigin || OfflineOnly_allowedOrigins.includes(url.origin);
}

function requestUrlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return input.url;
}

// Asks the browser not to evict IndexedDB under storage pressure. Safari grants it to Home Screen apps.
export async function OfflineOnly_requestPersistentStorage(nav: Navigator): Promise<boolean | undefined> {
  try {
    if (nav.storage?.persist == null) {
      return undefined;
    }
    return (await nav.storage.persisted()) || (await nav.storage.persist());
  } catch {
    return undefined;
  }
}

// The rejection matches what fetch does with no network, so every caller takes its existing offline path.
export function OfflineOnly_installFetchGuard(win: Window): void {
  const originalFetch = win.fetch.bind(win);
  win.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!OfflineOnly_isRequestAllowed(requestUrlOf(input), win.location.origin)) {
      return Promise.reject(new TypeError("Failed to fetch"));
    }
    return originalFetch(input, init);
  };
}
