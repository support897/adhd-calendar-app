// Pace — the fresh-device bisect battery (QA night findings
// F1 + F2, 20 Oct). QA's shapes, exactly:
//  F1: account + task proven on the server → a BRAND-NEW
//      context (a new phone's shape: empty local storage)
//      signs in → the task must stand in the UI AND on the
//      server at settle, and after a later push.
//  F2: tick a task done → the done mark must land in the
//      server payload on the tick itself.
// The server side is read through the mock's own store, so
// the payload bytes are the evidence.
import { chromium } from "playwright-core";
import http from "http"; import fs from "fs"; import path from "path";
import { startMock } from "/Users/ilse/Apps/adhd-calendar-app/tests/mock-firebase.mjs";
const DIR = "/Users/ilse/Apps/adhd-calendar-app", PORT = 9153;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest", ".png": "image/png", ".ttf": "font/ttf", ".woff2": "font/woff2" };
let fails = 0, passes = 0;
const check = (n, c, d) => { if (c) { passes++; console.log("PASS " + n); } else { fails++; console.log("FAIL " + n + (d ? " [" + d + "]" : "")); } };
const srv = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, "http://x").pathname); if (p === "/firebase-config.js") { res.writeHead(200, { "Content-Type": "text/javascript" }); return res.end(MOCKCFG); } const f = path.join(DIR, p === "/" ? "index.html" : p); if (!f.startsWith(DIR) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "text/plain" }); res.end(fs.readFileSync(f)); });
const mock = await startMock();
const MOCKCFG = `window.PACE_FB_CONFIG={apiKey:"test-key-1234567890",projectId:"pace-test",restAuth:"http://localhost:${mock.port}",restFirestore:"http://localhost:${mock.port}",googleClientId:"x",appleEnabled:false};`;
await new Promise((r) => srv.listen(PORT, r));
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, args: ["--no-sandbox"] });
const EMAIL = "fresh-device@example.com", PW = "password-1", SENTINEL = "Sentinel task QD7";
async function dismissals(p) {
  for (let i = 0; i < 14; i++) {
    if (await p.locator("#welcome").isVisible().catch(() => false)) { await p.evaluate(() => document.getElementById("welcomeSkip").click()); await p.waitForTimeout(350); }
    if (await p.locator("#guideSheet").isVisible().catch(() => false)) { await p.evaluate(() => document.getElementById("guideSkip").click()); await p.waitForTimeout(350); }
    if (!(await p.locator("#welcome").isVisible().catch(() => false)) && !(await p.locator("#guideSheet").isVisible().catch(() => false))) break;
    await p.waitForTimeout(300);
  }
}
async function doorSignIn(p, email) {
  await p.evaluate(() => { const sb = document.getElementById("sidebar"); if (sb.getBoundingClientRect().width < 40) document.getElementById("sbExpand").click(); });
  await p.evaluate(() => document.querySelector('.side-item[data-panel="settings"]').click()); await p.waitForTimeout(350);
  await p.evaluate(() => document.getElementById("accountOpen").click()); await p.waitForTimeout(350);
  await p.fill("#authEmail", email);
  await p.evaluate(() => document.getElementById("doorNext").click()); await p.waitForTimeout(250);
  await p.fill("#authPass", PW);
  await p.evaluate(() => document.getElementById("authGo").click());
  await p.waitForTimeout(2500);
}
function serverTask(uid) {
  const doc = mock.docs.get(`users/${uid}/data/state`);
  if (!doc || !doc.stateJson) return null;
  try { const st = JSON.parse(doc.stateJson); return { raw: doc.stateJson, tasks: (st.tasks || []).map((t) => ({ title: t.title, status: t.status, done: t.done })) }; } catch (e) { return null; }
}
/* ---- context 1: create the account + the sentinel task ---- */
const ctx1 = await browser.newContext();
const p1 = await ctx1.newPage();
await p1.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
await dismissals(p1);
await doorSignIn(p1, EMAIL);
await dismissals(p1);
const uid = [...mock.users.values()].find((u) => u.email === EMAIL)?.uid;
check("setup: the account exists on the server", !!uid);
await p1.evaluate(() => { document.getElementById("addBtn").click(); });
await p1.waitForTimeout(400);
await p1.fill("#quickText", SENTINEL + " tomorrow at 9am");
await p1.waitForTimeout(700);
await p1.evaluate(() => document.getElementById("addSave").click());
await p1.waitForTimeout(2600); // debounce + push
const s1 = uid ? serverTask(uid) : null;
console.log("server after create:", JSON.stringify(s1));
check("setup: the sentinel task stands on the server", !!s1 && s1.tasks.some((t) => t.title.includes("Sentinel")), JSON.stringify(s1 && s1.tasks));
/* ---- F2: tick it done; watch the payload ---- */
await p1.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 1); const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); [...document.querySelectorAll(".tick")].find((c) => c.getAttribute("data-date") === k)?.click(); });
await p1.waitForTimeout(600);
const rowDone = await p1.evaluate(() => { const r = [...document.querySelectorAll(".task-row")].find((x) => x.textContent.includes("Sentinel")); return r ? r.className : "no-row"; });
console.log("row class after nav:", rowDone);
const tickBtn = p1.locator(".task-row", { hasText: "Sentinel" }).locator("[data-check]");
if (await tickBtn.count()) { await tickBtn.first().click(); await p1.waitForTimeout(400); }
const rowAfter = await p1.evaluate(() => { const r = [...document.querySelectorAll(".task-row")].find((x) => x.textContent.includes("Sentinel")); return r ? r.className : "no-row"; });
console.log("row class after tick:", rowAfter);
let f2 = null;
for (let i = 0; i < 6; i++) { await p1.waitForTimeout(1500); f2 = serverTask(uid); if (f2 && f2.tasks.some((t) => t.title.includes("Sentinel") && t.status === "done" && t.done === true)) break; }
console.log("server after tick:", JSON.stringify(f2));
check("F2: the tick's done mark lands in the server payload on the tick itself — status AND the done flag, agreeing in the task's own bytes", !!f2 && f2.tasks.some((t) => t.title.includes("Sentinel") && t.status === "done" && t.done === true), JSON.stringify(f2 && f2.tasks));
await ctx1.close();
/* ---- context 2 (F1): a brand-new device signs in ---- */
const ctx2 = await browser.newContext();
const p2 = await ctx2.newPage();
await p2.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
await dismissals(p2);
await doorSignIn(p2, EMAIL);
await dismissals(p2);
await p2.waitForTimeout(2500); // reconcile settle + any flush
// Build-33 battery care (29 Oct): Polar's line (builds 24-32) boots the
// calendar in timeGridDay, not dayGridMonth, so a tomorrow task is not in
// the boot DOM. The leg's substance is unchanged — the task must stand in
// the UI on a fresh device — so select the sentinel's day first (the same
// .tick navigation context 1 uses), then read the UI.
await p2.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 1); const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); [...document.querySelectorAll(".tick")].find((c) => c.getAttribute("data-date") === k)?.click(); });
await p2.waitForTimeout(900);
const uiHas = await p2.evaluate(() => document.body.textContent.includes("Sentinel"));
const s2 = serverTask(uid);
console.log("F1 fresh context: UI has sentinel:", uiHas, "| server:", JSON.stringify(s2));
check("F1: the fresh-device sign-in keeps the task in the UI", uiHas === true);
check("F1: the fresh-device sign-in leaves the server doc intact at settle", !!s2 && s2.tasks.some((t) => t.title.includes("Sentinel")), JSON.stringify(s2 && s2.tasks));
/* a later push from the fresh device must not erase it either */
await p2.evaluate(() => document.querySelector('.level-btn[data-level="steady"]').click());
await p2.waitForTimeout(2600);
const s3 = serverTask(uid);
check("F1: after a later push from the fresh device, the task still stands on the server", !!s3 && s3.tasks.some((t) => t.title.includes("Sentinel")), JSON.stringify(s3 && s3.tasks));
await ctx2.close();
await browser.close(); srv.close(); mock.close();
console.log(`RESULT pass=${passes} fail=${fails}`);
process.exit(fails ? 1 : 0);
