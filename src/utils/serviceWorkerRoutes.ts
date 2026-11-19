type IServiceWorkerRoute = "skip" | "network-first" | "cache-first";

type IServiceWorkerCachePattern = string | RegExp;

export function ServiceWorkerRoutes_decide(url: URL, method: string, mode: string): IServiceWorkerRoute {
  if (url.pathname.startsWith("/api/food/") || url.hostname.endsWith(".spotify.com")) {
    return "skip";
  }
  if (
    method === "GET" &&
    (mode === "navigate" || url.pathname === "/" || url.pathname === "index.html" || url.pathname === "/app")
  ) {
    return "network-first";
  }
  return "cache-first";
}

export function ServiceWorkerRoutes_isCacheable(url: URL, patterns: IServiceWorkerCachePattern[]): boolean {
  const target = `${url.pathname}${url.search}`;
  return patterns.some((p) => (typeof p === "string" ? target === p : p.test(target)));
}
