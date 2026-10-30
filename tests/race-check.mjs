// Pace — the sync-race battery (QA remainder round, 19 Oct).
// QA's pot/save-forever scripts diverged run to run on the
// shipped build 12 against production: one run lost BOTH
// accounts' data server-side, the next lost nothing. This
// battery recreates the network shape that exposes the race —
// document reads slower than the 1200ms sync debounce — on the
// rules-shaped mock, and drives QA's cycle: pot BRING persists,
// a fast sign-out keeps the just-added task, a re-sign-in never
// moves content backwards. RACE_ROOT points it at a www tree:
// the shipped b12 extraction (expected RED) or the repo tree
// (expected GREEN). Cycles repeat; every cycle must pass.
import { chromium } from "playwright-core";
import http from "http"; import fs from "fs"; import path from "path";
import { startMock } from "./mock-firebase.mjs";
const ROOT = process.env.RACE_ROOT || "/Users/ilse/Apps/adhd-calendar-app";
const CYCLES = Number(process.env.RACE_CYCLES || 3);
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".gz": "application/gzip", ".png": "image/png", ".ttf": "font/ttf" };
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
await new Promise((r) => server.listen(9129, r));
let pass = 0, fail = 0;
const check = (n, ok) => { console.log((ok ? "PASS " : "FAIL ") + n); ok ? pass++ : fail++; };
const b = await chromium.launch({ executablePath: process.env.CHROME_EXE, args: ["--no-sandbox"] });
const ctx = await b.newContext({ viewport: { width: 540, height: 960 } });
// The race's network shape: document READS take 2000ms (slower
// than the 1200ms sync debounce), writes 250ms, auth instant.
await ctx.addInitScript(() => {
  const orig = window.fetch.bind(window);
  window.fetch = (url, opts) => {
    const u = String(url);
    let d = 0;
    if (u.includes("/documents/")) d = (opts && opts.method && opts.method !== "GET") ? (window.__patchDelay || 250) : 2000;
    if (!d) return orig(url, opts);
    return new Promise((res, rej) => setTimeout(() => orig(url, opts).then(res, rej), d));
  };
});
const p = await ctx.newPage();
p.setDefaultTimeout(12000);
const K = (() => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); })();
const docOf = (uid, sub) => mock.docs.get("users/" + uid + (sub ? "/" + sub : ""));
const uidByEmail = (e) => mock.users.get(e) && mock.users.get(e).uid;
const docTasks = (uid) => { const d = docOf(uid, "data/state"); if (!d || !d.stateJson) return null; try { return JSON.parse(d.stateJson).tasks.map((t) => t.title); } catch (e) { return null; } };
async function poll(fn, ms) { const end = Date.now() + (ms || 20000); while (Date.now() < end) { try { if (await fn()) return true; } catch (e) {} await p.waitForTimeout(400); } try { return await fn(); } catch (e) { return false; } }
async function settings() { await p.evaluate(() => { const sb = document.getElementById("sidebar"); if (sb.getBoundingClientRect().width < 40) document.getElementById("sbExpand").click(); }); await p.click('.side-item[data-panel="settings"]'); await p.waitForTimeout(400); }
async function dismissOverlays() {
  if (await p.evaluate(() => !document.getElementById("potSheet").hidden)) return;
  if (await p.locator("#welcome").isVisible().catch(() => false)) { await p.click("#welcomeSkip", { timeout: 1500 }).catch(() => {}); await p.waitForTimeout(300); }
  if (await p.locator("#guideSheet").isVisible().catch(() => false)) { await p.click("#guideSkip", { timeout: 1500 }).catch(() => {}); await p.waitForTimeout(300); }
}
async function settleTour() {
  for (let i = 0; i < 40; i++) {
    if (await p.locator("#tourName").isVisible().catch(() => false)) { await p.fill("#tourName", "Test Person"); await p.click("#guideNext"); await p.waitForTimeout(500); }
    else if (await p.locator("#guideSheet").isVisible().catch(() => false)) { await p.click("#guideSkip").catch(() => {}); await p.waitForTimeout(400); }
    else if (await p.locator("#welcome").isVisible().catch(() => false)) { await p.click("#welcomeSkip").catch(() => {}); await p.waitForTimeout(400); }
    else if (await p.locator("#potSheet").isVisible().catch(() => false)) { return; }
    else return;
  }
}
async function waitPotDoor(ms) { const end = Date.now() + ms; while (Date.now() < end) { if (await p.evaluate(() => !document.getElementById("potSheet").hidden)) return true; await dismissOverlays(); await p.waitForTimeout(500); } return p.evaluate(() => !document.getElementById("potSheet").hidden); }
async function doorThrough(email, pw) {
  await p.fill("#authEmail", email); await p.click("#doorNext");
  await p.waitForSelector("#doorStep2:not([hidden])");
  await p.fill("#authPass", pw); await p.click("#authGo");
}
async function signUpOrIn(email, pw) {
  // Battery care (29 Oct, build 33's door lock): the door stands at
  // boot and after every sign-out — Settings is only needed to
  // reach Sign out, and only while signed in.
  const signedInAs = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem("pace-auth-v1") || "null"); return s && s.email; }).catch(() => null);
  if (signedInAs === email) return;
  if (signedInAs) { await settings(); await p.click("#accountOut"); await p.waitForTimeout(2500); await dismissOverlays(); }
  await p.waitForSelector("#authSheet:not([hidden])");
  await doorThrough(email, pw);
  await poll(() => p.evaluate((e) => { const s = JSON.parse(localStorage.getItem("pace-auth-v1") || "null"); return s && s.email === e; }, email), 20000);
  await settleTour();
}
async function signOut() { await settings(); await p.click("#accountOut"); await p.waitForTimeout(2500); await dismissOverlays(); }
async function quickAdd(text) {
  // Battery care (30 Oct, QA's b33 qualification 1): when the pot
  // door is answered before a fresh account's tour finishes, the
  // guide sheet is still standing at this call and intercepts the
  // #addBtn click (cycle 2 B died on exactly that). settleTour is
  // the battery's own looping dismissal (name step, guide, welcome)
  // — run it first, like a person tapping through, then add.
  await settleTour(); await dismissOverlays();
  await p.evaluate(() => document.querySelector('[data-panel="calendar"]').click()); await p.waitForTimeout(300);
  await p.click("#addBtn"); await p.waitForSelector("#addSheet:not([hidden])");
  await p.fill("#quickText", text); await p.click("#addSave"); await p.waitForTimeout(400);
}
async function makeGuestPot(tag) {
  // Deterministic pot per cycle: reset the guest slot to exactly
  // this cycle's task (a leftover pot from an earlier cycle made
  // cycle 2's checks read the wrong titles — harness bleed).
  await p.evaluate((title) => {
    const d = new Date(); const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const g = { welcomed: true, samplesLoaded: true, imports: [], feelings: {}, checks: {}, habitLog: {}, habits: [], todos: [], updatedAt: Date.now(),
      settings: { guideDone: true }, tasks: [{ id: "pot" + Date.now(), title: title, date: k, time: null, durationMin: 30, priority: 0, repeat: null, category: "work", color: "#5B6BD5", essential: false, status: "todo", steps: [], minVersion: "", fullVersion: "", source: "manual", originalText: "", skipDates: [], doneDates: [] }] };
    localStorage.setItem("calmcal-v1:guest", JSON.stringify(g));
    localStorage.removeItem("pace-pot-offered"); localStorage.removeItem("pace-pot-consumed");
  }, tag);
  await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(600);
  await dismissOverlays();
}
await p.goto("http://localhost:9129/", { waitUntil: "networkidle" }); await p.waitForTimeout(800);
await dismissOverlays();

