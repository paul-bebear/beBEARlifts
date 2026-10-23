import { test, expect, Page, Route } from "@playwright/test";
import {
  PlaywrightUtils_disableTours,
  PlaywrightUtils_selectBuiltin,
  PlaywrightUtils_typeKeyboard,
} from "./playwrightUtils";

// The music tracker exists only in the offline build. Run `npm run build:pwa`, serve `dist` on 127.0.0.1
// (Spotify rejects localhost), then: MUSIC_PWA_URL=http://127.0.0.1:4173/app/ npx playwright test tests/music.spec.ts
const appUrl = process.env.MUSIC_PWA_URL;

test.use({ browserName: "chromium", serviceWorkers: "block" });

function track(id: string): Record<string, unknown> {
  return {
    id,
    uri: `spotify:track:${id}`,
    name: `Song ${id}`,
    type: "track",
    duration_ms: 200000,
    artists: [{ name: "Test Artist" }],
    album: { images: [] },
  };
}

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET, POST, PUT, OPTIONS",
};

function reply(route: Route, status: number, body?: unknown): Promise<void> {
  return route.fulfill({
    status,
    headers: { ...cors, "content-type": "application/json" },
    body: body == null ? "" : JSON.stringify(body),
  });
}

interface ISpotifyMock {
  nowPlaying: { id: string; progressMs: number } | undefined;
  tokenBodies: URLSearchParams[];
  playlistItems: string[][];
  calls: string[];
  served: string[];
}

async function mockSpotify(page: Page): Promise<ISpotifyMock> {
  const mock: ISpotifyMock = { nowPlaying: undefined, tokenBodies: [], playlistItems: [], calls: [], served: [] };
  await page.route("https://accounts.spotify.com/authorize?*", (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    const back = `${url.searchParams.get("redirect_uri")}?code=test-code&state=${url.searchParams.get("state")}`;
    return route.fulfill({ status: 302, headers: { location: back } });
  });
  await page.route("https://accounts.spotify.com/api/token", (route) => {
    if (route.request().method() === "OPTIONS") {
      return reply(route, 204);
    }
    mock.tokenBodies.push(new URLSearchParams(route.request().postData() ?? ""));
    return reply(route, 200, { access_token: "at1", refresh_token: "rt1", expires_in: 3600 });
  });
  await page.route("https://api.spotify.com/v1/**", (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      return reply(route, 204);
    }
    const path = new URL(request.url()).pathname;
    mock.calls.push(`${request.method()} ${path}`);
    expect(request.headers().authorization).toBe("Bearer at1");
    if (path === "/v1/me") {
      return reply(route, 200, { id: "u1", display_name: "Test Lifter" });
    }
    if (path === "/v1/me/player/currently-playing") {
      const np = mock.nowPlaying;
      mock.served.push(np?.id ?? "nothing");
      return np == null
        ? reply(route, 204)
        : reply(route, 200, { is_playing: true, progress_ms: np.progressMs, item: track(np.id) });
    }
    if (path === "/v1/me/player/recently-played") {
      return reply(route, 200, { items: [] });
    }
    if (path === "/v1/me/playlists") {
      return reply(route, 404, { error: { status: 404 } });
    }
    if (path === "/v1/users/u1/playlists") {
      return reply(route, 201, { id: "pl1", external_urls: { spotify: "https://open.spotify.com/playlist/pl1" } });
    }
    if (path === "/v1/playlists/pl1/items") {
      mock.playlistItems.push(request.postDataJSON().uris);
      return reply(route, 201, { snapshot_id: "s1" });
    }
    if (path === "/v1/me/player/play") {
      return reply(route, 404, { error: { status: 404, reason: "NO_ACTIVE_DEVICE" } });
    }
    return reply(route, 500, { error: "unexpected" });
  });
  return mock;
}

test("tracks workout songs from Spotify and saves the kept ones as a playlist", async ({ page }) => {
  test.skip(appUrl == null, "Set MUSIC_PWA_URL to a served offline build");
  test.setTimeout(90000);
  page.on("dialog", (dialog) => dialog.accept());
  const mock = await mockSpotify(page);

  await page.goto(`${appUrl}?skipintro=1`);
  await PlaywrightUtils_disableTours(page);
  await PlaywrightUtils_selectBuiltin(page);
  await page.getByRole("button", { name: "Basic Beginner Routine" }).click();
  await page.getByTestId("clone-program").click();

  await page.getByTestId("footer-my-bear").click();
  await page.getByTestId("progress-all-stats").click();
  await page.getByTestId("reports-hub-music").click();
  await page.getByTestId("music-connect").click();

  await expect(page.getByTestId("music-account")).toContainText("Test Lifter");
  expect(mock.tokenBodies[0].get("grant_type")).toBe("authorization_code");
  expect(mock.tokenBodies[0].get("code")).toBe("test-code");
  expect(mock.tokenBodies[0].get("code_verifier")).toMatch(/^[A-Za-z0-9\-._~]{64}$/);
  expect(page.url()).not.toContain("code=");

  await PlaywrightUtils_disableTours(page);
  mock.nowPlaying = { id: "kept", progressMs: 120000 };
  await page.getByTestId("footer-workout").click();
  await page.getByTestId("bottom-sheet").getByTestId("start-empty-workout").click();
  await expect.poll(() => mock.served.includes("kept")).toBe(true);

  mock.nowPlaying = { id: "skipped", progressMs: 10000 };
  await expect.poll(() => mock.served.includes("skipped"), { timeout: 15000 }).toBe(true);
  await page.waitForTimeout(500);

  await page.getByTestId("exercise-filter-by-name").fill("Bench Press");
  await page.getByTestId("menu-item-bench-press-barbell").click();
  await page.getByTestId("exercise-picker-confirm").click();
  await page.getByTestId("add-workout-set").click();
  await PlaywrightUtils_typeKeyboard(page, page.getByTestId("input-set-reps-field").nth(0), "5");
  await PlaywrightUtils_typeKeyboard(page, page.getByTestId("input-set-weight-field").nth(0), "100");
  await page.getByTestId("complete-set").nth(0).click();
  await page.getByTestId("finish-workout").click();

  await page.getByTestId("finish-day-music").click();
  const session = page.getByTestId("music-session").first();
  await expect(session).toContainText("1 kept · 1 skipped");
  await expect(session.getByTestId("music-play-kept")).toBeVisible();
  await expect(session.getByTestId("music-play-skipped")).toBeVisible();

  await session.getByTestId("music-save").click();
  await expect(session.getByTestId("music-status")).toContainText("Saved 1 song to Spotify.");
  expect(mock.playlistItems).toEqual([["spotify:track:kept"]]);
  expect(mock.calls).toContain("POST /v1/me/playlists");
  expect(mock.calls).toContain("POST /v1/users/u1/playlists");

  await session.getByTestId("music-play").click();
  await expect(session.getByTestId("music-status")).toContainText("Open Spotify on your phone");
});
