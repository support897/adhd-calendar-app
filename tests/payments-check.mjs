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
await p2.evaluate(() => document.querySelector('.side-item[data-panel="progress"]').click()); await p2.waitForTimeout(500);
check("locked Board tap speaks and the panel does NOT open", (await p2.locator("#plusSheet").isVisible()) && !(await p2.evaluate(() => document.getElementById("panel-progress").classList.contains("is-active"))));
await p2.click("#plusNotNow"); await p2.waitForTimeout(300);
await p2.evaluate(() => document.getElementById("addBtn").click()); await p2.waitForTimeout(700);
await p2.fill("#quickText", "water the plants");
await p2.evaluate(() => document.querySelector("details.details-fallback summary").click()); await p2.waitForTimeout(300);
await p2.fill("#fMin", "just the balcony pots");
await p2.evaluate(() => document.getElementById("addSave").click()); await p2.waitForTimeout(700);
const taught = await p2.evaluate(() => { const s = JSON.parse(localStorage.getItem("calmcal-v1:guest") || "{}"); const t = (s.tasks || []).find((x) => (x.title || "").toLowerCase().includes("water the plants")); return t ? { saved: true, min: t.minVersion } : { saved: false }; });
check("locked teach at creation: the task saves, the taught version does NOT", taught.saved === true && taught.min === "");
check("locked teach at creation SPEAKS (the Plus sheet is up)", await p2.locator("#plusSheet").isVisible());
await p2.evaluate(() => document.getElementById("plusNotNow").click()); await p2.waitForTimeout(300);
await p2.evaluate(() => document.querySelector('.side-item[data-panel="settings"]').click()); await p2.waitForTimeout(400);
await p2.evaluate(() => { const i = document.getElementById("nameLow"); i.value = "Rough"; i.dispatchEvent(new Event("change", { bubbles: true })); });
await p2.waitForTimeout(500);
const nameKept = await p2.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1:guest") || "{}").settings?.names?.low);
check("locked energy rename SPEAKS and the factory word stays", (await p2.locator("#plusSheet").isVisible()) && nameKept === "Bad");
await p2.evaluate(() => document.getElementById("plusNotNow").click()); await p2.waitForTimeout(300);
await p2.evaluate(async () => { await window.PaceBilling.refresh({ fsGet: () => Promise.resolve({ entitlement: "plus", status: "active", period_ends_at: new Date(Date.now() + 10 * 864e5).toISOString() }) }, "u-aged", new Date(Date.now() - 40 * 864e5).toISOString()); });
await p2.evaluate(() => document.querySelector('.side-item[data-panel="settings"]').click()); await p2.waitForTimeout(300);
await p2.evaluate(() => document.querySelector('.swatch[data-theme-set="sky"]').click()); await p2.waitForTimeout(400);
check("with a live record the same look applies silently", (await p2.locator("#plusSheet").isHidden()) && (await p2.evaluate(() => document.documentElement.getAttribute("data-theme"))) === "sky");
await ctx2.close();

