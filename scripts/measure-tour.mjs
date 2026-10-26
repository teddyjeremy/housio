// Measures how long the tour takes to become interactive. Usage: BASE_URL=... node scripts/measure-tour.mjs
import { chromium } from "@playwright/test";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const slugs = ["westlands-parkside-residences", "kilimani-family-apartment", "runda-quiet-villa"];
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const results = [];
for (const slug of slugs) {
  for (let run = 0; run < 2; run++) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 } });
    const page = await ctx.newPage();
    let bytes = 0;
    page.on("response", async (r) => { const len = Number(r.headers()["content-length"] ?? 0); bytes += len; });
    const t0 = Date.now();
    await page.goto(`${base}/properties/${slug}/explore`, { waitUntil: "domcontentloaded" });
    const dcl = Date.now() - t0;
    await page.waitForSelector('[data-testid="scene-status"][data-ready="1"]', { timeout: 120000 });
    const ready = Date.now() - t0;
    let full = null;
    if (await page.locator('[data-testid="tour"]').count()) {
      await page.waitForSelector('[data-testid="tour"][data-stage="full"]', { timeout: 120000 });
      full = Date.now() - t0;
    }
    results.push({ slug, run, dcl, ready, full, kb: Math.round(bytes / 1024) });
    await ctx.close();
  }
}
console.table(results);
const median = (a) => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
console.log("median full ms", median(results.map((r) => r.full ?? r.ready)));
console.log("median ready ms", median(results.map((r) => r.ready)), "median transfer KB", median(results.map((r) => r.kb)));
await browser.close();
