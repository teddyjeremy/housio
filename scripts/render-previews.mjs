// Renders illustrative preview images from the 3D room builder for each listing.
// Usage: start the app, then BASE_URL=http://localhost:3000 node scripts/render-previews.mjs
import { chromium } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const slugs = JSON.parse(readFileSync("data/anchors.json", "utf8")).map((a) => a.slug);
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
for (const slug of slugs) {
  for (const [n, room] of [[1, ""], [2, "&room=0"]]) {
    const out = `public/renders/${slug}-${n}.jpg`;
    if (existsSync(out) && !process.env.FORCE) continue;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
    await page.goto(`${base}/properties/${slug}/explore?render=1${room}`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="scene-status"][data-ready="1"]', { timeout: 120000 });
    await page.waitForTimeout(4000);
    const canvas = page.locator('[data-testid="explore"] canvas').first();
    await canvas.screenshot({ path: out, type: "jpeg", quality: 82 });
    console.log("rendered", slug, n);
        break;
      } catch (err) {
        console.warn("retry", slug, n, attempt, err.message.split("\n")[0]);
      }
    }
  }
}
await browser.close();
