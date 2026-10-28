// Pace — native notifications bridge + native export battery.
// The Meal Prep fault, Pace edition: inside the store wrap the
// Settings notifications block ran the WEB machinery and could only
// read "This browser does not offer notifications.", and Export was
// a blob-download anchor that does nothing in a WebView. The fix
// (Fit's shape of record): on native, Capacitor LocalNotifications
// carries the same gentle moments as an on-device plan (replanned on
// every save), and Export writes the file + shares it. Web untouched.
// This battery stubs the Capacitor bridge and proves both branches,
// plus the web control.
import pw from "playwright-core";
const { chromium } = pw;
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
const ROOT = path.resolve(process.cwd());
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".ttf": "font/ttf" };
const server = http.createServer((req, res) => {
  let f = req.url.split("?")[0]; if (f === "/") f = "/index.html";
  const fp = path.join(ROOT, f);
  if (!existsSync(fp)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": types[path.extname(fp)] || "application/octet-stream" });
  res.end(readFileSync(fp));
});
let pass = 0, fail = 0;
const check = (name, ok) => { console.log((ok ? "PASS " : "FAIL ") + name); ok ? pass++ : fail++; };
await new Promise((r) => server.listen(8953, r));
const b = await chromium.launch({ executablePath: process.env.CHROME_EXE, args: ["--no-sandbox"] });

const now = new Date();
const tk = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
const seedState = {
  tasks: [{ id: "nt1", title: "Ring the dentist", date: tk, time: "23:57", durationMin: 30, done: false, essential: false, steps: [{ t: "Ring them", done: false }] }],
  feelings: {}, todos: [], habits: [], imports: [], sent: {}, welcomed: true,
  settings: { appearance: { theme: "white", cute: false }, guideDone: true, sidebarCollapsed: true, checkinTime: "23:59", notif: { perm: "off", checkin: true, start: true, setup: 5, digest: true, digestTimes: ["23:58"], done: false, doneTime: "20:00" } },
};
const stub = () => {
  window.__ln = { perm: "prompt", requests: 0, scheduled: [], cancelled: [], writes: [], shares: [], listeners: {} };
  window.Capacitor = { isNativePlatform: () => true, Plugins: {
    LocalNotifications: {
      checkPermissions: async () => ({ display: window.__ln.perm }),
      requestPermissions: async () => { window.__ln.requests++; window.__ln.perm = "granted"; return { display: "granted" }; },
      schedule: async (o) => { window.__ln.scheduled.push(o); return {}; },
      cancel: async (o) => { window.__ln.cancelled.push(o); return {}; },
      addListener: async (name, fn) => { (window.__ln.listeners[name] = window.__ln.listeners[name] || []).push(fn); return {}; },
    },
    Filesystem: { writeFile: async (o) => { window.__ln.writes.push(o); return {}; }, getUri: async (o) => ({ uri: "file:///cache/" + o.path }) },
    Share: { share: async (o) => { window.__ln.shares.push(o); return {}; } },
  } };
};

/* ---- native context ---- */
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(stub);
const p = await ctx.newPage();
const pageErrors = [];
p.on("pageerror", (e) => pageErrors.push(String(e)));
await p.goto("http://localhost:8953/", { waitUntil: "networkidle" });
await p.evaluate((s) => localStorage.setItem("calmcal-v1:guest", JSON.stringify(s)), seedState);
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(700);
await p.click("#sbExpand"); await p.waitForTimeout(300);
await p.click('.side-item[data-panel="settings"]'); await p.waitForTimeout(500);
const status1 = await p.locator("#notifStatus").textContent();
check("native: the Settings status never shows the browser line — reads \"" + status1.trim() + "\"", !/browser/i.test(status1) && /Notifications are off/.test(status1));
const hint1 = await p.locator("#notifHint").textContent();
check("PACE-007 native: the hint tells the closed-app truth (\"" + hint1.trim() + "\")", /ring even when the app is closed/.test(hint1));
await p.click("#notifEnable"); await p.waitForTimeout(400);
const reqs = await p.evaluate(() => window.__ln.requests);
const status2 = await p.locator("#notifStatus").textContent();
check("native: Enable asked the DEVICE permission (requests=" + reqs + ") and the status now reads on", reqs === 1 && /Notifications are on/.test(status2));
await p.waitForTimeout(900); // the save from enabling fires the debounced plan
const plan1 = await p.evaluate(() => window.__ln.scheduled.flatMap((c) => c.notifications));
const titles = plan1.map((n) => n.title);
check("native: the plan carries the check-in (" + titles.join(" · ") + ")", titles.some((t) => /How are you feeling/.test(t)));
check("native: the plan carries the digest", titles.some((t) => /Your day, gently/.test(t)));
check("native: the plan carries the task start nudge", titles.some((t) => /Time to start: Ring the dentist/.test(t)));
check("native: every planned moment is in the future", plan1.length >= 3 && plan1.every((n) => new Date(n.schedule.at).getTime() > Date.now()));
const ids1 = plan1.map((n) => n.id);
const idsToday = plan1.filter((n) => { const d = new Date(n.schedule.at); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate(); }).map((n) => n.id);
const idsTomorrow = ids1.filter((id) => !idsToday.includes(id));
await p.click("#notifTest"); await p.waitForTimeout(300);
const testNote = await p.evaluate(() => window.__ln.scheduled.flatMap((c) => c.notifications).find((n) => n.title === "Pace"));
check("native: the test button schedules a device notification", !!testNote && /test/.test(testNote.body));
/* Tap -> the task (HQ ruling): payloads at the seam, the live
   route through the registered action listener, and the floor. */
const startNote = plan1.find((n) => /Time to start/.test(n.title));
check("tap payload: the start nudge carries its task id + day", !!startNote && !!startNote.extra && startNote.extra.paceTask === "nt1" && startNote.extra.paceDate === tk);
const checkinNote = plan1.find((n) => /How are you feeling/.test(n.title));
check("tap payload: the check-in carries its day and no task", !!checkinNote && !!checkinNote.extra && checkinNote.extra.paceTask === "" && checkinNote.extra.paceDate === tk && checkinNote.extra.paceKind === "checkin");
const listenerCount = await p.evaluate(() => (window.__ln.listeners["localNotificationActionPerformed"] || []).length);
check("tap route: the app registered the notification action listener", listenerCount >= 1);
await p.evaluate((key) => { window.__ln.listeners["localNotificationActionPerformed"].forEach((fn) => fn({ notification: { extra: { paceTask: "nt1", paceDate: key } } })); }, tk);
await p.waitForTimeout(700);
const sheetAfterTap = await p.evaluate(() => ({ hidden: document.querySelector("#taskSheet").hidden, title: document.querySelector("#dTitle").textContent }));
check("tap route: a tap on nt1's start reminder opens nt1's task sheet", sheetAfterTap.hidden === false && /Ring the dentist/.test(sheetAfterTap.title));
await p.evaluate(() => { document.querySelector("#taskSheet").hidden = true; });
await p.evaluate((key) => { window.__ln.listeners["localNotificationActionPerformed"].forEach((fn) => fn({ notification: { extra: { paceTask: "gone-task", paceDate: key } } })); }, tk);
await p.waitForTimeout(700);
const floorState = await p.evaluate(() => document.querySelector("#taskSheet").hidden);
check("tap floor: a tap for a gone task still lands (sheet closed, the day stands, no crash)", floorState === true && pageErrors.length === 0);
await p.click("#notifPause"); await p.waitForTimeout(900);
const afterPause = await p.evaluate(() => ({ cancelled: window.__ln.cancelled.flatMap((c) => c.notifications.map((x) => x.id)), ids: JSON.parse(localStorage.getItem("pace-remind-ids") || "[]") }));
check("native: pausing for today cancelled the old plan", ids1.every((id) => afterPause.cancelled.includes(id)));
check("native: after the pause, none of TODAY's planned ids survive (the pause is for today)", !idsToday.some((id) => afterPause.ids.includes(id)));
check("native: tomorrow's plan survives the pause untouched (positive control)", idsTomorrow.length > 0 && idsTomorrow.every((id) => afterPause.ids.includes(id)));
await p.click("#accountDownload"); await p.waitForTimeout(500);
const exp = await p.evaluate(() => ({ writes: window.__ln.writes, shares: window.__ln.shares }));
check("native: Export wrote the data file (" + (exp.writes[0] || {}).path + ")", exp.writes.length === 1 && exp.writes[0].path === "pace-calendar-data.json" && /Ring the dentist/.test(exp.writes[0].data));
check("native: Export offered the file through the share sheet", exp.shares.length === 1 && /file:\/\/\/cache\/pace-calendar-data\.json/.test(exp.shares[0].url || ""));
await ctx.close();

/* ---- web control ---- */
const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 } });
const p2 = await ctx2.newPage();
await p2.goto("http://localhost:8953/", { waitUntil: "networkidle" });
await p2.evaluate((s) => localStorage.setItem("calmcal-v1:guest", JSON.stringify(s)), seedState);
await p2.reload({ waitUntil: "networkidle" });
await p2.waitForTimeout(500);
await p2.click("#sbExpand"); await p2.waitForTimeout(300);
await p2.click('.side-item[data-panel="settings"]'); await p2.waitForTimeout(500);
const wstatus = await p2.locator("#notifStatus").textContent();
check("web control: no bridge — the web machinery's own status stands (\"" + wstatus.trim() + "\")", wstatus.trim().length > 0);
const whint = await p2.locator("#notifHint").textContent();
check("PACE-007 web control: the hint keeps the web truth (\"" + whint.trim() + "\")", /fire while the app is open/.test(whint));
await ctx2.close();
/* The web seam of the same ruling: SW-shown notifications route
   through notificationclick, and the app consumes the payload. */
const swText = readFileSync(path.join(ROOT, "service-worker.js"), "utf8");
const appText = readFileSync(path.join(ROOT, "app.js"), "utf8");
check("web: the service worker routes notification taps (notificationclick + paceTap)", /notificationclick/.test(swText) && /paceTap/.test(swText));
check("web: the app consumes tap payloads (query + message + the router)", /paceTask/.test(appText) && /routeNotifTap/.test(appText) && /showNotification\(title, \{ body: body, icon: "icon.svg", data: data \}\)/.test(appText));
await b.close(); server.close();
console.log("RESULT pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