/* ---- stretch + break, on a seeded aged guest ---- */
const K = (() => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); })();
const K2 = (() => { const d = new Date(Date.now() + 864e5); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); })();
const mkT = (id, title, date, steps) => ({ id, title, date, time: null, durationMin: 30, priority: 0, repeat: null, category: "work", color: "#5B6BD5", essential: false, status: "todo", steps: steps || [], minVersion: "", fullVersion: "", source: "manual", originalText: "", skipDates: [], doneDates: [] });
const seed3 = { settings: { guideDone: true }, welcomed: true, samplesLoaded: true, imports: [], feelings: { [K]: "full" }, checks: {}, habitLog: {}, habits: [], todos: [], tasks: [mkT("s1", "Seeded today task", K, []), mkT("s2", "Seeded tomorrow task", K2, [])] };
const ctx3 = await b.newContext({ viewport: { width: 540, height: 960 } });
await ctx3.addInitScript((s) => { try { localStorage.setItem("pace-first-run", String(Date.now() - 40 * 864e5)); if (!localStorage.getItem("calmcal-v1:guest")) localStorage.setItem("calmcal-v1:guest", JSON.stringify(s)); } catch (e) {} }, seed3);
const p3 = await ctx3.newPage();
p3.on("pageerror", (e) => errors.push("seeded: " + e.message));
await p3.goto("http://localhost:9131/", { waitUntil: "networkidle" });
await p3.waitForTimeout(1500);
check("the stretch note offers tomorrow's task on a Great day", await p3.locator('[data-act="stretch"]').isVisible().catch(() => false));
await p3.evaluate(() => document.querySelector('[data-act="stretch"]').click()); await p3.waitForTimeout(500);
const s2date = await p3.evaluate(() => { const s = JSON.parse(localStorage.getItem("calmcal-v1:guest") || "{}"); const t = (s.tasks || []).find((x) => x.id === "s2"); return t ? t.date : null; });
check("locked stretch tap SPEAKS and the task stays on tomorrow", (await p3.locator("#plusSheet").isVisible()) && s2date === K2);
await p3.evaluate(() => document.getElementById("plusNotNow").click()); await p3.waitForTimeout(300);
await p3.evaluate(() => { const el = [...document.querySelectorAll(".task-row, .day-task, [data-open-task]")].find((x) => x.textContent.includes("Seeded today task")); if (el) el.click(); });
await p3.waitForTimeout(800);
const breakSeen = await p3.locator("#dBreak").isVisible().catch(() => false);
if (breakSeen) {
  await p3.evaluate(() => document.getElementById("dBreak").click()); await p3.waitForTimeout(500);
  const stepsAfter = await p3.evaluate(() => { const s = JSON.parse(localStorage.getItem("calmcal-v1:guest") || "{}"); const t = (s.tasks || []).find((x) => x.id === "s1"); return t ? (t.steps || []).length : -1; });
  check("locked Break tap SPEAKS and no steps are made", (await p3.locator("#plusSheet").isVisible()) && stepsAfter === 0);
} else {
  check("locked Break tap SPEAKS and no steps are made", false);
}
await ctx3.close();

/* ---- THE RC BRIDGE: a stubbed Purchases plugin at the seam.
        billing.js is re-read with PACE_BILLING filled (the
        drop-in), and RC's customer info must fold into the
        SAME unlock rule the record uses. ---- */
