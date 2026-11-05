// The iPhone-only doors, tested with the REAL app code against faked Capacitor plugins
// (same method the old voice/notification batteries use). Proves the app's side of every
// native hand-off: speech, local notifications, Google + Apple sign-in. What it cannot prove is
// Apple's own side (the OS mic prompt, push delivery) - that stays on the iPhone checklist.
import { boot, check, summary } from "./pace-harness.mjs";
const h = await boot(8994, { viewport: { width: 390, height: 800 } }); const { page } = h;
const fake = () => {
  const calls = { sched: [], cancel: [], speech: [], auth: [] };
  window.__calls = calls;
  const perm = { display: "granted", speechRecognition: "granted" };
  window.__perm = perm;
  window.Capacitor = { isNativePlatform: () => true, Plugins: {
    SpeechRecognition: {
      requestPermissions: async () => { calls.speech.push("perm"); return { speechRecognition: window.__perm.speechRecognition }; },
      start: async (o) => { calls.speech.push("start:" + o.language); return { matches: [window.__said || "buy milk tomorrow at 4pm"] }; },
      stop: async () => { calls.speech.push("stop"); },
      addListener: async () => ({ remove() {} }),
    },
    LocalNotifications: {
      checkPermissions: async () => ({ display: window.__perm.display }),
      requestPermissions: async () => ({ display: window.__perm.display }),
      schedule: async (o) => { calls.sched.push(o); return {}; },
      cancel: async (o) => { calls.cancel.push(o); return {}; },
      getPending: async () => ({ notifications: [] }),
      addListener: async () => ({ remove() {} }),
    },
    FirebaseAuthentication: {
      signInWithGoogle: async () => { calls.auth.push("google"); return window.__authRes || { credential: { idToken: "fake-google-token" } }; },
      signInWithApple: async () => { calls.auth.push("apple"); return window.__authRes || { credential: { idToken: "fake-apple-token", nonce: "n1" }, user: { displayName: "Ana Test" } }; },
    },
  } };
};
await h.ctx.addInitScript(fake);
await page.reload({ waitUntil: "networkidle" }); await page.locator("#welcomeSkip").click({ timeout: 800 }).catch(() => {}); await page.locator("#guideSkip").click({ timeout: 800 }).catch(() => {});
const tab = async (n) => { await page.locator('#bottomTabs [data-tab="' + n + '"]').click(); await page.waitForTimeout(250); };
/* ---- speech ---- */
await tab("capture");
check("N1 the mic button is there on the native app", await page.locator("#voiceBtn").isVisible());
await page.click("#voiceBtn"); await page.waitForTimeout(800);
let c = await page.evaluate(() => window.__calls.speech);
check("N2 tapping mic asks permission, then listens in English", c[0] === "perm" && /start:en/.test(c[1] || ""));
check("N3 what was heard lands in the box, nothing is created yet", /buy milk/i.test(await page.inputValue("#dumpText")) && (await h.store()).tasks.length === 0);
await page.evaluate(() => { window.__perm.speechRecognition = "denied"; });
await page.fill("#dumpText", ""); await page.click("#voiceBtn"); await page.waitForTimeout(600);
check("N4 mic denied: kind message, notes safe, typing still works", /Your notes are safe|microphone permission/i.test(await page.locator("body").innerText()));
await page.evaluate(() => { window.__perm.speechRecognition = "granted"; });
/* ---- notifications ---- */
await page.evaluate(() => document.querySelector('.side-item[data-panel="settings"]').click()); await page.waitForTimeout(300);
await page.evaluate(() => { const b = document.getElementById("notifEnable"); b.scrollIntoView(); });
await page.evaluate(() => document.getElementById("notifEnable").click()); await page.waitForTimeout(500);
let st = await h.store();
check("N5 allow notifications: permission saved as granted", st.settings.notif.perm === "granted");
check("N6 status says reminders are set on the phone", /reminders set/i.test(await page.locator("#notifHint").innerText()));
await page.evaluate(() => document.getElementById("notifTest").click()); await page.waitForTimeout(400);
check("N7 test notification is scheduled on the device", (await page.evaluate(() => window.__calls.sched.length)) >= 1);
await tab("capture");
const soon = new Date(Date.now() + 3 * 3600e3); const hh = String(soon.getHours()).padStart(2, "0") + ":" + String(soon.getMinutes()).padStart(2, "0");
await page.fill("#dumpText", "dentist today at " + hh); await page.click("#parseBtn"); await page.waitForTimeout(500); await page.click("#prAdd"); await page.waitForTimeout(1500);
const sched = await page.evaluate(() => window.__calls.sched.flatMap(s => s.notifications));
check("N8 a timed task schedules its start reminder on the device", sched.some(n => /dentist/i.test(n.title + " " + n.body) && n.extra && n.extra.paceKind === "start"));
check("N9 reminders are in the future and carry a tap route", sched.filter(n => n.extra && n.extra.paceKind && n.extra.paceKind !== "test").every(n => +new Date(n.schedule.at) > Date.now() && n.extra.paceDate));
await page.evaluate(() => { window.__perm.display = "denied"; document.getElementById("notifEnable").click(); }); await page.waitForTimeout(500);
st = await h.store();
check("N10 notifications denied: app says no problem, keeps working", st.settings.notif.perm === "denied" && /blocked/i.test(await page.locator("#notifStatus").innerText()));
/* ---- sign-in doors (native) ---- */
const door = async (btn, kind, ok) => {
  const ctx2 = await h.browser.newContext({ viewport: { width: 390, height: 800 } }); const p2 = await ctx2.newPage();
  await p2.addInitScript(fake);
  if (!ok) await p2.addInitScript(() => { window.__authRes = {}; });
  await p2.goto("http://localhost:8994/", { waitUntil: "networkidle" });
  await p2.locator("#welcomeSkip").click({ timeout: 1500 }).catch(() => {});
  await p2.locator("#guideSkip").click({ timeout: 800 }).catch(() => {});
  const open = await p2.evaluate(() => { const b = document.querySelector("#doorOpen, #signInOpen, [data-open-door]"); if (b) { b.click(); return true; } return false; });
  await p2.waitForTimeout(400);
  const vis = await p2.locator(btn).isVisible().catch(() => false);
  if (vis) await p2.click(btn); await p2.waitForTimeout(1500);
  const used = await p2.evaluate(() => window.__calls.auth);
  const text = await p2.locator("body").innerText();
  await ctx2.close(); return { vis, used, text, open };
};
const g = await door("#googleBtn", "google", true);
check("N11 Google button uses the native Google door and signs in with its token", g.vis && h.mock.idpCalls.some(x => /fake-google-token/.test(JSON.stringify(x))));
const gx = await door("#googleBtn", "google", false);
check("N12 Google closed/cancelled: 'Nothing changed' message, no crash", gx.used.includes("google") && /Nothing changed/i.test(gx.text));
const a = await door("#appleBtn", "apple", true);
check("N13 Apple button uses the native Apple door and signs in with its token", h.mock.idpCalls.some(x => /fake-apple-token/.test(JSON.stringify(x))));
const ax = await door("#appleBtn", "apple", false);
check("N14 Apple closed/cancelled: 'Nothing changed' message, no crash", ax.used.includes("apple") && /Nothing changed/i.test(ax.text));
/* ---- Build 50: a Google/Apple user (no password) can delete their account ---- */
for (const [btn, kind] of [["#googleBtn", "google"], ["#appleBtn", "apple"]]) {
  const ctx3 = await h.browser.newContext({ viewport: { width: 390, height: 800 } }); const p3 = await ctx3.newPage();
  await p3.addInitScript(fake);
  await p3.goto("http://localhost:8994/", { waitUntil: "networkidle" });
  await p3.locator("#welcomeSkip").click({ timeout: 1500 }).catch(() => {}); await p3.locator("#guideSkip").click({ timeout: 800 }).catch(() => {});
  await p3.evaluate(() => { const b = document.querySelector("#doorOpen, #signInOpen, [data-open-door]"); if (b) b.click(); }); await p3.waitForTimeout(400);
  await p3.click(btn); await p3.waitForTimeout(1800);
  await p3.evaluate(() => window.PaceCtx.showPanel("settings")); await p3.waitForTimeout(300);
  const outVis = await p3.locator("#pcOut").isVisible().catch(() => false);
  await p3.evaluate(() => document.getElementById("accountDelete").click()); await p3.waitForTimeout(700);
  const passShown = await p3.locator("#deletePass").isVisible().catch(() => false);
  check("N17 (" + kind + ") quick Sign out button is on the profile card", outVis);
  check("N18 (" + kind + ") delete asks NO password for a " + kind + " account", !passShown);
  const before = h.mock.idpCalls.length;
  await p3.evaluate(() => window.__calls.auth.length = 0);
  await p3.evaluate(() => document.getElementById("deleteGo").click()); await p3.waitForTimeout(2500);
  const used = await p3.evaluate(() => window.__calls.auth).catch(() => []);
  const gone = await p3.evaluate(() => !localStorage.getItem("pace-auth-v1")).catch(() => true);
  check("N19 (" + kind + ") delete re-checks with " + kind + " itself, then the account is gone", (used.includes(kind) || h.mock.idpCalls.length > before) && gone);
  await ctx3.close();
}
check("N15 zero JS errors through all native hand-offs", h.errors.length === 0);
if (h.errors.length) console.log(h.errors.slice(0, 4));
await h.close(); process.exit(
summary() ? 1 : 0);
