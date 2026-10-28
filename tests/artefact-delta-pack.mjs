// Pace — BUILD 12 DELTA RETEST PACK (armed; fires on the artefact).
// The b12 delta is three surfaces: the support page's truth fix,
// the service-worker bump, and the notification tap -> task route.
// This pack runs against a PACKAGED www tree (the extracted IPA
// payload), never the repo tree: set DELTA_WWW to the artefact's
// www directory. Dress-rehearsed against store/www (byte-identical
// to what CI packaged — the repo pushes stand MATCH-verified).
// Legs: (1) the served worker is pace-v16-12; (2) the served
// support page tells the truth (corrected line in, the false line
// out); (3) a scheduled start reminder carries its tap payload;
// (4) a fired tap opens the task sheet; (5) a cold open carrying
// the payload in the address routes the same way; (6) no errors.
import pw from "playwright-core";
const { chromium } = pw;
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
const WWW = process.env.DELTA_WWW;
if (!WWW) { console.error("DELTA_WWW not set — point it at the artefact's www directory"); process.exit(2); }
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".ttf": "font/ttf", ".gz": "application/gzip", ".wasm": "application/wasm" };
const server = http.createServer((req, res) => {
  let f = req.url.split("?")[0]; if (f === "/") f = "/index.html";
  const fp = path.join(WWW, f);
  if (!existsSync(fp)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": types[path.extname(fp)] || "application/octet-stream" });
  res.end(readFileSync(fp));
});
let pass = 0, fail = 0;
const check = (name, ok, extra) => { console.log((ok ? "PASS " : "FAIL ") + name + (extra ? "  [" + extra + "]" : "")); ok ? pass++ : fail++; };
await new Promise((r) => server.listen(8973, r));
// Byte legs on the packaged files themselves:
const swBytes = readFileSync(path.join(WWW, "service-worker.js"), "utf8");
const wantSw = process.env.DELTA_SW || "pace-v16-12";
check("packaged worker is " + wantSw, swBytes.includes('"' + wantSw + '"') && /notificationclick/.test(swBytes));
const supBytes = readFileSync(path.join(WWW, "support.html"), "utf8");
check("packaged support page tells the truth", supBytes.includes("if you make an account, saved to your account too") && !supBytes.includes("no accounts and no server") && !/Pace has no accounts/.test(supBytes));
const now = new Date();
const tk = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
const seedState = {
  tasks: [{ id: "dp1", title: "Pack the delta", date: tk, time: "23:57", durationMin: 30, done: false, essential: false, steps: [{ t: "Open it", done: false }] }],
  feelings: {}, todos: [], habits: [], imports: [], sent: {}, welcomed: true,
  settings: { appearance: { theme: "white", cute: false }, guideDone: true, sidebarCollapsed: true, checkinTime: "23:59", notif: { perm: "off", checkin: true, start: true, setup: 5, digest: false, digestTimes: ["23:58"], done: false, doneTime: "20:00" } },
};
const stub = () => {
  window.__ln = { perm: "granted", scheduled: [], listeners: {} };
  window.Capacitor = { isNativePlatform: () => true, Plugins: {
    LocalNotifications: {
      checkPermissions: async () => ({ display: window.__ln.perm }),
      requestPermissions: async () => ({ display: "granted" }),
      schedule: async (o) => { window.__ln.scheduled.push(o); return {}; },
      cancel: async () => ({}),
      addListener: async (name, fn) => { (window.__ln.listeners[name] = window.__ln.listeners[name] || []).push(fn); return {}; },
    } } };
};
const b = await chromium.launch({ executablePath: process.env.CHROME_EXE, args: ["--no-sandbox"] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(stub);
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(String(e)));
await p.goto("http://localhost:8973/", { waitUntil: "networkidle" });
await p.evaluate((s) => localStorage.setItem("calmcal-v1:guest", JSON.stringify(s)), seedState);
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(1200);
const plan = await p.evaluate(() => window.__ln.scheduled.flatMap((c) => c.notifications));
const startNote = plan.find((n) => /Time to start: Pack the delta/.test(n.title));
check("packaged plan: the start reminder carries its tap payload", !!startNote && !!startNote.extra && startNote.extra.paceTask === "dp1" && startNote.extra.paceDate === tk);
await p.evaluate((key) => { window.__ln.listeners["localNotificationActionPerformed"].forEach((fn) => fn({ notification: { extra: { paceTask: "dp1", paceDate: key } } })); }, tk);
await p.waitForTimeout(700);
const sheet = await p.evaluate(() => ({ hidden: document.querySelector("#taskSheet").hidden, title: document.querySelector("#dTitle").textContent }));
check("packaged route: a tap on the reminder opens the task", sheet.hidden === false && /Pack the delta/.test(sheet.title));
await ctx.close();
// Cold open carrying the payload in the address (the SW openWindow path's app half):
const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx2.addInitScript(stub);
await ctx2.addInitScript((s) => localStorage.setItem("calmcal-v1:guest", JSON.stringify(s)), seedState);
const p2 = await ctx2.newPage();
p2.on("pageerror", (e) => errs.push(String(e)));
await p2.goto("http://localhost:8973/?paceTask=dp1&paceDay=" + tk, { waitUntil: "networkidle" });
await p2.waitForTimeout(900);
const sheet2 = await p2.evaluate(() => ({ hidden: document.querySelector("#taskSheet").hidden, title: document.querySelector("#dTitle").textContent }));
check("packaged cold open: the address payload routes to the task", sheet2.hidden === false && /Pack the delta/.test(sheet2.title));
await ctx2.close();
check("zero page errors across the pack", errs.length === 0, errs[0] || "");
await b.close(); server.close();
console.log("RESULT pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
