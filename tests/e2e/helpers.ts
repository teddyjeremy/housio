import { expect, type Page } from "@playwright/test";

export async function demoSignIn(page: Page, role: "guest" | "owner" | "admin") {
  await page.goto("/");
  await page.getByTestId(`demo-${role}`).first().click();
  await expect(page).toHaveURL(new RegExp(role === "guest" ? "/account" : `/${role}`));
}

export function futureDate(offsetDays: number) {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}
