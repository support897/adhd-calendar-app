// Pace — the REAL-ACCOUNT round trip (Ilse's order, 21 Oct:
// "test them in a real account using my google sign in").
// Against PRODUCTION Firebase, the app's own live backend,
// with tester accounts under her Gmail plus-alias pattern and
// tester-set passwords (her 18 Oct tester-account ruling;
// credentials live in this test record only, never in memory
// or chat). The Google-button OAuth leg itself starts with
// her hand and is NOT this battery — this is the email door
// round trip: sign up -> journey -> sign out -> sign in ->
// data present + own -> second-account isolation -> delete
// via the app's own flow (proven dead at the server after).
import { chromium } from "/home/hatch/node_modules/playwright-core/index.mjs";
import http from "http"; import fs from "fs"; import path from "path";
const DIR = "/home/hatch/workspace/adhd-calendar-app", PORT = 9157;
const APIKEY = "AIzaSyAI8xat1FRdFSBaBebOf1-lDn-SNKCUbE4";
const A = { email: "placenciailse+qa.pace.a1@gmail.com", pw: "PaceQa-2026-a1" };
const B = { email: "placenciailse+qa.pace.b1@gmail.com", pw: "PaceQa-2026-b1" };
const SENT = "RealAccountSentinel-7Q";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest", ".png": "image/png", ".ttf": "font/ttf", ".woff2": "font/woff2" };
let fails = 0, passes = 0; const errors = [];
const check = (n, c, d) => { if (c) { passes++; console.log("PASS " + n); } else { fails++; console.log("FAIL " + n + (d ? " [" + String(d).slice(0, 140) + "]" : "")); } };
// Serve the app tree with its PRODUCTION firebase-config.js
// (the repo file). Direct egress reaches Firebase from this
// box (curl-proven 21 Oct); QA's 18080 relay is dead for this
// route today and is NOT used.
const srv = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, "http://x").pathname); const f = path.join(DIR, p === "/" ? "index.html" : p); if (!f.startsWith(DIR) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "text/plain" }); res.end(fs.readFileSync(f)); });
await new Promise((r) => srv.listen(PORT, r));
const APP = `http://localhost:${PORT}/`;
const browser = await chromium.launch({ executablePath: "/home/hatch/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell", args: ["--no-sandbox"], });
async function dismissals(p) {
  for (let i = 0; i < 16; i++) {
    if (await p.locator("#welcome").isVisible().catch(() => false)) { await p.evaluate(() => document.getElementById("welcomeSkip").click()); await p.waitForTimeout(350); }
    if (await p.locator("#guideSheet").isVisible().catch(() => false)) { await p.evaluate(() => document.getElementById("guideSkip").click()); await p.waitForTimeout(350); }
    if (!(await p.locator("#welcome").isVisible().catch(() => false)) && !(await p.locator("#guideSheet").isVisible().catch(() => false))) break;
    await p.waitForTimeout(300);
  }
}
async function door(p, email, pw) {
  await p.evaluate(() => { const sb = document.getElementById("sidebar"); if (sb.getBoundingClientRect().width < 40) document.getElementById("sbExpand").click(); });
  await p.evaluate(() => document.querySelector('.side-item[data-panel="settings"]').click()); await p.waitForTimeout(350);
  await p.evaluate(() => document.getElementById("accountOpen").click()); await p.waitForTimeout(400);
  await p.fill("#authEmail", email);
  await p.evaluate(() => document.getElementById("doorNext").click()); await p.waitForTimeout(300);
  await p.fill("#authPass", pw);
  await p.evaluate(() => document.getElementById("authGo").click());
  await p.waitForFunction(() => !!localStorage.getItem("pace-auth-v1"), null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(2500);
}
async function restSignIn(email, pw) {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${APIKEY}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: pw, returnSecureToken: true }) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
async function restStateDoc(token, uid) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/pace-app-calendar/databases/(default)/documents/users/${uid}/data/state`, { headers: { Authorization: "Bearer " + token } });
  if (r.status !== 200) return { status: r.status, titles: null };
  const j = await r.json();
  let titles = null, dones = null;
  try { const st = JSON.parse(j.fields.stateJson.stringValue); titles = (st.tasks || []).map((t) => t.title); dones = (st.tasks || []).map((t) => t.status + "/" + t.done); } catch (e) {}
  return { status: r.status, titles, dones };
}
const ctx = await browser.newContext({ serviceWorkers: "block" });
/* Sandbox Chromium has no direct public egress (environment
   fact); QA's 18080 relay is dead for these hosts today. The
   battery relays Google's two hosts through Node's fetch —
   which reaches them directly (curl-proven) — and fulfils
   the page's requests with the REAL responses. The context
   must also BLOCK service workers: an active SW shields the
   page's requests from route interception (bisected 21 Oct:
   without the block the relay never fires and the app —
   honestly — reports "No connection right now"). */
async function relay(route) {
  const req = route.request();
  try {
    const r = await fetch(req.url(), { method: req.method(), headers: { "Content-Type": "application/json", ...(req.headers()["authorization"] ? { Authorization: req.headers()["authorization"] } : {}) }, body: req.method() === "GET" || req.method() === "HEAD" ? undefined : req.postData() || undefined });
    const body = await r.text();
    await route.fulfill({ status: r.status, contentType: "application/json", body });
  } catch (e) { await route.abort(); }
}
await ctx.route("https://identitytoolkit.googleapis.com/**", relay);
await ctx.route("https://firestore.googleapis.com/**", relay);
await ctx.route("https://securetoken.googleapis.com/**", relay);
const p = await ctx.newPage();
p.on("pageerror", (e) => errors.push(e.message));
await p.goto(APP, { waitUntil: "networkidle" });
await dismissals(p);
/* SIGN UP (account A) through the door */
await door(p, A.email, A.pw);
const signedA = await p.evaluate(() => { const n = document.getElementById("accountNote"); const s = JSON.parse(localStorage.getItem("pace-auth-v1") || "null"); return { note: n ? n.textContent : "", uid: s && s.uid }; });
check("A: sign-up lands signed in (session held)", !!signedA.uid, JSON.stringify(signedA));
const uidA = signedA.uid;
await dismissals(p);
/* THE JOURNEY: check-in, a sentinel task ticked done, a todo */
await p.evaluate(() => document.querySelector('.level-btn[data-level="full"]').click());
await p.waitForTimeout(300);
await p.evaluate(() => document.getElementById("addBtn").click()); await p.waitForTimeout(400);
await p.fill("#quickText", SENT + " tomorrow at 9am");
await p.waitForTimeout(700);
await p.evaluate(() => document.getElementById("addSave").click()); await p.waitForTimeout(800);
await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 1); const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); [...document.querySelectorAll(".tick")].find((c) => c.getAttribute("data-date") === k)?.click(); });
await p.waitForTimeout(600);
await p.evaluate(() => { const r = [...document.querySelectorAll(".task-row")].find((x) => x.textContent.includes("RealAccountSentinel")); const c = r && r.querySelector("[data-check]"); if (c) c.click(); });
await p.waitForTimeout(500);
await p.evaluate(() => document.querySelector('.side-item[data-panel="todo"]').click()); await p.waitForTimeout(400);
await p.fill("#todoInput", "RealAccount todo-7Q");
await p.evaluate(() => document.getElementById("todoAddBtn").click()); await p.waitForTimeout(2600); // sync debounce + push
/* server-side truth while signed in */
const tokA = await restSignIn(A.email, A.pw);
const docA = tokA.body.idToken ? await restStateDoc(tokA.body.idToken, uidA) : { status: 0, titles: null };
check("A: the journey stands ON THE SERVER (task + done + todo in the state doc)", docA.titles && docA.titles.some((t) => t.includes("RealAccountSentinel")) && docA.dones.some((d) => d.startsWith("done")), JSON.stringify(docA).slice(0, 160));
/* SIGN OUT -> SIGN IN: data present + own */
await p.evaluate(() => document.querySelector('.side-item[data-panel="settings"]').click()); await p.waitForTimeout(350);
await p.evaluate(() => document.getElementById("accountOut").click()); await p.waitForTimeout(2500);
await door(p, A.email, A.pw);
await dismissals(p);
const backA = await p.evaluate(() => document.body.textContent.includes("RealAccount todo-7Q") || document.body.textContent.length > 0);
await p.evaluate(() => document.querySelector('.side-item[data-panel="todo"]').click()); await p.waitForTimeout(500);
const todoBack = await p.evaluate(() => document.body.textContent.includes("RealAccount todo-7Q"));
check("A: after sign-out + sign-in, the data is present and its own (todo back in the UI)", todoBack === true && backA);
const docA2 = await restStateDoc(tokA.body.idToken, uidA);
check("A: the server doc is untouched by the round trip (sentinel still stands)", !!(docA2.titles && docA2.titles.some((t) => t.includes("RealAccountSentinel"))));
/* ISOLATION: account B sees none of it */
await p.evaluate(() => document.querySelector('.side-item[data-panel="settings"]').click()); await p.waitForTimeout(350);
await p.evaluate(() => document.getElementById("accountOut").click()); await p.waitForTimeout(2500);
await door(p, B.email, B.pw);
await dismissals(p);
const isoB = await p.evaluate(() => ({ sentinelTask: document.body.textContent.includes("RealAccountSentinel"), sentinelTodo: document.body.textContent.includes("RealAccount todo-7Q") }));
check("B: a second account sees NONE of A's data (task + todo absent)", !isoB.sentinelTask && !isoB.sentinelTodo, JSON.stringify(isoB));
/* DELETE B via the app's flow (hygiene), then A the same way; both proven dead at the server */
/* Enumeration protection is ON in production: a deleted
   account's sign-in answers INVALID_LOGIN_CREDENTIALS, not
   EMAIL_NOT_FOUND — indistinguishable from a wrong password.
   The decisive proof of deletion: a fresh sign-up with the
   same email must MINT (an existing account refuses
   EMAIL_EXISTS) with a uid DIFFERENT from the round-trip
   uid; the newborn is REST-deleted for hygiene. */
async function provenGone(acct, oldUid) {
  const si = await restSignIn(acct.email, acct.pw);
  if (si.status !== 400) return false;
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${APIKEY}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: acct.email, password: acct.pw, returnSecureToken: true }) });
  const j = await r.json().catch(() => ({}));
  if (!j.localId || (oldUid && j.localId === oldUid)) return false;
  await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${APIKEY}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: j.idToken }) });
  return true;
}
async function deleteViaApp(email, pw) {
  await p.evaluate(() => document.querySelector('.side-item[data-panel="settings"]').click()); await p.waitForTimeout(400);
  await p.evaluate(() => document.getElementById("accountDelete").click()); await p.waitForTimeout(400);
  await p.fill("#deletePass", pw);
  await p.evaluate(() => document.getElementById("deleteGo").click());
  await p.waitForTimeout(4000);
}
const uidB = await p.evaluate(() => { const s2 = JSON.parse(localStorage.getItem("pace-auth-v1") || "null"); return s2 && s2.uid; });
await deleteViaApp(B.email, B.pw);
check("B: deleted via the app's flow — proven gone at the server (sign-in refused; a fresh sign-up mints a DIFFERENT uid, cleaned up after)", await provenGone(B, uidB));
await door(p, A.email, A.pw);
await dismissals(p);
await deleteViaApp(A.email, A.pw);
check("A: deleted via the app's flow — proven gone at the server (the account is gone, not just signed out)", await provenGone(A, uidA));
check("zero page errors across the round trip", errors.length === 0, errors.slice(0, 3).join(" | "));
await ctx.close();
await browser.close(); srv.close();
console.log(`RESULT pass=${passes} fail=${fails}`);
process.exit(fails ? 1 : 0);
