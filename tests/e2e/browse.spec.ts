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

test("Explore loads the 3D scene and falls back to the floor plan", async ({ page }) => {
  await page.goto("/properties/kilimani-family-apartment/explore");
  await expect(page.getByTestId("scene-status")).toHaveAttribute("data-ready", "1", { timeout: 90_000 });
  await page.goto("/properties/kilimani-family-apartment/explore?no3d=1");
  // Without 3D the viewer falls back to the floor plan, and the 3D tab explains why.
  await expect(page.locator("svg").filter({ hasText: /bedroom/i }).first()).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "3D view" })).toBeDisabled();
  await expect(page.getByRole("tab", { name: "Floor plan" })).toHaveAttribute("aria-selected", "true");
  await page.goto("/properties/kilimani-family-apartment/explore?mode=plan");
  await expect(page.locator("svg").filter({ hasText: /bedroom/i }).first()).toBeVisible();
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
