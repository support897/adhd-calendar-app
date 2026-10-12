// Pace v2 checks: brand, fully collapsible sidebar, themes, cute mode, icons, ring.
// Same setup as browser-check.mjs. Also writes the v2 proof screenshots.
import { chromium } from "playwright-core";
import http from "http"; import fs from "fs"; import path from "path";
const ROOT = process.env.APP_ROOT || "/home/hatch/workspace/adhd-calendar-app";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html"; const file = path.join(ROOT, p); if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" }); fs.createReadStream(file).pipe(res); });
await new Promise(r => server.listen(8915, r));
let pass = 0, fail = 0; const check = (n, c) => { if (c) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE || "/home/hatch/.cache/ms-playwright/chromium-1187/chrome-linux/chrome", args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = []; page.on("pageerror", e => errors.push(e.message));
await page.goto("http://localhost:8915/", { waitUntil: "networkidle" });
check("brand: page title is Pace", (await page.title()) === "Pace");
check("brand: sidebar shows the Pace wordmark", /Pace/.test(await page.locator(".brand-name").textContent()));
check("brand: logo mark renders in the sidebar", await page.locator(".brand .brand-mark").isVisible());
check("icons: nav items use svg icons", (await page.locator(".side-item svg.ico").count()) === 4);
await page.click("#welcomeSkip");
check("ring: today's progress ring is in the sidebar", await page.locator(".side-ring").isVisible() && /%/.test(await page.locator("#ringPct").textContent()));

// Sidebar collapse: completely gone, one-tap return, remembered.
await page.click("#sbCollapse"); await page.waitForTimeout(200);
const sbBox = await page.locator("#sidebar").boundingBox();
check("collapse: sidebar is completely gone", sbBox === null);
check("collapse: expand button appears", await page.locator("#sbExpand").isVisible());
await page.reload({ waitUntil: "networkidle" });
check("collapse: still collapsed after reload", (await page.locator("#sidebar").boundingBox()) === null);
await page.click("#sbExpand"); await page.waitForTimeout(200);
check("expand: sidebar returns", (await page.locator("#sidebar").boundingBox()) !== null);

// Themes via Settings.
await page.click('.side-item[data-panel="settings"]'); await page.waitForTimeout(200);
await page.click('.swatch[data-theme-set="dark"]'); await page.waitForTimeout(250);
const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
check("theme: dark applies a dark ground", darkBg === "rgb(22, 22, 24)");
await page.reload({ waitUntil: "networkidle" });
check("theme: dark survives reload", (await page.evaluate(() => document.documentElement.getAttribute("data-theme"))) === "dark");
await page.click('.side-item[data-panel="settings"]'); await page.waitForTimeout(150);
await page.click('.swatch[data-theme-set="blush"]'); await page.waitForTimeout(600);
const blushBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
check("theme: blush applies its tint", blushBg === "rgb(255, 248, 250)");

// Cute mode.
await page.check("#cuteToggle"); await page.waitForTimeout(250);
check("cute: data-cute set on the page", (await page.evaluate(() => document.documentElement.getAttribute("data-cute"))) === "1");
const cuteRadius = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--radius").trim());
check("cute: corners get rounder", cuteRadius === "16px");
await page.reload({ waitUntil: "networkidle" });
check("cute: survives reload", (await page.evaluate(() => document.documentElement.getAttribute("data-cute"))) === "1");
await page.screenshot({ path: ROOT + "/proofs/cute-blush.png" });
// Back to calm defaults for the rest.
await page.click('.side-item[data-panel="settings"]'); await page.waitForTimeout(150);
await page.uncheck("#cuteToggle");
await page.click('.swatch[data-theme-set="dark"]'); await page.waitForTimeout(250);
await page.click('.side-item[data-panel="calendar"]'); await page.waitForTimeout(300);
await page.screenshot({ path: ROOT + "/proofs/dark-desktop.png" });
await page.click('.side-item[data-panel="settings"]'); await page.waitForTimeout(150);
await page.click('.swatch[data-theme-set="white"]'); await page.waitForTimeout(200);
await page.click('.side-item[data-panel="calendar"]'); await page.waitForTimeout(250);
await page.click("#sbCollapse"); await page.waitForTimeout(300);
check("collapse: calendar still works with menu hidden", await page.locator("#calendarWrap").isVisible());
await page.screenshot({ path: ROOT + "/proofs/collapsed-desktop.png" });
await page.click("#sbExpand"); await page.waitForTimeout(200);

// Phone: rail beside content, collapse works there too.
const mob = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
mob.on("pageerror", e => errors.push("mob: " + e.message));
await mob.goto("http://localhost:8915/", { waitUntil: "networkidle" });
await mob.click("#welcomeSkip");
const rail = await mob.locator("#sidebar").boundingBox();
const main = await mob.locator("#main").boundingBox();
check("phone: sidebar is a rail beside the content", !!rail && !!main && rail.x + rail.width <= main.x + 1 && rail.width <= 90);
await mob.click("#sbCollapse"); await mob.waitForTimeout(200);
check("phone: menu hides completely there too", (await mob.locator("#sidebar").boundingBox()) === null && await mob.locator("#sbExpand").isVisible());
check("no page errors", errors.length === 0);
if (errors.length) console.log("ERRORS: " + errors.join(" | "));
console.log("RESULT pass=" + pass + " fail=" + fail);
await browser.close(); server.close(); process.exit(fail ? 1 : 0);
