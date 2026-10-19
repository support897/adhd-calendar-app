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
const b = await chromium.launch({ executablePath: "/home/hatch/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell", args: ["--no-sandbox"] });
const ctx = await b.newContext({ viewport: { width: 540, height: 960 } });
const p = await ctx.newPage();
p.setDefaultTimeout(9000);
const K = (() => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); })(); // LOCAL day key — never toISOString (UTC yesterday each Sydney evening; the pot leg red on exactly that seam, ac39/ac40)
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
  // NEVER click while the pot sheet is up — it owns the screen
  // (and a retry-click through the race can land on its buttons).
  if (await p.evaluate(() => !document.getElementById("potSheet").hidden)) return;
  // The check above cannot close the race on a loaded box: the pot
  // door can rise BETWEEN the check and the click (seen 17 Oct — a
  // 9s actionability burn against the risen sheet). Short-timeout
  // clicks that fail soft let waitPotDoor's loop re-evaluate instead.
  if (await p.locator("#welcome").isVisible().catch(() => false)) { await p.click("#welcomeSkip", { timeout: 1500 }).catch(() => {}); await p.waitForTimeout(300); }
  if (await p.locator("#guideSheet").isVisible().catch(() => false)) { await p.click("#guideSkip", { timeout: 1500 }).catch(() => {}); await p.waitForTimeout(300); }
}
async function waitPotDoor(ms) {
  // The door rides the reconcile chain; on a loaded VM it can
  // land seconds after sign-in. Wait for IT (clearing welcome /
  // guide out of its way only while it is not yet up).
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await p.evaluate(() => !document.getElementById("potSheet").hidden)) return true;
    await dismissOverlays();
    await p.waitForTimeout(500);
  }
  return p.evaluate(() => !document.getElementById("potSheet").hidden);
}
// The refined door: email + arrow first, password second.
async function doorThrough(pg, email, pw) {
  await pg.fill("#authEmail", email);
  await pg.click("#doorNext");
  await pg.waitForSelector("#doorStep2:not([hidden])");
  await pg.fill("#authPass", pw);
  await pg.click("#authGo");
}
async function signUp(email, pw) {
  await settings();
  await p.click("#accountOpen"); await p.waitForSelector("#authSheet:not([hidden])");
  await doorThrough(p, email, pw); // the door's one button creates the account
  await p.waitForFunction(() => { const s = JSON.parse(localStorage.getItem("pace-auth-v1") || "null"); return s && s.email === document.querySelector("#authEmail")?.value || (s && s.email); }, null, { timeout: 9000 }).catch(() => {});
  await settleTour();
}
// After a join, the app settles through: welcome → Skip's
// TOUR (its first stop asks the name — answer it, then skip
// the rest) → the pot door stays for the legs to judge.
async function settleTour() {
  for (let i = 0; i < 30; i++) {
    if (await p.locator("#tourName").isVisible().catch(() => false)) {
      await p.fill("#tourName", "Test Person");
      await p.click("#guideNext"); await p.waitForTimeout(500);
    } else if (await p.locator("#guideSheet").isVisible().catch(() => false)) {
      await p.click("#guideSkip").catch(() => {}); await p.waitForTimeout(400);
    } else if (await p.locator("#welcome").isVisible().catch(() => false)) {
      await p.click("#welcomeSkip").catch(() => {}); await p.waitForTimeout(400);
    } else if (await p.locator("#potSheet").isVisible().catch(() => false)) {
      return; // settled — the pot door is the legs' business
    } else return;
  }
}
await p.goto("http://localhost:9123/", { waitUntil: "networkidle" }); await p.waitForTimeout(700);
await settings();
check("configured build shows the Account group", await p.evaluate(() => !document.getElementById("accountGroup").hidden));
// 1-3. Sign up A, the door, bring the pot in.
await signUp("a@test.dev", "password-a");
const uidA = uidByEmail("a@test.dev");
check("A's account exists server-side", !!uidA);
const doorShown = await waitPotDoor(25000);
check("the guest-upload door is offered to the first account", doorShown);
if (doorShown) { await p.click("#potYes"); await p.waitForTimeout(1800); }
await dismissOverlays();
// Poll for the adopted text: adoption is proven at the state
// layer below either way; this read waits for the re-render
// to land (a one-shot read raced it under load, ac39).
let potShown = false;
for (let i = 0; i < 20 && !potShown; i++) { potShown = await p.evaluate(() => document.body.innerText.includes("Guest pot task one")); if (!potShown) await p.waitForTimeout(400); }
check("the pot's tasks became A's", potShown);
check("A's state doc holds the pot on the server", !!docOf(uidA, "data/state") && JSON.parse(docOf(uidA, "data/state").stateJson).tasks.length === 2);
check("the guest pot was consumed (A's tasks gone from the guest slot)", await p.evaluate(() => !(JSON.parse(localStorage.getItem("calmcal-v1:guest")).tasks || []).some((t) => /Guest pot task/.test(t.title))));
check("A's spine exists and carries NO plan field (v2)", !!docOf(uidA) && !("plan" in docOf(uidA)) && !!docOf(uidA).createdAt);
check("the aggSignups shard exists in the owner space", !!mock.docs.get("aggSignups/" + uidA) && !!mock.docs.get("aggSignups/" + uidA).createdAt);
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
let bDoor = false;
for (let i = 0; i < 16; i++) { if (await p.evaluate(() => !document.getElementById("potSheet").hidden)) { bDoor = true; break; } await p.waitForTimeout(500); }
check("B is NOT offered the pot door", !bDoor);
if (bDoor) console.log("BDOOR:", JSON.stringify(await p.evaluate(() => { const g = JSON.parse(localStorage.getItem("calmcal-v1:guest") || "{}"); return { stamp: localStorage.getItem("pace-pot-offered"), consumed: localStorage.getItem("pace-pot-consumed"), guestTasks: (g.tasks || []).length, guestTodos: (g.todos || []).length, guestUpdatedAt: g.updatedAt, potText: document.getElementById("potText").textContent.slice(0, 60) }; })));
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
await doorThrough(p, "a@test.dev", "password-a"); await p.waitForTimeout(2200);
await dismissOverlays();
await settleTour();
check("A's world survives the round trip (saved-data leg)", await p.evaluate(() => document.body.innerText.includes("A brand new event")));
// 9. String heal through the server copy.
const aDoc = docOf(uidA, "data/state");
const aState = JSON.parse(aDoc.stateJson);
aState.todos = ["a bare string todo"];
aState.updatedAt = Date.now() + 60000;
mock.docs.set("users/" + uidA + "/data/state", { stateJson: JSON.stringify(aState), updatedAt: new Date().toISOString() });
await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(1800);
await settleTour();
check("a bare-string todo entry heals into an item (never dropped)", await p.evaluate(() => { const s = JSON.parse(localStorage.getItem("calmcal-v1:" + JSON.parse(localStorage.getItem("pace-auth-v1")).uid)); return (s.todos || []).some((t) => t && t.text === "a bare string todo"); }));
// 9b. TU-C — the LIVE RACE as a fixture. On the twin journey,
// a fresh account's own first sync wrote its empty state doc
// while the reconcile was still fetching — the door keyed on
// "no doc" and died silently (the mock always won the race).
// The door keys on CONTENT now: C's state doc pre-exists here,
// C is empty-handed, the door must still be offered.
const cSign = await fetch("http://127.0.0.1:" + mock.port + "/v1/accounts:signUp?key=test-key-1234567890", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "c@test.dev", password: "password-c", returnSecureToken: true }) });
const cUid = (await cSign.json()).localId;
mock.docs.set("users/" + cUid, { createdAt: new Date().toISOString(), lastActiveAt: new Date().toISOString(), deletedByUser: false });
mock.docs.set("users/" + cUid + "/data/state", { stateJson: JSON.stringify({ tasks: [], todos: [], habits: [], feelings: {}, imports: [] }), updatedAt: new Date().toISOString() });
const ctx3 = await b.newContext();
await ctx3.addInitScript((s) => { if (!localStorage.getItem("calmcal-v1:guest")) localStorage.setItem("calmcal-v1:guest", JSON.stringify(s)); }, guestSeed);
const p3 = await ctx3.newPage();
await p3.goto("http://localhost:9123/", { waitUntil: "load" }); await p3.waitForTimeout(2500);
if (await p3.locator("#welcome").isVisible().catch(() => false)) { await p3.click("#welcomeSkip"); await p3.waitForTimeout(300); }
if (await p3.locator("#guideSheet").isVisible().catch(() => false)) { await p3.click("#guideSkip"); await p3.waitForTimeout(300); }
await p3.evaluate(() => { const sb = document.getElementById("sidebar"); if (sb.getBoundingClientRect().width < 40) document.getElementById("sbExpand").click(); });
await p3.click('.side-item[data-panel="settings"]'); await p3.waitForTimeout(400);
await p3.click("#accountOpen"); await p3.waitForSelector("#authSheet:not([hidden])");
await doorThrough(p3, "c@test.dev", "password-c");
let cDoor = false;
for (let i = 0; i < 40 && !cDoor; i++) {
  cDoor = await p3.evaluate(() => !document.getElementById("potSheet").hidden).catch(() => false); // the sign-in reload can destroy the context mid-poll
  if (!cDoor) {
    if (await p3.locator("#welcome").isVisible().catch(() => false)) { await p3.click("#welcomeSkip").catch(() => {}); }
    if (await p3.locator("#guideSheet").isVisible().catch(() => false)) { await p3.click("#guideSkip").catch(() => {}); }
    if (await p3.locator("#guideSheet").isVisible().catch(() => false)) { await p3.click("#guideSkip").catch(() => {}); } // the tour (with its name stop) precedes the pot door
    await p3.waitForTimeout(500);
  }
}
check("the door fires even when the account's state doc already exists (the live race)", cDoor);
if (cDoor) { await p3.click("#potNo"); await p3.waitForTimeout(400); }
await ctx3.close();
// 10. Delete account: docs + auth user gone, boot falls to guest.
// v2.2: the sweep takes the aggregate shards too (erasure
// takes the shard). Give A an imports shard to prove it dies.
mock.docs.set("aggImports/" + uidA, { events: 5, imports: 1, at: new Date().toISOString() });
check("pre-delete: A's shards exist", !!mock.docs.get("aggSignups/" + uidA) && !!mock.docs.get("aggImports/" + uidA));
await settings(); await p.click("#accountDelete"); await p.waitForSelector("#deleteSheet:not([hidden])");
await p.fill("#deletePass", "password-a"); await p.click("#deleteGo");
// Poll for the condition (the C-leg pattern): a fixed sleep
// under load reads a half-landed sweep as a failure. The poll
// covers the sweep's FULL end state, not only its first stage:
// the sweep runs state -> spine -> shards -> auth user, so a
// docs-only poll can exit while the auth user (the last stage)
// is still in flight, and the legs below then read a
// half-landed sweep as a product failure. (17 Oct: three of
// four reads across two desks failed exactly the auth-user +
// boots-as-guest pair, loaded and quiet boxes alike, while the
// docs and shards legs always passed; the fourth read 39/39.)
for (let i = 0; i < 60 && (docOf(uidA) || docOf(uidA, "data/state") || mock.users.has("a@test.dev") || await p.evaluate(() => !!localStorage.getItem("pace-auth-v1"))); i++) await p.waitForTimeout(250);
check("account deletion removed A's server docs", !docOf(uidA) && !docOf(uidA, "data/state"));
check("account deletion removed A's aggregate shards (v2.2)", !mock.docs.get("aggSignups/" + uidA) && !mock.docs.get("aggImports/" + uidA));
check("account deletion removed the auth user", !mock.users.has("a@test.dev"));
check("after deletion the app boots as guest", await p.evaluate(() => !localStorage.getItem("pace-auth-v1")));
/* ---------- 11. door-first joining (the ruling, 21:26) ---------- */
{
  const p4 = await ctx.newPage();
  p4.on("pageerror", (e) => errors.push("p4: " + e.message));
  await p4.goto("http://localhost:9123/", { waitUntil: "networkidle" });
  for (let i = 0; i < 10; i++) { // the welcome + guide can chain in late
    let any = false;
    if (await p4.locator("#welcome").isVisible().catch(() => false)) { await p4.click("#welcomeSkip").catch(() => {}); any = true; }
    if (await p4.locator("#guideSheet").isVisible().catch(() => false)) { await p4.click("#guideSkip").catch(() => {}); any = true; }
    if (!any) break;
    await p4.waitForTimeout(400);
  }
  await p4.evaluate(() => { const sb = document.getElementById("sidebar"); if (sb.getBoundingClientRect().width < 40) document.getElementById("sbExpand").click(); });
  await p4.click('.side-item[data-panel="settings"]'); await p4.waitForTimeout(400);
  await p4.click("#accountOpen");
  await p4.waitForSelector("#authSheet:not([hidden])");
  check("the door is a full first page: big mark + name, icon doors, email + arrow only (no password, no name field)", await p4.locator(".door-hero").isVisible() && (await p4.locator(".door-title").innerText()) === "Pace Calendar" && await p4.locator("#googleBtn").isVisible() && await p4.locator("#doorNext").isVisible()
    && !(await p4.locator("#authPass").isVisible().catch(() => false)) && (await p4.locator("#authName").count()) === 0 && (await p4.locator("#nameSheet").count()) === 0 && (await p4.locator("#nameBubble").count()) === 0);
  // PACE-001: a door message must land where the user stands. On step 1
  // the Google tap's outcome (here: the GIS script cannot load in the
  // sandbox) must appear in #authMsg1, mirrored in #authMsg — build 7
  // wrote it only to the hidden step-2 line and the button read dead.
  await p4.click("#googleBtn");
  await p4.waitForFunction(() => document.querySelector("#authMsg1").textContent.trim().length > 0, null, { timeout: 8000 }).catch(() => {});
  check("PACE-001: a step-1 Google failure speaks ON step 1", (await p4.locator("#authMsg1").innerText()).includes("Google") && await p4.locator("#doorStep1").isVisible());
  check("PACE-001: the two step lines mirror (one message, both homes)", (await p4.locator("#authMsg").innerText()) === (await p4.locator("#authMsg1").innerText()));
  await p4.fill("#authEmail", "not-an-email");
  await p4.click("#doorNext"); await p4.waitForTimeout(300);
  check("a bad email is refused at the arrow, in plain words", (await p4.locator("#authMsg1").innerText()).toLowerCase().includes("email") && await p4.locator("#doorStep1").isVisible());
  await p4.fill("#authEmail", "bad@@");
  await p4.click("#doorNext"); await p4.waitForTimeout(300);
  check("PACE-003: 'bad@@' is refused at the arrow too", (await p4.locator("#authMsg1").innerText()).includes("look right") && await p4.locator("#doorStep1").isVisible());
  await p4.fill("#authEmail", "a@b");
  await p4.click("#doorNext"); await p4.waitForTimeout(300);
  check("PACE-003: 'a@b' (no dot in the domain) is refused at the arrow", (await p4.locator("#authMsg1").innerText()).includes("look right") && await p4.locator("#doorStep1").isVisible());
  await p4.fill("#authEmail", "named@test.dev");
  await p4.click("#doorNext");
  await p4.waitForSelector("#doorStep2:not([hidden])");
  check("step 2 shows the email with Change + the password + one button", (await p4.locator("#doorEmailEcho").innerText()) === "named@test.dev" && await p4.locator("#doorChange").isVisible() && await p4.locator("#authGo").isVisible());
  await p4.click("#doorChange"); await p4.waitForTimeout(300);
  check("Change walks back to step 1", await p4.locator("#doorStep1").isVisible());
  await p4.click("#doorNext"); await p4.waitForSelector("#doorStep2:not([hidden])");
  await p4.fill("#authPass", "password-n");
  const tGo = Date.now();
  await p4.click("#authGo"); // the one button creates the account
  await p4.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem("pace-auth-v1") || "null"); } catch (e) { return false; } }, null, { timeout: 9000 }).catch(() => {});
  // Inside the app now: skip the fresh account's welcome, and
  // Skip's tour opens — its FIRST stop asks the name. The ask
  // counts only when BOTH the input is up AND its text has
  // landed (QA's probe-race note: under load the bubble text
  // can beat the input by a beat — poll for the pair).
  let askUp = false;
  for (let i = 0; i < 24 && !askUp; i++) {
    const vis = await p4.locator("#tourName").isVisible().catch(() => false);
    const txt = vis ? await p4.locator("#guideBubble").innerText().catch(() => "") : "";
    askUp = vis && txt.includes("What's your name");
    if (!askUp) {
      if (await p4.locator("#welcome").isVisible().catch(() => false)) { await p4.click("#welcomeSkip").catch(() => {}); }
      await p4.waitForTimeout(450);
    }
  }
  check("Skip's tour asks the name first, inside the app", askUp);
  console.log("TIMING create->tour name step (ms): " + (Date.now() - tGo)); // QA's calm-run arrival read, kept in every run
  await p4.fill("#tourName", "Sam Test");
  await p4.click("#guideNext"); await p4.waitForTimeout(600);
  await p4.click("#guideSkip").catch(() => {}); await p4.waitForTimeout(400); // rest of the tour: not this leg's business
  const prof = await p4.evaluate(() => {
    const sess = JSON.parse(localStorage.getItem("pace-auth-v1") || "null");
    const uk = sess && sess.uid ? "calmcal-v1:" + sess.uid : null;
    return uk ? (JSON.parse(localStorage.getItem(uk) || "{}").settings || {}).profileName : null;
  });
  check("the name is carried on the profile", prof === "Sam Test");
  check("the app addresses the user by their name", (await p4.locator("#accountLine").innerText()).startsWith("Hi Sam"));
  // The fresh account's own welcome + guide chain may still be
  // up over Settings — clear it before the button legs.
  for (let i = 0; i < 10; i++) {
    let any = false;
    if (await p4.locator("#welcome").isVisible().catch(() => false)) { await p4.click("#welcomeSkip").catch(() => {}); any = true; }
    if (await p4.locator("#guideSheet").isVisible().catch(() => false)) { await p4.click("#guideSkip").catch(() => {}); any = true; }
    if (!any) break;
    await p4.waitForTimeout(400);
  }
  // The guide's skip lands on the calendar — reopen Settings.
  await p4.evaluate(() => { const sb = document.getElementById("sidebar"); if (sb.getBoundingClientRect().width < 40) document.getElementById("sbExpand").click(); });
  await p4.click('.side-item[data-panel="settings"]'); await p4.waitForTimeout(400);
  // A returning sign-in through the door asks nothing again.
  await p4.click("#accountOut"); await p4.waitForTimeout(900);
  await p4.evaluate(() => { const sb = document.getElementById("sidebar"); if (sb.getBoundingClientRect().width < 40) document.getElementById("sbExpand").click(); });
  await p4.click('.side-item[data-panel="settings"]'); await p4.waitForTimeout(400);
  await p4.click("#accountOpen"); await p4.waitForSelector("#authSheet:not([hidden])");
  await doorThrough(p4, "named@test.dev", "password-n"); await p4.waitForTimeout(2400);
  check("a returning sign-in goes straight in (no tour, no name ask)", !(await p4.locator("#tourName").isVisible().catch(() => false)) && (await p4.locator("#accountLine").innerText()).startsWith("Hi Sam"));
  // The wrong password for an existing account is named plainly.
  await p4.evaluate(() => { const sb = document.getElementById("sidebar"); if (sb.getBoundingClientRect().width < 40) document.getElementById("sbExpand").click(); });
  await p4.click('.side-item[data-panel="settings"]'); await p4.waitForTimeout(400);
  await p4.click("#accountOut"); await p4.waitForTimeout(900);
  await p4.evaluate(() => { const sb = document.getElementById("sidebar"); if (sb.getBoundingClientRect().width < 40) document.getElementById("sbExpand").click(); });
  await p4.click('.side-item[data-panel="settings"]'); await p4.waitForTimeout(400);
  await p4.click("#accountOpen"); await p4.waitForSelector("#authSheet:not([hidden])");
  await doorThrough(p4, "named@test.dev", "wrong-password"); await p4.waitForTimeout(1200);
  check("a wrong password is refused in plain words", (await p4.locator("#authMsg").innerText()).toLowerCase().includes("password"));
  // The name ask is skippable in the moment: an empty Next
  // moves the tour on and sets nothing.
  await p4.click("#doorChange"); await p4.waitForTimeout(300);
  await p4.click("#authClose"); await p4.waitForTimeout(400);
  await p4.evaluate(() => { const sb = document.getElementById("sidebar"); if (sb.getBoundingClientRect().width < 40) document.getElementById("sbExpand").click(); });
  await p4.click('.side-item[data-panel="settings"]'); await p4.waitForTimeout(400);
  await p4.click("#accountOpen"); await p4.waitForSelector("#authSheet:not([hidden])");
  await doorThrough(p4, "empty@test.dev", "password-e");
  await p4.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem("pace-auth-v1") || "null"); } catch (e) { return false; } }, null, { timeout: 9000 }).catch(() => {});
  for (let i = 0; i < 16; i++) {
    if (await p4.locator("#tourName").isVisible().catch(() => false)) break;
    if (await p4.locator("#welcome").isVisible().catch(() => false)) { await p4.click("#welcomeSkip").catch(() => {}); }
    await p4.waitForTimeout(450);
  }
  await p4.click("#guideNext"); await p4.waitForTimeout(500); // empty name, Next anyway
  const noName = await p4.evaluate(() => {
    const sess = JSON.parse(localStorage.getItem("pace-auth-v1") || "null");
    const uk = sess && sess.uid ? "calmcal-v1:" + sess.uid : null;
    return uk ? !((JSON.parse(localStorage.getItem(uk) || "{}").settings || {}).profileName) : false;
  });
  check("an empty Next moves the tour on and sets no name", noName && !(await p4.locator("#tourName").isVisible().catch(() => false)));
  await p4.click("#guideSkip").catch(() => {});
  // THE GENTLE RE-OFFER (HQ ruling, sitting-shaped by the
  // Leg 6 law): a same-sitting reload stays silent — no re-ask
  // rides a page reload. The "next visit" is a NEW sitting: a
  // fresh context holding the same stored sign-in (the app
  // closed and reopened; sessionStorage does not carry). The
  // re-offer fires there, once.
  await p4.reload({ waitUntil: "networkidle" }); await p4.waitForTimeout(900);
  let sameSitting = false;
  for (let i = 0; i < 10; i++) { if (await p4.locator("#tourName").isVisible().catch(() => false)) { sameSitting = true; break; } await p4.waitForTimeout(400); }
  check("no name re-ask on a same-sitting reload (the Leg 6 law)", !sameSitting);
  const ctx5 = await b.newContext({ viewport: { width: 540, height: 960 }, storageState: await ctx.storageState() });
  const p5 = await ctx5.newPage();
  p5.on("pageerror", (e) => errors.push("p5: " + e.message));
  await p5.goto("http://localhost:9123/", { waitUntil: "networkidle" }); await p5.waitForTimeout(900);
  let reUp = false;
  for (let i = 0; i < 20 && !reUp; i++) { reUp = await p5.locator("#tourName").isVisible().catch(() => false); if (!reUp) await p5.waitForTimeout(400); }
  check("a skipped name is re-offered once, on the next visit (a new sitting)", reUp);
  await p5.fill("#tourName", "Em Test");
  await p5.click("#guideNext"); await p5.waitForTimeout(600);
  const profEm = await p5.evaluate(() => { const sess = JSON.parse(localStorage.getItem("pace-auth-v1") || "null"); const uk = sess && sess.uid ? "calmcal-v1:" + sess.uid : null; return uk ? (JSON.parse(localStorage.getItem(uk) || "{}").settings || {}).profileName : null; });
  check("the re-offered name lands on the profile", profEm === "Em Test");
  await ctx5.close();
  // A second skipper proves the never-a-third-time half.
  await p4.evaluate(() => { const sb = document.getElementById("sidebar"); if (sb.getBoundingClientRect().width < 40) document.getElementById("sbExpand").click(); });
  await p4.click('.side-item[data-panel="settings"]'); await p4.waitForTimeout(400);
  await p4.click("#accountOut"); await p4.waitForTimeout(900);
  await p4.evaluate(() => { const sb = document.getElementById("sidebar"); if (sb.getBoundingClientRect().width < 40) document.getElementById("sbExpand").click(); });
  await p4.click('.side-item[data-panel="settings"]'); await p4.waitForTimeout(400);
  await p4.click("#accountOpen"); await p4.waitForSelector("#authSheet:not([hidden])");
  await doorThrough(p4, "skip2@test.dev", "password-s");
  await p4.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem("pace-auth-v1") || "null"); } catch (e) { return false; } }, null, { timeout: 9000 }).catch(() => {});
  for (let i = 0; i < 16; i++) {
    if (await p4.locator("#tourName").isVisible().catch(() => false)) break;
    if (await p4.locator("#welcome").isVisible().catch(() => false)) { await p4.click("#welcomeSkip").catch(() => {}); }
    await p4.waitForTimeout(450);
  }
  await p4.click("#guideSkip").catch(() => {}); await p4.waitForTimeout(400); // skip the name step
  await p4.reload({ waitUntil: "networkidle" }); await p4.waitForTimeout(900);
  let re2Same = false;
  for (let i = 0; i < 10; i++) { if (await p4.locator("#tourName").isVisible().catch(() => false)) { re2Same = true; break; } await p4.waitForTimeout(400); }
  check("the second skipper: no re-ask on the same-sitting reload either", !re2Same);
  const ctx6 = await b.newContext({ viewport: { width: 540, height: 960 }, storageState: await ctx.storageState() });
  const p6 = await ctx6.newPage();
  p6.on("pageerror", (e) => errors.push("p6: " + e.message));
  await p6.goto("http://localhost:9123/", { waitUntil: "networkidle" }); await p6.waitForTimeout(900);
  let re2 = false;
  for (let i = 0; i < 20 && !re2; i++) { re2 = await p6.locator("#tourName").isVisible().catch(() => false); if (!re2) await p6.waitForTimeout(400); }
  check("the second skipper gets the same one re-offer (its next sitting)", re2);
  await p6.click("#guideSkip").catch(() => {}); await p6.waitForTimeout(400); // skip the re-offer too
  const ctx7 = await b.newContext({ viewport: { width: 540, height: 960 }, storageState: await ctx6.storageState() });
  await ctx6.close();
  const p7 = await ctx7.newPage();
  await p7.goto("http://localhost:9123/", { waitUntil: "networkidle" }); await p7.waitForTimeout(5000);
  check("after the re-offer is skipped, it never asks a third time", !(await p7.locator("#tourName").isVisible().catch(() => false)));
  await ctx7.close();
}

