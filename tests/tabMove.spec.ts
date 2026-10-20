import { test, expect, Page } from "@playwright/test";
import { PlaywrightUtils_disableTours } from "./playwrightUtils";

const appUrl = process.env.TAB_MOVE_PWA_URL;

test.use({ browserName: "chromium", serviceWorkers: "block" });

async function start(page: Page): Promise<void> {
  test.skip(appUrl == null, "Set TAB_MOVE_PWA_URL to a served offline build");
  await page.goto(`${appUrl}?skipintro=1`);
  await PlaywrightUtils_disableTours(page);
}

async function back(page: Page): Promise<void> {
  await page.locator('[data-testid="navbar-back"]:visible').click();
}

test("onboarding program preview returns through the chooser to Progress", async ({ page }) => {
  await start(page);
  await page.getByTestId("program-select-builtin").click();
  await expect(page.getByTestId("footer-friends")).toBeVisible();
  await expect(page.getByTestId("footer-program")).toHaveCount(0);
  await page.getByRole("button", { name: "Basic Beginner Routine", exact: true }).click();
  await page.getByTestId("preview-program").click();
  await expect(page.getByTestId("program-name")).toBeVisible();
  await back(page);
  await expect(page.getByTestId("program-search")).toBeVisible();
  await back(page);
  await expect(page.getByTestId("progress-dashboard")).toBeVisible();
  await page.getByTestId("footer-home").click();
  await expect(page.getByTestId("program-search")).toBeVisible();
  await back(page);
  await expect(page.getByTestId("progress-dashboard")).toBeVisible();
});

test("a new program and the Program card retain a back arrow to Progress", async ({ page }) => {
  await start(page);
  await page.getByTestId("program-select-create").click();
  await page.getByTestId("modal-create-program-input").fill("Tab route test");
  await page.getByTestId("modal-create-program-submit").click();
  await expect(page.getByTestId("tab-edit")).toBeVisible();
  await back(page);
  await expect(page.getByTestId("progress-program")).toContainText("Tab route test");
  await page.getByTestId("progress-program").click();
  await expect(page.getByTestId("tab-edit")).toBeVisible();
  await back(page);
  await expect(page.getByTestId("progress-dashboard")).toBeVisible();
  await page.getByTestId("footer-friends").click();
  await expect(page.getByTestId("friends-signed-out")).toBeVisible();
});

test("cloning a percentage program opens 1RM setup on Progress", async ({ page }) => {
  await start(page);
  await page.getByTestId("program-select-builtin").click();
  await page.getByRole("button", { name: "5/3/1 For Beginners", exact: true }).click();
  await page.getByTestId("clone-program").click();
  await expect(page.getByText("Set 1 Rep Maxes", { exact: true })).toBeVisible();
  await back(page);
  await expect(page.getByTestId("program-search")).toBeVisible();
  await back(page);
  await expect(page.getByTestId("progress-dashboard")).toBeVisible();
});
