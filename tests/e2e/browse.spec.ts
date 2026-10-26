import { expect, test } from "@playwright/test";

test("homepage shows brand, demo logins and featured stays", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Don't just see it. Experience it.").first()).toBeVisible();
  for (const role of ["guest", "owner", "admin"]) await expect(page.getByTestId(`demo-${role}`)).toBeVisible();
  await expect(page.getByTestId("property-card").first()).toBeVisible();
});

test("search lists all ten demo stays and filters by neighbourhood", async ({ page }) => {
  await page.goto("/search");
  await expect(page.getByTestId("property-card")).toHaveCount(10);
  expect(await page.locator("body").innerText()).not.toMatch(/\bdemo\b|illustrative/i);
  await page.goto("/search?neighbourhood=kitisuru");
  await expect(page.getByTestId("property-card")).toHaveCount(2);
  await page.goto("/search?neighbourhood=kilimani");
  await expect(page.getByTestId("property-card")).toHaveCount(2);
});

test("property page shows TrueView, amenities and a priced booking panel", async ({ page }) => {
  await page.goto("/properties/westlands-parkside-residences");
  await expect(page.getByTestId("trueview").first()).toBeVisible();
  await expect(page.getByTestId("amenities")).toBeVisible();
  await expect(page.getByTestId("booking-panel")).toBeVisible();
});

test("360° tour loads progressively, switches rooms and falls back without WebGL", async ({ page }) => {
  await page.goto("/properties/kilimani-family-apartment/explore");
  await expect(page.getByTestId("scene-status")).toHaveAttribute("data-ready", "1", { timeout: 30_000 });
  await expect(page.getByTestId("tour")).toHaveAttribute("data-stage", "full", { timeout: 30_000 });
  await page.getByRole("button", { name: "Kitchen" }).click();
  await expect(page.getByTestId("tour")).toContainText("Kitchen");
  const viewer = page.getByRole("application");
  await viewer.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("PageDown");
  await expect(page.getByTestId("tour")).toContainText("Main bedroom");
  await page.getByRole("tab", { name: "Floor plan" }).click();
  await page.locator("svg [data-space]").filter({ hasText: /bathroom/i }).first().click();
  await expect(page.getByTestId("tour")).toContainText("Bathroom");
  await page.goto("/properties/kilimani-family-apartment/explore?no3d=1");
  await expect(page.getByTestId("explore-fallback")).toBeVisible();
});

test("listing pages carry structured data and no internal labels", async ({ page }) => {
  await page.goto("/properties/runda-quiet-villa");
  const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').last().innerText());
  expect(ld["@type"]).toBe("House");
  expect(ld.aggregateRating).toBeUndefined();
  expect(ld.address.streetAddress).toBeUndefined();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/properties\/runda-quiet-villa$/);
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/\bdemo\b|illustrative|simulated|sample listing/i);
});

test("Around lists sourced nearby places", async ({ page }) => {
  await page.goto("/properties/karen-garden-cottage/around");
  const around = page.getByTestId("around");
  await expect(around).toBeVisible();
  await expect(around.getByRole("link", { name: /openstreetmap/i }).first()).toHaveAttribute("href", /openstreetmap\.org/);
});

test("Compare and Fit work from shareable URLs", async ({ page }) => {
  await page.goto("/compare?ids=westlands-parkside-residences,karen-garden-cottage,runda-quiet-villa");
  await expect(page.getByTestId("compare-table")).toBeVisible();
  await expect(page.getByTestId("compare-table")).toContainText("Runda");
  await page.goto("/fit?want=work,parking,near_hospital");
  await expect(page.getByTestId("fit-results")).toBeVisible();
  await expect(page.getByTestId("fit-score").first()).toBeVisible();
});

test("protected areas redirect to sign in", async ({ page }) => {
  await page.goto("/owner");
  await expect(page).toHaveURL(/\/login/);
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("homepage and search fit a phone screen", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByTestId("property-card").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