/* ---------- 11c. the native doors (18 Oct, the packaged-app fix) ----
   Inside the package the web popups cannot complete (Google blocks
   OAuth in webviews), so the plugin runs the OS-level sign-in and
   hands its credential to the SAME REST exchanges the web doors use.
   A stubbed Capacitor bridge stands in for the plugin; the mock
   records every signInWithIdp body so the Apple nonce can be read
   verbatim. The web legs above ran WITHOUT the stub — both worlds
   are proven, and neither disturbs the other. */
{
  const ctxN = await b.newContext({ viewport: { width: 540, height: 960 } });
  const pN = await ctxN.newPage();
  pN.setDefaultTimeout(9000);
  await pN.addInitScript(() => {
    window.Capacitor = { isNativePlatform: () => true, Plugins: { FirebaseAuthentication: {
      signInWithGoogle: async () => ({ credential: { idToken: "tok-google-1", providerId: "google.com" }, user: { uid: "native-g" } }),
      signInWithApple: async () => ({ credential: { idToken: "tok-apple-1", providerId: "apple.com", nonce: "raw-nonce-42" }, user: { displayName: "Native Tester" } }),
    } } };
  });
  const settleN = async () => {
    for (let i = 0; i < 14; i++) {
      if (await pN.locator("#welcome").isVisible().catch(() => false)) { await pN.click("#welcomeSkip", { timeout: 1500 }).catch(() => {}); }
      else if (await pN.locator("#guideSheet").isVisible().catch(() => false)) { await pN.click("#guideSkip", { timeout: 1500 }).catch(() => {}); }
      else break;
      await pN.waitForTimeout(400);
    }
  };
  const settingsN = async () => { await pN.evaluate(() => { const sb = document.getElementById("sidebar"); if (sb.getBoundingClientRect().width < 40) document.getElementById("sbExpand").click(); }); await pN.click('.side-item[data-panel="settings"]'); await pN.waitForTimeout(400); };
  // Navigation-tolerant: the native sign-in reloads the page
  // (afterSignIn), and an evaluate landing mid-navigation dies
  // with "Execution context was destroyed" — retry it briefly.
  const sessN = async () => {
    for (let i = 0; i < 8; i++) {
      try { return await pN.evaluate(() => { try { return JSON.parse(localStorage.getItem("pace-auth-v1") || "null"); } catch (e) { return null; } }); }
      catch (e) { await pN.waitForTimeout(450); }
    }
    return null;
  };
  await pN.goto("http://localhost:9123/", { waitUntil: "networkidle" });
  await pN.waitForTimeout(600);
  await settleN();
  await settingsN();
  await pN.click("#accountOpen"); await pN.waitForSelector("#authSheet:not([hidden])");
  check("native: the Apple button shows on native even with the web Apple door off", await pN.locator("#appleBtn").isVisible());
  const idpBefore = mock.idpCalls.length;
  await pN.click("#googleBtn");
  await pN.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem("pace-auth-v1") || "null"); } catch (e) { return false; } }, null, { timeout: 9000 }).catch(() => {});
  const sessG = await sessN();
  const callG = mock.idpCalls.slice(idpBefore).find((c) => c.providerId === "google.com");
  check("native: Google door — the plugin's token crossed the REST exchange into a session", !!(sessG && sessG.uid) && !!callG && callG.idToken === "tok-google-1");
  await pN.waitForTimeout(800);
  await settleN();
  await settingsN();
  await pN.click("#accountOut"); await pN.waitForTimeout(900);
  check("native: sign-out clears the native session", !(await sessN()));
  await settingsN();
  await pN.click("#accountOpen"); await pN.waitForSelector("#authSheet:not([hidden])");
  await pN.click("#appleBtn");
  await pN.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem("pace-auth-v1") || "null"); } catch (e) { return false; } }, null, { timeout: 9000 }).catch(() => {});
  const sessA = await sessN();
  const callA = mock.idpCalls.slice(idpBefore).find((c) => c.providerId === "apple.com");
  check("native: Apple door — a session lands from the plugin's credential", !!(sessA && sessA.uid) && !!callA && callA.idToken === "tok-apple-1");
  check("native: the Apple raw nonce crossed VERBATIM (never re-hashed — the classic trap)", !!callA && callA.nonce === "raw-nonce-42");
  await ctxN.close();
}

/* ---------- 12. no-Ilse sweep over the shipped app files ---------- */
{
  const fs = await import("node:fs");
  const shipped = ["index.html", "app.js", "logic.js", "calendar-import.js", "firebase.js", "styles.css", "service-worker.js", "manifest.webmanifest"];
  const hits = shipped.filter((f) => /ilse/i.test(fs.readFileSync(new URL("../" + f, import.meta.url), "utf8")));
  check("no personal references anywhere in the shipped app files", hits.length === 0);
}

await b.close(); server.close(); mock.close();
console.log("RESULT pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
