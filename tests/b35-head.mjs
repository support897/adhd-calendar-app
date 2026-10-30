// Pace build 35 checks: all free, tickable calendar blocks, business goal planner (30 Oct 2026).
// Same setup as browser-check.mjs.
// Build-33 battery care (29 Oct): Polar's line (builds 24-32) emptied
// the guest samples (Empty-Start: 0 seed tasks, was 8), redesigned the
// habit card (habit-card + .hw-day week buttons + "N day streak" stats,
// rendered by goals-ui.js) and expanded Skip's tour (name -> empty ->
// feeling -> looks (the 2 free looks) -> task -> import -> reminders ->
// panel stops). The legs below pin the CURRENT shapes; every leg's
// substance (todo promotes/demotes, habit adds/ticks/streaks/survives,
// the tour teaches and stays done) is unchanged.
import { chromium } from "playwright-core";
import http from "http"; import fs from "fs"; import path from "path";
const ROOT = process.env.APP_ROOT || "/Users/ilse/Apps/adhd-calendar-app";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
/* Battery care (29 Oct, build 33's door lock): no usable guest app
   remains, so every context runs as its own signed-in harness
   account on the mock; in-page store reads derive the uid key from
   the session itself. Feature substance unchanged. */
const { startMock } = await import(path.join(ROOT, "tests/mock-firebase.mjs"));
const mock = await startMock();
const testConfig = `window.PACE_FB_CONFIG = { apiKey: "test-key-1234567890", authDomain: "x", projectId: "pace-test", appId: "1:x:web:y", googleClientId: null, appleEnabled: false, restAuth: "http://127.0.0.1:${mock.port}", restFirestore: "http://127.0.0.1:${mock.port}", restToken: "http://127.0.0.1:${mock.port}" };`;
async function mkSess(email) {
  const r = await fetch(`http://127.0.0.1:${mock.port}/v1/accounts:signUp?key=x`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "password-1", returnSecureToken: true }) });
  const A = await r.json();
  return { uid: A.localId, email: A.email, idToken: A.idToken, refreshToken: A.refreshToken, expiresAt: Date.now() + 3600e3 };
}
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html"; if (p === "/firebase-config.js") { res.writeHead(200, { "Content-Type": "text/javascript" }); res.end(testConfig); return; } const file = path.join(ROOT, p); if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" }); fs.createReadStream(file).pipe(res); });
await new Promise(r => server.listen(8919, r));
let pass = 0, fail = 0; const check = (n, c) => { if (c) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE || "/home/hatch/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell", args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript((s) => { localStorage.setItem("pace-auth-v1", JSON.stringify(s)); }, await mkSess("f1@test.dev"));
const errors = []; page.on("pageerror", e => errors.push(e.message));
await page.goto("http://localhost:8919/", { waitUntil: "networkidle" });
await page.click("#welcomeSkip");
await page.locator("#guideSkip").click({ timeout: 900 }).catch(() => {});
const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1:" + JSON.parse(localStorage.getItem("pace-auth-v1")).uid)));
