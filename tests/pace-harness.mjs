// Shared harness for the Pace brain browser tests (playwright-core + any Chromium).
// Runs as a signed-in test account on the in-process mock Firebase (same as the older batteries).
import { chromium, webkit, devices } from "playwright-core";
import http from "http"; import fs from "fs"; import path from "path";
export const ROOT = process.env.APP_ROOT || process.cwd();
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".json": "application/json", ".png": "image/png", ".ttf": "font/ttf" };
const { startMock } = await import(path.join(ROOT, "tests/mock-firebase.mjs"));
export async function boot(port, opts = {}) {
  const mock = await startMock();
  const testConfig = `window.PACE_FB_CONFIG = { apiKey: "test-key-1234567890", authDomain: "x", projectId: "pace-test", appId: "1:x:web:y", googleClientId: null, appleEnabled: false, restAuth: "http://127.0.0.1:${mock.port}", restFirestore: "http://127.0.0.1:${mock.port}", restToken: "http://127.0.0.1:${mock.port}" };`;
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
    if (p === "/firebase-config.js") { res.writeHead(200, { "Content-Type": "text/javascript" }); res.end(testConfig); return; }
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end("nf"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" }); fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(port, r));
  const r = await fetch(`http://127.0.0.1:${mock.port}/v1/accounts:signUp?key=x`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: (opts.email || "u" + port) + "@test.dev", password: "password-12345", returnSecureToken: true }) });
  const A = await r.json();
  const sess = { uid: A.localId, email: A.email, idToken: A.idToken, refreshToken: A.refreshToken, expiresAt: Date.now() + 3600e3 };
  const WK = process.env.PACE_BROWSER === "webkit"; /* WebKit = the engine inside iPhone apps (WKWebView) */
  const browser = WK ? await webkit.launch() : await chromium.launch({ executablePath: process.env.CHROME_EXE, args: ["--no-sandbox"] });
  const ctx = await browser.newContext(WK ? { ...devices["iPhone 13"], viewport: opts.viewport || devices["iPhone 13"].viewport } : { viewport: opts.viewport || { width: 390, height: 800 } });
  const page = await ctx.newPage();
  await page.addInitScript((s) => { if (!localStorage.getItem("pace-auth-v1")) localStorage.setItem("pace-auth-v1", JSON.stringify(s)); }, sess);
  const errors = [];
  page.on("pageerror", e => { /* WebKit logs every failed (already-handled) fetch while offline as "Load failed" + the URL; not an app error */ if (WK && (/^(TypeError: )?Load failed$/.test(e.message) || /^\/?127\.0\.0\.1:\d+\/v1\//.test(e.message))) return; errors.push("pageerror: " + e.message); });
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource|net::/i.test(m.text())) errors.push("console: " + m.text()); });
  await page.goto("http://localhost:" + port + "/", { waitUntil: "networkidle" });
  await page.locator("#welcomeSkip").click({ timeout: 2000 }).catch(() => {});
  await page.locator("#guideSkip").click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(300);
  const store = () => page.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1:" + JSON.parse(localStorage.getItem("pace-auth-v1")).uid)));
  return { page, ctx, browser, server, errors, mock, sess, store, close: async () => { await browser.close(); server.close(); } };
}
let pass = 0, fail = 0; const fails = [];
export function check(name, cond) { if (cond) { pass++; console.log("PASS " + name); } else { fail++; fails.push(name); console.log("FAIL " + name); } }
export function summary() { console.log("\n" + pass + " passed, " + fail + " failed"); if (fail) console.log("FAILED: " + fails.join(" | ")); return fail; }
