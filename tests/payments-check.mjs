// Payments wiring battery — the entitlement layer (Finance
// §3). The unlock rule, the free month, and the construction
// proof that the client never writes the record. Run:
//   TZ=Australia/Sydney node tests/payments-check.mjs
import { chromium } from "/home/hatch/node_modules/playwright-core/index.mjs";
import http from "http"; import fs from "fs"; import path from "path";
import { startMock } from "./mock-firebase.mjs";
const DIR = path.resolve(process.cwd());
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest", ".png": "image/png", ".ttf": "font/ttf" };
const mockPre = await startMock();
const testConfigPre = `window.PACE_FB_CONFIG = { apiKey: "test-key-1234567890", authDomain: "x", projectId: "pace-test", appId: "1:x:web:y", googleClientId: null, appleEnabled: false, restAuth: "http://127.0.0.1:${mockPre.port}", restFirestore: "http://127.0.0.1:${mockPre.port}", restToken: "http://127.0.0.1:${mockPre.port}" };`;
const server = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, "http://x").pathname); if (p === "/firebase-config.js") { res.writeHead(200, { "Content-Type": "text/javascript" }); return res.end(testConfigPre); } const f = path.join(DIR, p === "/" ? "index.html" : p); if (!f.startsWith(DIR) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "text/plain" }); res.end(fs.readFileSync(f)); });
await new Promise((r) => server.listen(9131, r));
const mock = mockPre;
let pass = 0, fail = 0; const check = (n, ok) => { console.log((ok ? "PASS " : "FAIL ") + n); ok ? pass++ : fail++; };
const b = await chromium.launch({ executablePath: "/home/hatch/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell", args: ["--no-sandbox"] });
const ctx = await b.newContext({ viewport: { width: 540, height: 960 } });
const p = await ctx.newPage();
const errors = []; p.on("pageerror", (e) => errors.push(e.message));
await p.goto("http://localhost:9131/", { waitUntil: "networkidle" });
await p.waitForFunction(() => window.PaceBilling && window.PaceFB, null, { timeout: 9000 }).catch(() => {});
const DAY = 864e5, iso = (ms) => new Date(ms).toISOString();
const NOW = Date.now();

/* ---- the unlock rule, record by record (stub reads) ---- */
const evals = await p.evaluate(async ({ DAY, NOW }) => {
  const B = window.PaceBilling;
  const iso = (ms) => new Date(ms).toISOString();
  const stub = (rec) => ({ fsGet: () => Promise.resolve(rec) });
  const out = {};
  const old = iso(NOW - 40 * DAY); // spine beyond the free month
  out.noRecordOldAccount = await B.refresh(stub(null), "u1", old).then(() => B.plusActive());
  out.plusActiveRec = await B.refresh(stub({ entitlement: "plus", status: "active", product: "pace_plus_monthly", period_ends_at: iso(NOW + 10 * DAY) }), "u1", old).then(() => B.plusActive());
  out.plusTrialing = await B.refresh(stub({ entitlement: "plus", status: "trialing", trial_ends_at: iso(NOW + 20 * DAY), period_ends_at: iso(NOW + 20 * DAY) }), "u1", old).then(() => B.plusActive());
  out.lifetimeForever = await B.refresh(stub({ entitlement: "lifetime", status: "active", product: "pace_lifetime" }), "u1", old).then(() => B.plusActive());
  out.cancelledPastPeriod = await B.refresh(stub({ entitlement: "plus", status: "cancelled", period_ends_at: iso(NOW - DAY) }), "u1", old).then(() => B.plusActive());
  out.activePastPeriod = await B.refresh(stub({ entitlement: "plus", status: "active", period_ends_at: iso(NOW - DAY) }), "u1", old).then(() => B.plusActive());
  out.pastDue = await B.refresh(stub({ entitlement: "plus", status: "past_due", period_ends_at: iso(NOW + 10 * DAY) }), "u1", old).then(() => B.plusActive());
  out.otherEntitlement = await B.refresh(stub({ entitlement: "studio", status: "active" }), "u1", old).then(() => B.plusActive());
  out.freeMonthNoRecord = await B.refresh(stub(null), "u2", iso(NOW - 5 * DAY)).then(() => B.plusActive());
  out.freeMonthSource = B.state().source;
  out.recordBeatsFreeMonthEnd = await B.refresh(stub({ entitlement: "plus", status: "active", period_ends_at: iso(NOW + 90 * DAY) }), "u3", iso(NOW - 29 * DAY)).then(() => ({ plus: B.plusActive(), until: B.state().until }));
  return out;
}, { DAY, NOW });
check("no record + account past its free month: locked", evals.noRecordOldAccount === false);
check("record plus/active inside its period: open", evals.plusActiveRec === true);
check("record plus/trialing: open", evals.plusTrialing === true);
check("record lifetime/active with no period end: open", evals.lifetimeForever === true);
check("record cancelled past its period end: shut", evals.cancelledPastPeriod === false);
check("record active but period already ended: shut", evals.activePastPeriod === false);
check("record past_due: shut", evals.pastDue === false);
check("a different entitlement's record: shut", evals.otherEntitlement === false);
check("free month (spine 5 days old), no record: open", evals.freeMonthNoRecord === true && evals.freeMonthSource === "free-month");
check("a live record outlasts the free month's end (until = the record's)", evals.recordBeatsFreeMonthEnd.plus === true && evals.recordBeatsFreeMonthEnd.until > NOW + 60 * DAY);

