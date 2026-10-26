import { expect, test } from "@playwright/test";
import { demoSignIn, futureDate } from "./helpers";

test("guest books, pays (simulated) and cancels", async ({ page }) => {
  await demoSignIn(page, "guest");
  const start = 120 + Math.floor(Math.random() * 100);
  await page.goto(`/properties/langata-forest-edge-apartment?checkin=${futureDate(start)}&checkout=${futureDate(start + 3)}&guests=2`);
  const panel = page.getByTestId("booking-panel");
  await panel.locator('input[name="checkin"]').fill(futureDate(start));
  await panel.locator('input[name="checkout"]').fill(futureDate(start + 3));
  await expect(panel.getByTestId("quote-total")).toBeVisible();
  await panel.getByRole("button", { name: "Reserve" }).click();
  await expect(page).toHaveURL(/\/checkout\/HS-/);
  await page.getByTestId("pay").click();
  await expect(page).toHaveURL(/\/account\/bookings\/HS-.*confirmed=1/);
  await page.getByTestId("cancel").click();
  await page.getByTestId("confirm-cancel").click();
  await expect(page.getByText(/cancelled/i).first()).toBeVisible();
});

test("guest sees the completed stay as reviewable", async ({ page }) => {
  await demoSignIn(page, "guest");
  await page.goto("/account/bookings/HS-DEMOPAST");
  await expect(page.getByText(/completed/i).first()).toBeVisible();
});

test("owner sees Owner Studio and admin sees the review queue", async ({ page }) => {
  await demoSignIn(page, "owner");
  await expect(page.getByTestId("owner-stats")).toBeVisible();
  await expect(page.getByTestId("owner-properties")).toContainText("Parkside");
  await page.goto("/admin");
  await expect(page).not.toHaveURL(/\/admin$/);
  await page.context().clearCookies();
  await demoSignIn(page, "admin");
  await expect(page.getByTestId("admin-counts")).toBeVisible();
  await page.goto("/admin/listings");
  await expect(page.getByTestId("review-queue")).toBeVisible();
});
