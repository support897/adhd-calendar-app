// Pace accounts battery — LIVE leg (the SEAL's second leg):
// the mock battery's exact story run against the REAL test twin
// (pace-test-c00fa) with the shipped firestore.rules published.
// Assertions read over REST with each user's own token; denials
// are the live 403s. TU identities per MULTIUSER §10.
import { chromium } from "/home/hatch/node_modules/playwright-core/index.mjs";
import http from "http"; import fs from "fs"; import path from "path";
const ROOT = "/home/hatch/workspace/adhd-calendar-app";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".gz": "application/gzip", ".png": "image/png" };
const TWIN = { apiKey: "AIzaSyDtzBATSYj-pbQiBipcj4rZ6G6lx66TRhg", projectId: "pace-test-c00fa" };
const testConfig = `window.PACE_FB_CONFIG = { apiKey: "${TWIN.apiKey}", authDomain: "pace-test-c00fa.firebaseapp.com", projectId: "${TWIN.projectId}", appId: "1:993767785197:web:ecc7b4b9390db5967742e4", googleClientId: null, appleEnabled: false };`;
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
  if (p === "/firebase-config.js") { res.writeHead(200, { "Content-Type": "text/javascript" }); res.end(testConfig); return; }
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(9127, r));
let pass = 0, fail = 0;
const check = (n, ok) => { console.log((ok ? "PASS " : "FAIL ") + n); ok ? pass++ : fail++; };
const FS = "https://firestore.googleapis.com/v1/projects/" + TWIN.projectId + "/databases/(default)/documents/";
const IDP = "https://identitytoolkit.googleapis.com/v1/accounts:";
async function fsGet(path, token) {
  const r = await fetch(FS + path, { headers: { Authorization: "Bearer " + token } });
  if (r.status === 404) return null;
  const j = await r.json();
  if (!r.ok) { const e = new Error("fs " + r.status); e.status = r.status; throw e; }
  const dec = (v) => { if (!v || typeof v !== "object") return null; if ("stringValue" in v) return v.stringValue; if ("booleanValue" in v) return v.booleanValue; if ("integerValue" in v) return parseInt(v.integerValue, 10); if ("timestampValue" in v) return v.timestampValue; if ("nullValue" in v) return null; return null; };
  const o = {}; for (const k of Object.keys(j.fields || {})) o[k] = dec(j.fields[k]);
  return o;
}
const b = await chromium.launch({ executablePath: "/home/hatch/.cache/ms-playwright/chromium-1187/chrome-linux/chrome", args: ["--no-sandbox"] });
const ctx = await b.newContext({ viewport: { width: 540, height: 960 } });
const p = await ctx.newPage();
p.setDefaultTimeout(12000);
const K = new Date().toISOString().slice(0, 10);
const guestSeed = { settings: { guideDone: true }, welcomed: true, samplesLoaded: true, imports: [], feelings: {}, checks: {}, habitLog: {}, habits: [], todos: [], tasks: [
  { id: "g1", title: "Guest pot task one", date: K, time: null, durationMin: 30, priority: 0, repeat: null, category: "work", color: "#5B6BD5", essential: false, status: "todo", steps: [], minVersion: "", fullVersion: "", source: "manual", originalText: "", skipDates: [], doneDates: [] },
  { id: "g2", title: "Guest pot task two", date: K, time: null, durationMin: 30, priority: 0, repeat: null, category: "work", color: "#5B6BD5", essential: false, status: "todo", steps: [], minVersion: "", fullVersion: "", source: "manual", originalText: "", skipDates: [], doneDates: [] },
] };
await p.addInitScript((s) => { if (!localStorage.getItem("calmcal-v1:guest")) localStorage.setItem("calmcal-v1:guest", JSON.stringify(s)); }, guestSeed);
const stamp = Date.now().toString(36);
const EMAIL_A = "sec-pace-a+" + stamp + "@example.com", EMAIL_B = "sec-pace-b+" + stamp + "@example.com";
async function settings() { await p.evaluate(() => { const sb = document.getElementById("sidebar"); if (sb.getBoundingClientRect().width < 40) document.getElementById("sbExpand").click(); }); await p.click('.side-item[data-panel="settings"]'); await p.waitForTimeout(400); }
async function dismissOverlays() {
  if (await p.locator("#welcome").isVisible().catch(() => false)) { await p.click("#welcomeSkip"); await p.waitForTimeout(300); }
  if (await p.locator("#guideSheet").isVisible().catch(() => false)) { await p.click("#guideSkip"); await p.waitForTimeout(300); }
}
const sess = () => p.evaluate(() => JSON.parse(localStorage.getItem("pace-auth-v1") || "null"));
async function signUp(email, pw) {
  await settings();
  await p.click("#accountOpen"); await p.waitForSelector("#authSheet:not([hidden])");
  await p.fill("#authEmail", email); await p.fill("#authPass", pw);
  await p.click("#authSignUp");
  await p.waitForFunction(() => !!localStorage.getItem("pace-auth-v1"), null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(1200);
}
await p.goto("http://localhost:9127/", { waitUntil: "networkidle" }); await p.waitForTimeout(700);
await settings();
check("configured build shows the Account group (live config)", await p.evaluate(() => !document.getElementById("accountGroup").hidden));
await signUp(EMAIL_A, "password-a1");
const sA = await sess();
check("TU-A signed up on the twin", !!sA && !!sA.uid);
const doorShown = await p.evaluate(() => !document.getElementById("potSheet").hidden);
check("the guest-upload door is offered to the first account (live)", doorShown);
if (doorShown) { await p.click("#potYes"); await p.waitForTimeout(2200); }
await dismissOverlays();
const spineA = sA ? await fsGet("users/" + sA.uid, sA.idToken).catch(() => null) : null;
check("TU-A spine exists live and carries NO plan field (v2)", !!spineA && !("plan" in spineA) && !!spineA.createdAt);
const stateA = sA ? await fsGet("users/" + sA.uid + "/data/state", sA.idToken).catch(() => null) : null;
check("TU-A state doc holds the pot (live, 2 tasks)", !!stateA && JSON.parse(stateA.stateJson).tasks.length === 2);
check("the guest pot was consumed (live)", await p.evaluate(() => !(JSON.parse(localStorage.getItem("calmcal-v1:guest")).tasks || []).some((t) => /Guest pot task/.test(t.title))));
await p.evaluate(() => document.querySelector('[data-panel="calendar"]').click()); await p.waitForTimeout(400);
await p.click("#addBtn"); await p.waitForSelector("#addSheet:not([hidden])");
await p.fill("#quickText", "A brand new event");
await p.click("#addSave"); await p.waitForTimeout(2800);
const spineA2 = await fsGet("users/" + sA.uid, sA.idToken).catch(() => null);
check("activation stamp fired live (first event)", !!spineA2 && spineA2.activationKind === "event" && !!spineA2.activatedAt);
await settings(); await p.click("#accountOut"); await p.waitForTimeout(900); await dismissOverlays();
check("signed out boots the guest (live)", await p.evaluate(() => !document.body.innerText.includes("A brand new event")));
await signUp(EMAIL_B, "password-b1");
const sB = await sess();
check("TU-B signed up on the twin", !!sB && !!sB.uid && sB.uid !== sA.uid);
check("TU-B is NOT offered the pot door (live)", await p.evaluate(() => document.getElementById("potSheet").hidden));
await dismissOverlays();
check("TU-B starts empty (live, no bleed)", await p.evaluate(() => !document.body.innerText.includes("Guest pot task") && !document.body.innerText.includes("A brand new event")));
const cross = await fetch(FS + "users/" + sA.uid + "/data/state", { headers: { Authorization: "Bearer " + sB.idToken } });
check("TU-B's token is denied TU-A's state by the REAL rules (403)", cross.status === 403);
const crossSpine = await fetch(FS + "users/" + sA.uid, { headers: { Authorization: "Bearer " + sB.idToken } });
check("TU-B's token is denied TU-A's spine too (403, not the owner)", crossSpine.status === 403);
const ownerDoc = await fetch(FS + "_owner/config", { headers: { Authorization: "Bearer " + sB.idToken } });
check("_owner/config is unreadable by any client (403/404)", ownerDoc.status === 403 || ownerDoc.status === 404);
const shardRead = await fetch(FS + "aggSignups/" + sA.uid, { headers: { Authorization: "Bearer " + sA.idToken } });
check("the aggSignups shard is owner-space: even its own user cannot read it (403)", shardRead.status === 403);
// The anonymous-provider fence: an anon session mints NO cloud space.
const anonSign = await (await fetch(IDP + "signUp?key=" + TWIN.apiKey, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ returnSecureToken: true }) })).json();
const anonWrite = await fetch(FS + "users/" + anonSign.localId, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: "Bearer " + anonSign.idToken }, body: JSON.stringify({ fields: { createdAt: { timestampValue: new Date().toISOString() } } }) });
check("an anonymous session is denied a spine write by the fence (403)", anonWrite.status === 403);
const anon = await fetch(FS + "users/" + sA.uid + "/data/state");
check("signed-out reads are denied (401/403)", anon.status === 401 || anon.status === 403);
// Round trip: A returns, world intact.
await settings(); await p.click("#accountOut"); await p.waitForTimeout(800); await dismissOverlays();
await settings(); await p.click("#accountOpen"); await p.waitForSelector("#authSheet:not([hidden])");
await p.fill("#authEmail", EMAIL_A); await p.fill("#authPass", "password-a1");
await p.click("#authSignIn"); await p.waitForTimeout(2600); await dismissOverlays();
check("TU-A's world survives the round trip (live saved-data leg)", await p.evaluate(() => document.body.innerText.includes("A brand new event")));
// Deletion sweep.
await settings(); await p.click("#accountDelete"); await p.waitForSelector("#deleteSheet:not([hidden])");
await p.fill("#deletePass", "password-a1"); await p.click("#deleteGo"); await p.waitForTimeout(2600);
const relogin = await fetch(IDP + "signInWithPassword?key=" + TWIN.apiKey, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL_A, password: "password-a1", returnSecureToken: true }) });
check("deleted TU-A can no longer sign in (live)", relogin.status === 400);
check("after deletion the app boots as guest (live)", await p.evaluate(() => !localStorage.getItem("pace-auth-v1")));
// Leave TU-B in place as the twin's standing second account; report the identities used.
console.log("IDENTITIES A=" + EMAIL_A + " B=" + EMAIL_B);
await b.close(); server.close();
console.log("RESULT pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