/* ---- the guest free month runs off the device stamp ---- */
const guest = await p.evaluate(async ({ DAY }) => {
  const B = window.PaceBilling;
  localStorage.removeItem("pace-first-run");
  await B.refresh(null, null, null);
  const fresh = { plus: B.plusActive(), source: B.state().source };
  localStorage.setItem("pace-first-run", String(Date.now() - 40 * DAY));
  await B.refresh(null, null, null);
  return { fresh, stale: B.plusActive() };
}, { DAY });
check("guest, first run today: free month open", guest.fresh.plus === true && guest.fresh.source === "free-month");
check("guest, device 40 days old: locked", guest.stale === false);

/* ---- in-app: a fresh sign-up is in its free month, and the
        client never writes the record (construction proof) ---- */
await p.evaluate(() => {
  window.__subWrites = [];
  const orig = window.PaceFB.fsSet;
  window.PaceFB.fsSet = function (path, data) { if (String(path).indexOf("subscriptions/") === 0) window.__subWrites.push(path); return orig.call(window.PaceFB, path, data); };
});
for (let i = 0; i < 16; i++) {
  if (await p.locator("#welcome").isVisible().catch(() => false)) { await p.evaluate(() => document.getElementById("welcomeSkip").click()); await p.waitForTimeout(600); }
  if (await p.locator("#guideSheet").isVisible().catch(() => false)) { await p.evaluate(() => document.getElementById("guideSkip").click()); await p.waitForTimeout(600); }
  if (!(await p.locator("#welcome").isVisible().catch(() => false)) && !(await p.locator("#guideSheet").isVisible().catch(() => false))) break;
  await p.waitForTimeout(400);
}
await p.evaluate(() => { const sb = document.getElementById("sidebar"); if (sb.getBoundingClientRect().width < 40) document.getElementById("sbExpand").click(); });
await p.click('.side-item[data-panel="settings"]'); await p.waitForTimeout(400);
await p.click("#accountOpen"); await p.waitForSelector("#authSheet:not([hidden])");
await p.fill("#authEmail", "pay@test.dev"); await p.click("#doorNext"); await p.waitForTimeout(900);
await p.fill("#authPass", "password-p"); await p.click("#authGo");
await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem("pace-auth-v1") || "null"); } catch (e) { return false; } }, null, { timeout: 12000 }).catch(async (e) => { console.log("door diag:", JSON.stringify(await p.evaluate(() => ({ msg: document.getElementById("authMsg").textContent, line: document.getElementById("accountLine").textContent })).catch(() => "eval dead"))); throw e; });
await p.waitForTimeout(2500);
const inApp = await p.evaluate(() => ({ plus: window.PaceBilling.plusActive(), source: window.PaceBilling.state().source, subWrites: window.__subWrites || [] }));
check("a fresh account sits in its free month (plus open, source free-month)", inApp.plus === true && inApp.source === "free-month");
check("the client wrote NOTHING to subscriptions/ during sign-up", inApp.subWrites.length === 0);
/* ---- THE LOCKED TAP (aged guest: free month spent, no record).
        Every Plus apply point refuses AND speaks; free features
        never read the record and keep working. ---- */
