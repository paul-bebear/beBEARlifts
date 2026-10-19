import { UrlUtils_build } from "./utils/url";

declare let __COMMIT_HASH__: string;
const cacheName = `liftosaur-sw-${__COMMIT_HASH__}`;

const filesToCache = [
  `/app.css?version=${__COMMIT_HASH__}`,
  `/app.js?version=${__COMMIT_HASH__}`,
  "/app/",
  "/manifest.webmanifest",
  /\/chunks\/.*\.js$/,
  /\/programdata\//,
  /\/images\//,
  `/main.css?version=${__COMMIT_HASH__}`,
  `/main.js?version=${__COMMIT_HASH__}`,
  `/vendors.css?vendor=${__COMMIT_HASH__}`,
  `/vendors.js?vendor=${__COMMIT_HASH__}`,
  `/images/back-muscles.svg`,
  `/images/front-muscles.svg`,
  `/images/svgs/muscles-combined.svg`,
  `/images/svgs/musclegroups-combined.svg`,
  /\/fonts\/.*/,
  /\/externalimages\/exercises\//,
  "/",
  "/index.html",
  "/app",
  "/app/index.html",
  "/icons/icon192.png",
  "/icons/icon512.png",
  "/notification.m4r",
];

function cacheRequest(request: Request, response: Response): Promise<Response> {
  // The image bucket answers 403 for exercises that have no picture yet. Caching that would keep it until the next deploy.
  if (!response.ok) {
    return Promise.resolve(response);
  }
  return caches.open(cacheName).then((cache) => {
    console.log("[Service Worker] Caching new resource: " + request.url);

    cache.put(request, response.clone());
    return response;
  });
}

function initialize(service: ServiceWorkerGlobalScope): void {
  service.addEventListener("install", (event) => {
    event.waitUntil(
      // One file at a time: cache.addAll rejects the whole install if any single file 404s
      // (e.g. /vendors.css, which the current build does not emit), and then nothing works offline.
      caches.open(cacheName).then((cache) => {
        const urls = filesToCache.filter((f) => typeof f === "string") as string[];
        return Promise.all(urls.map((u) => cache.add(u).catch((err) => console.warn("[Service Worker] Skip", u, err))));
      })
    );
  });

  service.addEventListener("fetch", (e) => {
    const url = UrlUtils_build(e.request.url);
    // Returning without respondWith hands the request to the browser, so no cache read or write can happen.
    if (url.pathname.startsWith("/api/food/")) {
      return;
    }
    if (
      e.request.method === "GET" &&
      (e.request.mode === "navigate" ||
        url.pathname === "/" ||
        url.pathname === "index.html" ||
        url.pathname === "/app")
    ) {
      console.log("[Service Worker] Fetching " + e.request.url);
      e.respondWith(
        caches.match(e.request).then((r) => {
          return fetch(e.request)
            .then((response) => cacheRequest(e.request, response))
            .catch((err) => {
              if (r != null) {
                console.log("[Service Worker] Can't fetch, so using cache for: " + e.request.url);
                console.error(err);
                return r;
              } else {
                throw e;
              }
            });
        })
      );
    } else {
      console.log("[Service Worker] Checking the resource in cache: " + e.request.url);

      e.respondWith(
        caches.match(e.request).then((r) => {
          if (r) {
            console.log("[Service Worker] Returning from cache: " + e.request.url);
            return r;
          } else {
            console.log("[Service Worker] Missing from cache, fetching resource: " + e.request.url);
            return fetch(e.request).then((response) => {
              if (
                e.request.method === "GET" &&
                filesToCache.some((f) => {
                  if (typeof f === "string") {
                    const u = UrlUtils_build(e.request.url);
                    return `${u.pathname}${u.search}` === f;
                  } else {
                    const u = UrlUtils_build(e.request.url);
                    return f.test(`${u.pathname}${u.search}`);
                  }
                })
              ) {
                return cacheRequest(e.request, response);
              } else {
                return response;
              }
            });
          }
        })
      );
    }
  });

  self.addEventListener("activate", async (event: object) => {
    console.log("Activate Service Worker", event);
    const keys = (await caches.keys()).filter((k) => k !== cacheName);
    console.log(keys);
    for (const key of keys) {
      await caches.delete(key);
    }
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
initialize(self as any);
