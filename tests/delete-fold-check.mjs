// Pace — v2.4 fold battery: the in-app account deletion takes the
// subscriptions/{uid} record with the rest of the footprint (rules
// v2.4 owner-delete arm + the sweep's new chain step). Drives the
// REAL app against the mock (which emulates the v2.4 shape via
// mayDelete) with a staged subscriptions record; a second account's
// record is the no-collateral control.
import { chromium } from "playwright-core";
import http from "http"; import fs from "fs"; import path from "path";
import { startMock } from "./mock-firebase.mjs";
const ROOT = "/Users/ilse/Apps/adhd-calendar-app";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".png": "image/png" };
const mock = await startMock();
const testConfig = `window.PACE_FB_CONFIG = { apiKey: "test-key-1234567890", authDomain: "x", projectId: "pace-test", appId: "1:x:web:y", googleClientId: null, appleEnabled: false, restAuth: "http://127.0.0.1:${mock.port}", restFirestore: "http://127.0.0.1:${mock.port}", restToken: "http://127.0.0.1:${mock.port}" };`;
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
  if (p === "/firebase-config.js") { res.writeHead(200, { "Content-Type": "text/javascript" }); res.end(testConfig); return; }
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(9141, r));
let pass = 0, fail = 0;
const check = (n, ok) => { console.log((ok ? "PASS " : "FAIL ") + n); ok ? pass++ : fail++; };
async function signUp(email, password) {
  const r = await fetch(`http://127.0.0.1:${mock.port}/v1/accounts:signUp?key=x`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
  return r.json();
}
const A = await signUp("fold-a@test.dev", "password-a");
const B = await signUp("fold-b@test.dev", "password-b");
const stateJson = JSON.stringify({ tasks: [], feelings: {}, checks: {}, habitLog: {}, habits: [], todos: [], imports: [], settings: { guideDone: true, profileName: "Fold" }, welcomed: true, samplesLoaded: true });
for (const u of [A, B]) {
  mock.docs.set("users/" + u.localId, { createdAt: new Date().toISOString(), lastActiveAt: new Date().toISOString(), deletedByUser: false });
  mock.docs.set("users/" + u.localId + "/data/state", { stateJson, updatedAt: new Date().toISOString() });
  mock.docs.set("aggSignups/" + u.localId, { createdAt: new Date().toISOString() });
  mock.docs.set("aggImports/" + u.localId, { events: 1, imports: 1, at: new Date().toISOString() });
  mock.docs.set("subscriptions/" + u.localId, { entitlement: "plus", status: "active" });
}
check("staged: A's full footprint incl. subscriptions stands", !!mock.docs.get("subscriptions/" + A.localId) && !!mock.docs.get("users/" + A.localId));
const b = await chromium.launch({ executablePath: process.env.CHROME_EXE, args: ["--no-sandbox"] });
const ctx = await b.newContext({ viewport: { width: 540, height: 960 }, serviceWorkers: "block" });
const p = await ctx.newPage();
p.setDefaultTimeout(9000);
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
await p.addInitScript((s) => { localStorage.setItem("pace-auth-v1", JSON.stringify(s)); }, { uid: A.localId, email: A.email, idToken: A.idToken, refreshToken: A.refreshToken, expiresAt: Date.now() + 3600e3 });
await p.goto("http://localhost:9141/", { waitUntil: "networkidle" });
await p.waitForTimeout(1200);
// clear any first-run sheets (guarded — a missing sheet is fine)
for (const sel of ["#welcomeSkip", "#guideSkip", "#nameSkip", "#tourSkip"]) {
  if (await p.locator(sel).isVisible().catch(() => false)) { await p.click(sel).catch(() => {}); await p.waitForTimeout(300); }
}
await p.evaluate(() => { const sb = document.getElementById("sidebar"); if (sb && sb.getBoundingClientRect().width < 40) document.getElementById("sbExpand").click(); });
await p.click('.side-item[data-panel="settings"]'); await p.waitForTimeout(500);
await p.click("#accountDelete"); await p.waitForSelector("#deleteSheet:not([hidden])");
await p.fill("#deletePass", "password-a"); await p.click("#deleteGo");
for (let i = 0; i < 60 && (mock.docs.get("users/" + A.localId) || mock.docs.get("subscriptions/" + A.localId) || mock.users.has("fold-a@test.dev")); i++) await p.waitForTimeout(250);
check("sweep removed A's state + spine", !mock.docs.get("users/" + A.localId) && !mock.docs.get("users/" + A.localId + "/data/state"));
check("sweep removed A's shards", !mock.docs.get("aggSignups/" + A.localId) && !mock.docs.get("aggImports/" + A.localId));
check("sweep removed A's SUBSCRIPTIONS record (v2.4 fold)", !mock.docs.get("subscriptions/" + A.localId));
check("sweep removed A's auth user", !mock.users.has("fold-a@test.dev"));
check("control: B's subscriptions record untouched", !!mock.docs.get("subscriptions/" + B.localId) && mock.users.has("fold-b@test.dev"));
check("zero page errors", errors.length === 0, errors[0] || "");
console.log(`RESULT pass=${pass} fail=${fail}`);
await b.close(); server.close();
process.exit(fail ? 1 : 0);