const ctx4 = await b.newContext({ viewport: { width: 540, height: 960 } });
const p4 = await ctx4.newPage();
p4.on("pageerror", (e) => errors.push("rc: " + e.message));
await p4.goto("http://localhost:9131/", { waitUntil: "networkidle" });
await p4.waitForFunction(() => window.PaceBilling, null, { timeout: 9000 }).catch(() => {});
const rcOut = await p4.evaluate(async () => {
  const out = {};
  const future = new Date(Date.now() + 10 * 864e5).toISOString();
  const past = new Date(Date.now() - 864e5).toISOString();
  let info = { entitlements: { active: {} } };
  const calls = [];
  window.Capacitor = { getPlatform: () => "ios", Plugins: { Purchases: {
    configure: (o) => { calls.push("configure:" + (o.apiKey || "").slice(0, 5)); return Promise.resolve(); },
    logIn: (o) => { calls.push("logIn:" + o.appUserID); return Promise.resolve({ customerInfo: info }); },
    getCustomerInfo: () => Promise.resolve({ customerInfo: info }),
    getOfferings: () => Promise.resolve({ current: { availablePackages: [
      { identifier: "$rc_monthly", product: { identifier: "pace_plus_monthly", priceString: "$4.99" } },
      { identifier: "$rc_annual", product: { identifier: "pace_plus_yearly", priceString: "$39.99" } },
      { identifier: "$rc_lifetime", product: { identifier: "pace_lifetime", priceString: "$99.99" } } ] } }),
    purchasePackage: (o) => { calls.push("buy:" + o.aPackage.product.identifier); info = { entitlements: { active: { plus: { isActive: true, expirationDate: future, productIdentifier: o.aPackage.product.identifier } } } }; return Promise.resolve({ customerInfo: info }); },
    restorePurchases: () => { calls.push("restore"); return Promise.resolve({ customerInfo: info }); }
  } } };
  window.PACE_BILLING = { revenueCatIosKey: "appl_test_key", revenueCatAndroidKey: null, entitlement: "plus", products: { monthly: "pace_plus_monthly", yearly: "pace_plus_yearly", lifetime: "pace_lifetime" } };
  const src = await (await fetch("billing.js")).text();
  (0, eval)(src);
  const B = window.PaceBilling;
  const noRec = { fsGet: () => Promise.resolve(null) };
  const old = new Date(Date.now() - 40 * 864e5).toISOString();
  let st = await B.refresh(noRec, "u-rc", old);
  out.emptyInfoLocked = !st.plus;
  info = { entitlements: { active: { plus: { isActive: true, expirationDate: future } } } };
  st = await B.refresh(noRec, "u-rc", old);
  out.rcActiveOpens = st.plus === true && st.source === "record";
  info = { entitlements: { active: { plus: { isActive: true, expirationDate: past } } } };
  st = await B.refresh(noRec, "u-rc", old);
  out.rcExpiredShut = !st.plus;
  info = { entitlements: { active: { lifetime: { isActive: true, expirationDate: null } } } };
  st = await B.refresh(noRec, "u-rc", old);
  out.rcLifetimeOpens = st.plus === true;
  info = { entitlements: { active: {} } };
  st = await B.buy("pace_plus_yearly");
  out.buyFlipsOpen = st.plus === true;
  await B.restore();
  const prices = await B.storePrices();
  out.prices = prices;
  out.calls = calls.join(" ");
  return out;
});
check("RC: no entitlement in customer info — locked", rcOut.emptyInfoLocked === true);
check("RC: an active plus entitlement opens (same rule as the record)", rcOut.rcActiveOpens === true);
check("RC: an expired entitlement stays shut", rcOut.rcExpiredShut === true);
check("RC: lifetime active opens", rcOut.rcLifetimeOpens === true);
check("RC: configure + logIn ran with the app identity", rcOut.calls.includes("configure:appl_") && rcOut.calls.includes("logIn:u-rc"));
check("RC: buy purchases the yearly package and the gate opens", rcOut.calls.includes("buy:pace_plus_yearly") && rcOut.buyFlipsOpen === true);
check("RC: restore runs through the plugin", rcOut.calls.includes("restore"));
check("RC: storePrices reads the store's own strings", !!rcOut.prices && rcOut.prices.pace_plus_monthly === "$4.99" && rcOut.prices.pace_lifetime === "$99.99");
await ctx4.close();

/* ---- THE PLANS SURFACE, native + live: the buy buttons are
        the app's own classes, priced by the store's strings,
        and a purchase flips the sheet's truth. ---- */
