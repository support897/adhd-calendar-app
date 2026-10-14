// Pace v2 checks: brand, fully collapsible sidebar, themes, cute mode, icons, ring.
// Same setup as browser-check.mjs. Also writes the v2 proof screenshots.
// Hardened (14 Oct, per QA): every wait is on STATE (guide dismissed, sidebar
// geometry, theme attribute), never on fixed sleeps — the suite must survive
// a loaded machine.
import { chromium } from "playwright-core";
import http from "http"; import fs from "fs"; import path from "path";
const ROOT = process.env.APP_ROOT || "/home/hatch/workspace/adhd-calendar-app";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html"; const file = path.join(ROOT, p); if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" }); fs.createReadStream(file).pipe(res); });
await new Promise(r => server.listen(8915, r));
let pass = 0, fail = 0; const check = (n, c) => { if (c) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE || "/home/hatch/.cache/ms-playwright/chromium-1187/chrome-linux/chrome", args: ["--no-sandbox"] });

/* state helpers — wait for the app to BE somewhere, not for a clock */
async function dismissGuide(p) {
  if (await p.locator("#guideSheet").isVisible().catch(() => false)) {
    await p.click("#guideSkip");
    await p.waitForFunction(() => document.getElementById("guideSheet").hidden);
  }
}
async function sbOpen(p) {
  if (await p.evaluate(() => document.getElementById("sidebar").getBoundingClientRect().width === 0)) {
    await dismissGuide(p);
    await p.click("#sbExpand");
  }
  await p.waitForFunction(() => document.getElementById("sidebar").getBoundingClientRect().width > 0);
}
async function sbShut(p) {
  await p.click("#sbCollapse");
  await p.waitForFunction(() => document.getElementById("sidebar").getBoundingClientRect().width === 0);
}
async function sbIsShut(p) {
  await p.waitForFunction(() => document.getElementById("sidebar").getBoundingClientRect().width === 0);
}
async function nav(p, panel) {
  await sbOpen(p);
  await p.click('.side-item[data-panel="' + panel + '"]');
  await p.locator("#panel-" + panel).waitFor({ state: "visible" });
}
async function themeIs(p, name) {
  await p.waitForFunction(n => document.documentElement.getAttribute("data-theme") === n, name);
}

const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = []; page.on("pageerror", e => errors.push(e.message));
await page.goto("http://localhost:8915/", { waitUntil: "networkidle" });
await page.click("#welcomeSkip");
await dismissGuide(page);
check("brand: page title is Pace Calendar", (await page.title()) === "Pace Calendar");
// Sidebar Adaptive Law (14 Oct): hidden by default, app takes the full screen.
check("law: sidebar hidden by default", (await page.locator("#sidebar").boundingBox()) === null);
check("law: expand button is the way in", await page.locator("#sbExpand").isVisible());
const mainHidden = await page.locator("#main").boundingBox();
check("law: content uses the full screen when hidden (centred, not pushed by a phantom column)", mainHidden.x < 200 && mainHidden.width >= 1000);
await sbOpen(page);
check("brand: sidebar shows the Pace wordmark", /Pace/.test(await page.locator(".brand-name").textContent()));
check("brand: logo mark renders in the sidebar", await page.locator(".brand .brand-mark").isVisible());
check("icons: nav items use svg icons", (await page.locator(".side-item svg.ico").count()) === 6);
check("ring: today's progress ring is in the sidebar", await page.locator(".side-ring").isVisible() && /%/.test(await page.locator("#ringPct").textContent()));

// Sidebar collapse: completely gone, one-tap return; every load starts hidden.
await sbShut(page);
check("collapse: sidebar is completely gone", (await page.locator("#sidebar").boundingBox()) === null);
check("collapse: expand button appears", await page.locator("#sbExpand").isVisible());
await page.reload({ waitUntil: "networkidle" });
await sbIsShut(page);
check("collapse: still collapsed after reload", (await page.locator("#sidebar").boundingBox()) === null);
await sbOpen(page);
check("expand: sidebar returns", (await page.locator("#sidebar").boundingBox()) !== null);
await page.reload({ waitUntil: "networkidle" });
await sbIsShut(page);
check("law: reload after opening starts hidden again", (await page.locator("#sidebar").boundingBox()) === null);

// Themes via Settings.
await nav(page, "settings");
await page.click('.swatch[data-theme-set="dark"]'); await themeIs(page, "dark");
await page.waitForFunction(() => getComputedStyle(document.body).backgroundColor === "rgb(20, 31, 27)");
check("theme: dark applies a dark ground", true);
await page.reload({ waitUntil: "networkidle" });
check("theme: dark survives reload", (await page.evaluate(() => document.documentElement.getAttribute("data-theme"))) === "dark");
await nav(page, "settings");
await page.click('.swatch[data-theme-set="blush"]'); await themeIs(page, "blush");
await page.waitForFunction(() => getComputedStyle(document.body).backgroundColor === "rgb(255, 248, 250)");
check("theme: blush applies its tint", true);

// Cute mode.
await page.check("#cuteToggle");
await page.waitForFunction(() => document.documentElement.getAttribute("data-cute") === "1");
check("cute: data-cute set on the page", true);
const cuteRadius = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--radius").trim());
check("cute: corners get rounder", cuteRadius === "16px");
await page.reload({ waitUntil: "networkidle" });
check("cute: survives reload", (await page.evaluate(() => document.documentElement.getAttribute("data-cute"))) === "1");
await page.screenshot({ path: ROOT + "/proofs/cute-blush.png" });
// Back to calm defaults for the rest.
await nav(page, "settings");
await page.uncheck("#cuteToggle");
await page.waitForFunction(() => document.documentElement.getAttribute("data-cute") === null);
await page.click('.swatch[data-theme-set="dark"]'); await themeIs(page, "dark");
await nav(page, "calendar");
await page.screenshot({ path: ROOT + "/proofs/dark-desktop.png" });
await nav(page, "settings");
await page.click('.swatch[data-theme-set="white"]'); await themeIs(page, "white");
await nav(page, "calendar");
await sbShut(page);
check("collapse: calendar still works with menu hidden", await page.locator("#calendarWrap").isVisible());
await page.screenshot({ path: ROOT + "/proofs/collapsed-desktop.png" });

// Phone: hidden by default; when opened, a rail beside the content.
const mob = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
mob.on("pageerror", e => errors.push("mob: " + e.message));
await mob.goto("http://localhost:8915/", { waitUntil: "networkidle" });
await mob.click("#welcomeSkip");
await dismissGuide(mob);
check("phone: menu hidden by default too", (await mob.locator("#sidebar").boundingBox()) === null && await mob.locator("#sbExpand").isVisible());
await sbOpen(mob);
const rail = await mob.locator("#sidebar").boundingBox();
const main = await mob.locator("#main").boundingBox();
check("phone: sidebar is a rail beside the content", !!rail && !!main && rail.x + rail.width <= main.x + 1 && rail.width <= 90);
await sbShut(mob);
check("phone: menu hides completely there too", (await mob.locator("#sidebar").boundingBox()) === null && await mob.locator("#sbExpand").isVisible());
check("no page errors", errors.length === 0);
if (errors.length) console.log("ERRORS: " + errors.join(" | "));
console.log("RESULT pass=" + pass + " fail=" + fail);
await browser.close(); server.close(); process.exit(fail ? 1 : 0);
