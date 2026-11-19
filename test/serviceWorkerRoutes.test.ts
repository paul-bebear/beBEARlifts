import "mocha";
import { expect } from "chai";
import { ServiceWorkerRoutes_decide, ServiceWorkerRoutes_isCacheable } from "../src/utils/serviceWorkerRoutes";

const host = "https://lifts.paulbebear.com";

describe("ServiceWorkerRoutes_decide", () => {
  const cases: [string, string, string, string][] = [
    [`${host}/api/food/search?q=egg`, "GET", "cors", "skip"],
    [`${host}/api/food/log`, "POST", "cors", "skip"],
    [`${host}/api/food/`, "GET", "navigate", "skip"],
    ["https://api.spotify.com/v1/me", "GET", "cors", "skip"],
    ["https://accounts.spotify.com/authorize", "GET", "navigate", "skip"],
    [`${host}/api/user`, "GET", "cors", "cache-first"],
    [`${host}/api/foods`, "GET", "cors", "cache-first"],
    [`${host}/api/user`, "POST", "cors", "cache-first"],
    [`${host}/`, "GET", "same-origin", "network-first"],
    [`${host}/app`, "GET", "same-origin", "network-first"],
    [`${host}/app/`, "GET", "same-origin", "cache-first"],
    [`${host}/app/`, "GET", "navigate", "network-first"],
    [`${host}/program?data=abc`, "GET", "navigate", "network-first"],
    [`${host}/app?code=1`, "GET", "navigate", "network-first"],
    [`${host}/`, "POST", "same-origin", "cache-first"],
    [`${host}/app`, "POST", "navigate", "cache-first"],
    [`${host}/index.html`, "GET", "same-origin", "cache-first"],
    [`${host}/main.js?version=1`, "GET", "no-cors", "cache-first"],
    [`${host}/images/back-muscles.svg`, "GET", "no-cors", "cache-first"],
  ];
  cases.forEach(([url, method, mode, expected]) => {
    it(`${method} ${mode} ${url} is ${expected}`, () => {
      expect(ServiceWorkerRoutes_decide(new URL(url), method, mode)).to.equal(expected);
    });
  });
});

describe("ServiceWorkerRoutes_isCacheable", () => {
  const patterns = ["/app/", "/icons/icon192.png", /\/images\//, /\/chunks\/.*\.(js|css)$/];
  it("matches a string pattern on path and search", () => {
    expect(ServiceWorkerRoutes_isCacheable(new URL(`${host}/app/`), patterns)).to.equal(true);
    expect(ServiceWorkerRoutes_isCacheable(new URL(`${host}/app/?x=1`), patterns)).to.equal(false);
  });
  it("matches a regexp on any host", () => {
    expect(ServiceWorkerRoutes_isCacheable(new URL("https://cdn.example.com/images/a.png"), patterns)).to.equal(true);
    expect(ServiceWorkerRoutes_isCacheable(new URL(`${host}/chunks/a.js`), patterns)).to.equal(true);
    expect(ServiceWorkerRoutes_isCacheable(new URL(`${host}/chunks/a.map`), patterns)).to.equal(false);
  });
  it("rejects an unlisted path and an empty list", () => {
    expect(ServiceWorkerRoutes_isCacheable(new URL(`${host}/api/user`), patterns)).to.equal(false);
    expect(ServiceWorkerRoutes_isCacheable(new URL(`${host}/app/`), [])).to.equal(false);
  });
});