const ctx5 = await b.newContext({ viewport: { width: 540, height: 960 } });
const p5 = await ctx5.newPage();
p5.on("pageerror", (e) => errors.push("plans: " + e.message));
await p5.goto("http://localhost:9131/", { waitUntil: "networkidle" });
await p5.waitForFunction(() => window.PaceBilling, null, { timeout: 9000 }).catch(() => {});
for (let i = 0; i < 16; i++) {
  if (await p5.locator("#welcome").isVisible().catch(() => false)) { await p5.evaluate(() => document.getElementById("welcomeSkip").click()); await p5.waitForTimeout(600); }
  if (await p5.locator("#guideSheet").isVisible().catch(() => false)) { await p5.evaluate(() => document.getElementById("guideSkip").click()); await p5.waitForTimeout(600); }
  if (!(await p5.locator("#welcome").isVisible().catch(() => false)) && !(await p5.locator("#guideSheet").isVisible().catch(() => false))) break;
  await p5.waitForTimeout(400);
}
await p5.evaluate(async () => {
  const future = new Date(Date.now() + 10 * 864e5).toISOString();
  let info = { entitlements: { active: {} } };
  window.Capacitor = { getPlatform: () => "ios", Plugins: { Purchases: {
    configure: () => Promise.resolve(), logIn: () => Promise.resolve({ customerInfo: info }),
    getCustomerInfo: () => Promise.resolve({ customerInfo: info }),
    getOfferings: () => Promise.resolve({ current: { availablePackages: [
      { identifier: "$rc_monthly", product: { identifier: "pace_plus_monthly", priceString: "$4.99" } },
      { identifier: "$rc_annual", product: { identifier: "pace_plus_yearly", priceString: "$39.99" } },
      { identifier: "$rc_lifetime", product: { identifier: "pace_lifetime", priceString: "$99.99" } } ] } }),
    purchasePackage: (o) => { info = { entitlements: { active: { plus: { isActive: true, expirationDate: future, productIdentifier: o.aPackage.product.identifier } } } }; return Promise.resolve({ customerInfo: info }); },
    restorePurchases: () => Promise.resolve({ customerInfo: info })
  } } };
  window.PACE_BILLING = { revenueCatIosKey: "appl_test_key", revenueCatAndroidKey: null, entitlement: "plus", products: { monthly: "pace_plus_monthly", yearly: "pace_plus_yearly", lifetime: "pace_lifetime" } };
  const src = await (await fetch("billing.js")).text();
  (0, eval)(src);
});
await p5.evaluate(() => { const sb = document.getElementById("sidebar"); if (sb.getBoundingClientRect().width < 40) document.getElementById("sbExpand").click(); });
await p5.evaluate(() => document.querySelector('.side-item[data-panel="settings"]').click()); await p5.waitForTimeout(400);
await p5.evaluate(() => document.getElementById("plansOpen").click()); await p5.waitForTimeout(700);
check("native + live: the buy rows show, in the sheet's own classes", (await p5.locator("#planBuy").isVisible()) && (await p5.locator("#buyYearly").evaluate((el) => el.className)) === "primary-btn");
check("native + live: the yearly button carries the STORE's price string", (await p5.locator("#buyYearly").textContent()).includes("$39.99"));
check("native + live: the sheet speaks the free-month truth", (await p5.locator("#planState").textContent()).includes("first month is free"));
check("native + live: the popup line flips to the bare unlock words", await p5.evaluate(() => document.getElementById("plusHonest").textContent) === "Unlock with a paid plan." || (await p5.evaluate(() => document.getElementById("plusHonest").textContent)).includes("Unlock with a paid plan"));
await p5.evaluate(() => document.getElementById("buyYearly").click()); await p5.waitForTimeout(900);
check("after buying: the sheet says Plus is yours", (await p5.locator("#planState").textContent()).includes("Plus is yours"));
await p5.waitForFunction(() => document.getElementById("planTermsText").textContent.includes("$4.99"), null, { timeout: 8000 }).catch(() => {});
const termsState = await p5.evaluate(() => ({ hidden: document.getElementById("planTerms").hidden, h: document.getElementById("planTerms").getBoundingClientRect().height, txt: document.getElementById("planTermsText").textContent }));
check("G7: the disclosure block stands on the live paywall (renews · cancel · never renews)", !termsState.hidden && termsState.h > 0 && termsState.txt.includes("renew automatically") && termsState.txt.includes("Cancel anytime") && termsState.txt.includes("never renews"));
check("G7: the disclosure's prices are the buttons' own prices (same source, no drift)", termsState.txt.includes("$4.99") && termsState.txt.includes("$39.99") && termsState.txt.includes("$99.99"));
check("G7: the Privacy + Terms links stand on the surface", (await p5.locator('#planTerms a[href="privacy.html"]').count()) === 1 && (await p5.locator('#planTerms a[href*="stdeula"]').count()) === 1);
await p5.evaluate(async () => {
  window.Capacitor.Plugins.Purchases.getOfferings = () => Promise.resolve({ current: { availablePackages: [
    { identifier: "$rc_annual", product: { identifier: "pace_plus_yearly", priceString: "$39.99" } } ] } });
});
await p5.evaluate(() => document.getElementById("plansOpen").click()); await p5.waitForTimeout(700);
await p5.waitForFunction(() => document.getElementById("planTermsText").textContent.includes("A$4.99"), null, { timeout: 8000 }).catch(() => {});
const partialTxt = await p5.evaluate(() => document.getElementById("planTermsText").textContent);
check("F2: a partial offerings response composes the disclosure from the store string + the A$ anchors (the exported fallback)", partialTxt.includes("$39.99") && partialTxt.includes("A$4.99") && partialTxt.includes("A$99.99"), partialTxt.slice(0, 90));
await ctx5.close();
check("zero page errors in the payments battery", errors.length === 0);
if (errors.length) console.log(errors.slice(0, 4).join(" | "));
console.log("RESULT pass=" + pass + " fail=" + fail);
await b.close(); server.close(); mock.close();
process.exit(fail ? 1 : 0);