const ctx2 = await b.newContext({ viewport: { width: 540, height: 960 } });
await ctx2.addInitScript(() => { try { localStorage.setItem("pace-first-run", String(Date.now() - 40 * 864e5)); } catch (e) {} });
const p2 = await ctx2.newPage();
p2.on("pageerror", (e) => errors.push("aged: " + e.message));
await p2.goto("http://localhost:9131/", { waitUntil: "networkidle" });
await p2.waitForFunction(() => window.PaceBilling, null, { timeout: 9000 }).catch(() => {});
for (let i = 0; i < 16; i++) {
  if (await p2.locator("#welcome").isVisible().catch(() => false)) { await p2.evaluate(() => document.getElementById("welcomeSkip").click()); await p2.waitForTimeout(600); }
  if (await p2.locator("#guideSheet").isVisible().catch(() => false)) { await p2.evaluate(() => document.getElementById("guideSkip").click()); await p2.waitForTimeout(600); }
  if (!(await p2.locator("#welcome").isVisible().catch(() => false)) && !(await p2.locator("#guideSheet").isVisible().catch(() => false))) break;
  await p2.waitForTimeout(400);
}
check("aged guest: plus is NOT active (free month spent, no record)", await p2.evaluate(() => window.PaceBilling.plusActive()) === false);
await p2.evaluate(() => { const sb = document.getElementById("sidebar"); if (sb.getBoundingClientRect().width < 40) document.getElementById("sbExpand").click(); });
await p2.click('.side-item[data-panel="settings"]'); await p2.waitForTimeout(400);
await p2.evaluate(() => document.querySelector('.swatch[data-theme-set="blush"]').click()); await p2.waitForTimeout(500);
check("locked look tap SPEAKS (the Plus sheet, the unlock words)", (await p2.locator("#plusSheet").isVisible()) && (await p2.locator(".plus-title").textContent()) === "That's a Plus thing." && (await p2.locator(".plus-card").textContent()).includes("Unlock with a paid plan"));
check("locked look tap does NOT apply (theme unchanged)", (await p2.evaluate(() => document.documentElement.getAttribute("data-theme"))) !== "blush");
await p2.click("#plusNotNow"); await p2.waitForTimeout(300);
await p2.evaluate(() => document.getElementById("cuteToggle").click()); await p2.waitForTimeout(500);
check("locked Cute tap speaks and does NOT apply", (await p2.locator("#plusSheet").isVisible()) && (await p2.evaluate(() => document.documentElement.getAttribute("data-cute"))) !== "1");
await p2.click("#plusNotNow"); await p2.waitForTimeout(300);
await p2.evaluate(() => document.querySelector('.swatch[data-theme-set="white"]').click()); await p2.waitForTimeout(300);
check("a Free Forever look still applies on the locked context, no sheet", (await p2.locator("#plusSheet").isHidden()));
await p2.evaluate(() => document.querySelector('.side-item[data-panel="capture"]').click()); await p2.waitForTimeout(400);
await p2.fill("#dumpText", "call the dentist tomorrow at 3pm");
await p2.evaluate(() => document.getElementById("parseBtn").click()); await p2.waitForTimeout(500);
check("locked Talk tap speaks and builds NO draft list", (await p2.locator("#plusSheet").isVisible()) && (await p2.locator("#draftList .draft-card").count()) === 0);
await p2.click("#plusNotNow"); await p2.waitForTimeout(300);
await p2.evaluate(async () => { await window.PaceBilling.refresh({ fsGet: () => Promise.resolve({ entitlement: "plus", status: "active", period_ends_at: new Date(Date.now() + 10 * 864e5).toISOString() }) }, "u-aged", new Date(Date.now() - 40 * 864e5).toISOString()); });
await p2.evaluate(() => document.querySelector('.side-item[data-panel="settings"]').click()); await p2.waitForTimeout(300);
await p2.evaluate(() => document.querySelector('.swatch[data-theme-set="sky"]').click()); await p2.waitForTimeout(400);
check("with a live record the same look applies silently", (await p2.locator("#plusSheet").isHidden()) && (await p2.evaluate(() => document.documentElement.getAttribute("data-theme"))) === "sky");
await ctx2.close();
check("zero page errors in the payments battery", errors.length === 0);
if (errors.length) console.log(errors.slice(0, 4).join(" | "));
console.log("RESULT pass=" + pass + " fail=" + fail);
await b.close(); server.close(); mock.close();
process.exit(fail ? 1 : 0);