for (let c = 1; c <= CYCLES; c++) {
  const tag = "C" + c + " ";
  const emailA = "race" + c + "a@test.dev", emailB = "race" + c + "b@test.dev";
  // A: guest pot -> sign up -> BRING -> the pot must PERSIST server-side.
  await makeGuestPot(tag + "guest task");
  await signUpOrIn(emailA, "password-a");
  const uidA = uidByEmail(emailA);
  const door = await waitPotDoor(30000);
  check(tag + "A: pot door offered", door);
  if (door) await p.click("#potYes");
  check(tag + "A: the brought pot PERSISTS in A's server doc", await poll(() => (docTasks(uidA) || []).some((t) => /guest task/.test(t)), 25000));
  // A adds its own event — its push overlaps the settle traffic.
  await quickAdd(tag + "A own event");
  check(tag + "A: A's own event PERSISTS in A's server doc", await poll(() => (docTasks(uidA) || []).some((t) => /A own event/.test(t)), 25000));
  await signOut();
  // A returns: nothing may have moved backwards.
  await signUpOrIn(emailA, "password-a"); await settleTour();
  check(tag + "A: after sign-out/sign-in, A still sees its tasks", await poll(() => p.evaluate(() => document.body.innerText.includes("guest task") || document.body.innerText.includes("A own event")), 25000));
  check(tag + "A: after the cycle, A's server doc still holds its tasks", (docTasks(uidA) || []).length >= 2);
  await signOut();
  // B: fresh pot -> START FRESH -> add -> sign out INSIDE the debounce window.
  await makeGuestPot(tag + "second pot");
  await signUpOrIn(emailB, "password-b");
  const uidB = uidByEmail(emailB);
  const doorB = await waitPotDoor(30000);
  check(tag + "B: pot door offered", doorB);
  if (doorB) await p.click("#potNo");
  await dismissOverlays();
  await quickAdd(tag + "B own event");
  await signOut(); // fast: the flush (fixed) or the loss (shipped)
  await signUpOrIn(emailB, "password-b"); await settleTour();
  check(tag + "B: the fast-cycle task SURVIVES (rendered)", await poll(() => p.evaluate(() => document.body.innerText.includes("B own event")), 25000));
  check(tag + "B: the fast-cycle task PERSISTS in B's server doc", (docTasks(uidB) || []).some((t) => /B own event/.test(t)));
  check(tag + "B: no cross-sight of A's tasks", !(docTasks(uidB) || []).some((t) => /guest task|A own event/.test(t)));
  check(tag + "A: A's doc untouched by B's cycle", (docTasks(uidA) || []).length >= 2);
  // The Leg-5 shape: two saves close together under a SLOW write
  // (the second push fires while the first is still in flight —
  // the shipped code drops it, then the restart adopt discards
  // the newer local state for the server's older content).
  await p.evaluate(() => { window.__patchDelay = 1600; });
  await quickAdd(tag + "overlap one");
  await p.waitForTimeout(300);
  await quickAdd(tag + "overlap two");
  await p.evaluate(() => { window.__patchDelay = 250; });
  await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(1000);
  await settleTour(); await dismissOverlays();
  if (process.env.RACE_DEBUG) { await p.waitForTimeout(6000); console.log("DEBUG doc B at restart+7s:", JSON.stringify(docTasks(uidB))); console.log("DEBUG slot B:", await p.evaluate((u) => { const s = JSON.parse(localStorage.getItem("calmcal-v1:" + u) || "{}"); return (s.tasks || []).map((t) => t.title); }, uidB)); await quickAdd(tag + "probe postrestart"); console.log("DEBUG probe landed in doc:", await poll(() => (docTasks(uidB) || []).some((x) => /probe postrestart/.test(x)), 20000), JSON.stringify(docTasks(uidB))); }
  check(tag + "B: after restart, BOTH overlapped saves survive", await poll(() => p.evaluate(() => document.body.innerText.includes("overlap one") && document.body.innerText.includes("overlap two")), 25000));
  check(tag + "B: after restart, B's server doc holds both overlapped saves", await poll(() => { const t = docTasks(uidB) || []; return t.some((x) => /overlap one/.test(x)) && t.some((x) => /overlap two/.test(x)); }, 25000));
  await signOut();
}
await b.close(); server.close();
console.log("RESULT pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
