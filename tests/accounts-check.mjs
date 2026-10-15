// Pace accounts battery (accounts wave): the whole multi-user
// story driven through the REAL app against a mock Firebase that
// enforces the rules' shape — sign-up, the guest-upload door
// (PC-1), per-account isolation, activation stamps, the saved-data
// round trip, the string heal, and account deletion. The live
// test-twin battery (Security P4) proves the real rules text.
import { chromium } from "/home/hatch/node_modules/playwright-core/index.mjs";
import http from "http"; import fs from "fs"; import path from "path";
import { startMock } from "./mock-firebase.mjs";
const ROOT = "/home/hatch/workspace/adhd-calendar-app";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".gz": "application/gzip", ".png": "image/png" };
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
await new Promise((r) => server.listen(9123, r));
let pass = 0, fail = 0;
const check = (n, ok) => { console.log((ok ? "PASS " : "FAIL ") + n); ok ? pass++ : fail++; };
const b = await chromium.launch({ executablePath: "/home/hatch/.cache/ms-playwright/chromium-1187/chrome-linux/chrome", args: ["--no-sandbox"] });
const ctx = await b.newContext({ viewport: { width: 540, height: 960 } });
const p = await ctx.newPage();
p.setDefaultTimeout(9000);
const K = new Date().toISOString().slice(0, 10);
const guestSeed = { settings: { guideDone: true }, welcomed: true, samplesLoaded: true, imports: [], feelings: {}, checks: {}, habitLog: {}, habits: [], todos: [], tasks: [
  { id: "g1", title: "Guest pot task one", date: K, time: null, durationMin: 30, priority: 0, repeat: null, category: "work", color: "#5B6BD5", essential: false, status: "todo", steps: [], minVersion: "", fullVersion: "", source: "manual", originalText: "", skipDates: [], doneDates: [] },
  { id: "g2", title: "Guest pot task two", date: K, time: null, durationMin: 30, priority: 0, repeat: null, category: "work", color: "#5B6BD5", essential: false, status: "todo", steps: [], minVersion: "", fullVersion: "", source: "manual", originalText: "", skipDates: [], doneDates: [] },
] };
await p.addInitScript((s) => { if (!localStorage.getItem("calmcal-v1:guest")) localStorage.setItem("calmcal-v1:guest", JSON.stringify(s)); }, guestSeed);
const docOf = (uid, sub) => mock.docs.get("users/" + uid + (sub ? "/" + sub : ""));
const uidByEmail = (e) => mock.users.get(e) && mock.users.get(e).uid;
async function settings() { await p.evaluate(() => { const sb = document.getElementById("sidebar"); if (sb.getBoundingClientRect().width < 40) document.getElementById("sbExpand").click(); }); await p.click('.side-item[data-panel="settings"]'); await p.waitForTimeout(400); }
async function dismissOverlays() {
  // A brand-new account boots as a new user: welcome, then guide.
  if (await p.locator("#welcome").isVisible().catch(() => false)) { await p.click("#welcomeSkip"); await p.waitForTimeout(300); }
  if (await p.locator("#guideSheet").isVisible().catch(() => false)) { await p.click("#guideSkip"); await p.waitForTimeout(300); }
}
async function signUp(email, pw) {
  await settings();
  await p.click("#accountOpen"); await p.waitForSelector("#authSheet:not([hidden])");
  await p.fill("#authEmail", email); await p.fill("#authPass", pw);
  await p.click("#authSignUp");
  await p.waitForFunction(() => { const s = JSON.parse(localStorage.getItem("pace-auth-v1") || "null"); return s && s.email === document.querySelector("#authEmail")?.value || (s && s.email); }, null, { timeout: 9000 }).catch(() => {});
  await p.waitForTimeout(1200);
}
await p.goto("http://localhost:9123/", { waitUntil: "networkidle" }); await p.waitForTimeout(700);
await settings();
check("configured build shows the Account group", await p.evaluate(() => !document.getElementById("accountGroup").hidden));
// 1-3. Sign up A, the door, bring the pot in.
await signUp("a@test.dev", "password-a");
const uidA = uidByEmail("a@test.dev");
check("A's account exists server-side", !!uidA);
const doorShown = await p.evaluate(() => !document.getElementById("potSheet").hidden);
check("the guest-upload door is offered to the first account", doorShown);
if (doorShown) { await p.click("#potYes"); await p.waitForTimeout(1800); }
await dismissOverlays();
check("the pot's tasks became A's", await p.evaluate(() => document.body.innerText.includes("Guest pot task one")));
check("A's state doc holds the pot on the server", !!docOf(uidA, "data/state") && JSON.parse(docOf(uidA, "data/state").stateJson).tasks.length === 2);
check("the guest pot was consumed (A's tasks gone from the guest slot)", await p.evaluate(() => !(JSON.parse(localStorage.getItem("calmcal-v1:guest")).tasks || []).some((t) => /Guest pot task/.test(t.title))));
check("A's spine exists with the default free plan", !!docOf(uidA) && docOf(uidA).plan === "free" && !!docOf(uidA).createdAt);
// 4. A's first own event fires the activation stamp.
await p.evaluate(() => document.querySelector('[data-panel="calendar"]').click()); await p.waitForTimeout(400);
await p.click("#addBtn"); await p.waitForSelector("#addSheet:not([hidden])");
await p.fill("#quickText", "A brand new event");
await p.click("#addSave"); await p.waitForTimeout(2200);
check("activation stamp fired on first event", !!docOf(uidA) && docOf(uidA).activationKind === "event" && !!docOf(uidA).activatedAt);
check("A's new event synced to A's state doc", JSON.parse(docOf(uidA, "data/state").stateJson).tasks.some((t) => t.title === "A brand new event"));
// 5. Sign out: guest is separate, A's cache stays on the device.
await settings(); await p.click("#accountOut"); await p.waitForTimeout(900);
await dismissOverlays();
check("signed out boots the guest, not A's world", await p.evaluate(() => !document.body.innerText.includes("A brand new event")));
check("A's cache stays on the device under A's key", await p.evaluate((u) => !!localStorage.getItem("calmcal-v1:" + u), uidA));
// 6. B signs up: no door (offered once), empty start, own world.
await signUp("b@test.dev", "password-b");
const uidB = uidByEmail("b@test.dev");
check("B is NOT offered the pot door", await p.evaluate(() => document.getElementById("potSheet").hidden));
await dismissOverlays();
check("B starts empty (no bleed from A)", await p.evaluate(() => !document.body.innerText.includes("Guest pot task") && !document.body.innerText.includes("A brand new event")));
// 7. REST cross-access denied (B's token against A's doc).
const cross = await p.evaluate(async (a) => {
  const s = JSON.parse(localStorage.getItem("pace-auth-v1"));
  const cfg = window.PACE_FB_CONFIG;
  const r = await fetch(cfg.restFirestore + "/v1/projects/pace-test/databases/(default)/documents/users/" + a + "/data/state", { headers: { Authorization: "Bearer " + s.idToken } });
  return r.status;
}, uidA);
check("B's token is denied A's state doc at the API (403)", cross === 403);
const countDenied = await p.evaluate(async () => {
  const out = await window.PaceFB.fsCount("users", []).then(() => "allowed").catch((e) => "denied:" + (e.status || ""));
  return out;
});
check("a non-owner cannot run CEO counts", String(countDenied).startsWith("denied"));
// 8. A returns: round trip intact.
await settings(); await p.click("#accountOut"); await p.waitForTimeout(800);
await dismissOverlays();
await settings(); await p.click("#accountOpen"); await p.waitForSelector("#authSheet:not([hidden])");
await p.fill("#authEmail", "a@test.dev"); await p.fill("#authPass", "password-a");
await p.click("#authSignIn"); await p.waitForTimeout(2200);
await dismissOverlays();
check("A's world survives the round trip (saved-data leg)", await p.evaluate(() => document.body.innerText.includes("A brand new event")));
// 9. String heal through the server copy.
const aDoc = docOf(uidA, "data/state");
const aState = JSON.parse(aDoc.stateJson);
aState.todos = ["a bare string todo"];
aState.updatedAt = Date.now() + 60000;
mock.docs.set("users/" + uidA + "/data/state", { stateJson: JSON.stringify(aState), updatedAt: new Date().toISOString() });
await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(1800);
check("a bare-string todo entry heals into an item (never dropped)", await p.evaluate(() => { const s = JSON.parse(localStorage.getItem("calmcal-v1:" + JSON.parse(localStorage.getItem("pace-auth-v1")).uid)); return (s.todos || []).some((t) => t && t.text === "a bare string todo"); }));
// 10. Delete account: docs + auth user gone, boot falls to guest.
await settings(); await p.click("#accountDelete"); await p.waitForSelector("#deleteSheet:not([hidden])");
await p.fill("#deletePass", "password-a"); await p.click("#deleteGo"); await p.waitForTimeout(2200);
check("account deletion removed A's server docs", !docOf(uidA) && !docOf(uidA, "data/state"));
check("account deletion removed the auth user", !mock.users.has("a@test.dev"));
check("after deletion the app boots as guest", await p.evaluate(() => !localStorage.getItem("pace-auth-v1")));
await b.close(); server.close(); mock.close();
console.log("RESULT pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
