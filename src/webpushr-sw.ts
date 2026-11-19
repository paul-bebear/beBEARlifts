import { UrlUtils_build } from "./utils/url";
import { BundleNames_assetsInPage, BundleNames_hashedAsset } from "./utils/bundleNames";
import { ServiceWorkerRoutes_decide, ServiceWorkerRoutes_isCacheable } from "./utils/serviceWorkerRoutes";

declare let __COMMIT_HASH__: string;
declare let __OFFLINE_ONLY__: boolean;
const cacheName = `liftosaur-sw-${__COMMIT_HASH__}`;

const filesToCache = [
  ...(__OFFLINE_ONLY__
    ? []
    : [
        `/app.css?version=${__COMMIT_HASH__}`,
        `/app.js?version=${__COMMIT_HASH__}`,
        `/main.css?version=${__COMMIT_HASH__}`,
        `/main.js?version=${__COMMIT_HASH__}`,
        `/vendors.css?vendor=${__COMMIT_HASH__}`,
        `/vendors.js?vendor=${__COMMIT_HASH__}`,
      ]),
  "/app/",
  "/manifest.webmanifest",
  /\/chunks\/.*\.(js|css)$/,
  BundleNames_hashedAsset,
  /\/programdata\//,
  /\/images\//,
  `/images/back-muscles.svg`,
  `/images/front-muscles.svg`,
  `/images/svgs/muscles-combined.svg`,
  `/images/svgs/musclegroups-combined.svg`,
  /\/fonts\/.*/,
  /\/images\/exercises\//,
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
      caches.open(cacheName).then(async (cache) => {
        await cache.addAll(["/app/"]);
        const page = await cache.match("/app/");
        if (page == null) {
          throw new Error("[Service Worker] App page missing from cache");
        }
        await cache.addAll(BundleNames_assetsInPage(await page.text()));
        const add = (urls: string[]): Promise<unknown> =>
          Promise.all(urls.map((u) => cache.add(u).catch((err) => console.warn("[Service Worker] Skip", u, err))));
        await add(filesToCache.filter((f) => typeof f === "string" && f !== "/app/") as string[]);
      })
    );
  });

  service.addEventListener("fetch", (e) => {
    const url = UrlUtils_build(e.request.url);
    // Returning without respondWith hands the request to the browser, so no cache read or write can happen.
    const route = ServiceWorkerRoutes_decide(url, e.request.method, e.request.mode);
    if (route === "skip") {
      return;
    }
    if (route === "network-first") {
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
              if (e.request.method === "GET" && ServiceWorkerRoutes_isCacheable(url, filesToCache)) {
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

  service.addEventListener("activate", (event) => {
    event.waitUntil(
      (async () => {
        console.log("Activate Service Worker", event);
        const keys = (await caches.keys()).filter((k) => k !== cacheName);
        console.log(keys);
        for (const key of keys) {
          await caches.delete(key);
        }
      })()
    );
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
initialize(self as any);
