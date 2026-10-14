// Pace voice engine battery: every dictation path proven with scripted
// recognisers — web speech (final + interim + each error kind), the
// native store-app plugin (granted / denied / silence), and the no-
// voice-at-all fallback. Live cloud transcription cannot happen in a
// sandbox; what is proven here is the app's own hearing path end to end.
import { chromium } from "/home/hatch/node_modules/playwright-core/index.mjs";
const URL = "http://localhost:9119/";
let pass = 0, fail = 0;
const check = (n, ok) => { console.log((ok ? "PASS " : "FAIL ") + n); ok ? pass++ : fail++; };
const browser = await chromium.launch({ executablePath: "/home/hatch/.cache/ms-playwright/chromium-1187/chrome-linux/chrome", args: ["--no-sandbox"] });

const seedSrc = `
  localStorage.setItem("calmcal-v1", JSON.stringify({ settings: { guide: "done", onboarded: true },
    tasks: [], todos: [], habits: [], feelings: {}, checks: {}, habitLog: {}, imports: [], samplesLoaded: false }));
`;
async function freshPage(setupSrc) {
  const p = await browser.newPage();
  await p.addInitScript(seedSrc);
  if (setupSrc) await p.addInitScript(setupSrc);
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  await p.locator("#welcome .primary-btn").click({ timeout: 800 }).catch(() => {});
  for (let i = 0; i < 9; i++) { const g = await p.locator("#guideSheet:not([hidden])").count(); if (!g) break;
    await p.locator("#guideSkip").click({ timeout: 500 }).catch(() => {});
    await p.locator("#guideNext").click({ timeout: 500 }).catch(() => {});
    await p.waitForTimeout(200); }
  await p.locator("#impClose").click({ timeout: 600 }).catch(() => {});
  await p.evaluate(() => { document.querySelectorAll(".side-item").forEach(b => { if (b.dataset.panel === "capture") b.click(); }); });
  return p;
}
const fakeSR = (script) => `
  window.SpeechRecognition = class {
    start() { const evs = ${JSON.stringify(script)}; let i = 0;
      const step = () => { if (i >= evs.length) { this.onend && this.onend(); return; }
        const e = evs[i++]; if (e.type === "interim") this.onresult({ resultIndex: 0, results: [{ 0: { transcript: e.text }, isFinal: false, length: 1 }] });
        else if (e.type === "final") this.onresult({ resultIndex: 0, results: [{ 0: { transcript: e.text }, isFinal: true, length: 1 }] });
        else if (e.type === "error") this.onerror({ error: e.code });
        setTimeout(step, 30); }; setTimeout(step, 30); }
    stop() { this.onend && this.onend(); }
  };`;

// 1. Nothing offered anywhere.
{
  const p = await freshPage(`Object.defineProperty(window, "SpeechRecognition", { value: undefined, configurable: true }); Object.defineProperty(window, "webkitSpeechRecognition", { value: undefined, configurable: true });`);
  await p.click("#voiceBtn");
  const m = await p.textContent("#captureMsg");
  check("no voice offered: calm typed fallback named", /not offered/.test(m));
  await p.close();
}
// 2. Web speech: interim preview, then final lands in the box.
{
  const p = await freshPage(fakeSR([{ type: "interim", text: "ring the den" }, { type: "final", text: "ring the dentist tomorrow" }]));
  await p.click("#voiceBtn");
  await p.waitForTimeout(300);
  const v = await p.inputValue("#dumpText");
  check("web final words land in the brain-dump box", v.includes("ring the dentist tomorrow"));
  const m = await p.textContent("#captureMsg");
  check("web path confirms receipt in plain words", /Got it/.test(m));
  await p.close();
}
// 2b. After a final lands, later interim words must not stomp the
// "check the words" nudge (QA v13 audit note 3).
{
  const p = await freshPage(fakeSR([{ type: "final", text: "ring the dentist tomorrow" }, { type: "interim", text: "and also water the" }]));
  await p.click("#voiceBtn"); await p.waitForTimeout(500);
  check("the check-the-words nudge survives later interim words", /Check the words/.test(await p.textContent("#captureMsg")));
  await p.close();
}
// 3. Web error codes speak their real cause.
{
  const p = await freshPage(fakeSR([{ type: "error", code: "not-allowed" }]));
  await p.click("#voiceBtn"); await p.waitForTimeout(200);
  check("blocked mic says so (not a mystery failure)", /microphone is blocked/.test(await p.textContent("#captureMsg")));
  await p.close();
  const p2 = await freshPage(fakeSR([{ type: "error", code: "no-speech" }]));
  await p2.click("#voiceBtn"); await p2.waitForTimeout(200);
  check("silence says nothing was heard", /did not hear anything/.test(await p2.textContent("#captureMsg")));
  await p2.close();
}
// 4. Native plugin path (the store app): granted + words land.
{
  const native = `
    window.Capacitor = { isNativePlatform: () => true, Plugins: { SpeechRecognition: {
      requestPermissions: async () => ({ speechRecognition: "granted" }),
      addListener: async () => ({ remove: () => {} }),
      start: async () => ({ matches: ["book the school photos"] }), stop: async () => {} } } };`;
  const p = await freshPage(native);
  await p.click("#voiceBtn"); await p.waitForTimeout(400);
  check("native recogniser words land in the box", (await p.inputValue("#dumpText")).includes("book the school photos"));
  await p.close();
  const denied = `
    window.Capacitor = { isNativePlatform: () => true, Plugins: { SpeechRecognition: {
      requestPermissions: async () => ({ speechRecognition: "denied" }), start: async () => ({}), stop: async () => {} } } };`;
  const p2 = await freshPage(denied);
  await p2.click("#voiceBtn"); await p2.waitForTimeout(300);
  check("native permission denied says the mic is blocked", /microphone is blocked/.test(await p2.textContent("#captureMsg")));
  await p2.close();
}
// 5. To-do voice: a spoken phrase becomes a to-do.
{
  const p = await freshPage(fakeSR([{ type: "final", text: "water the plants" }]));
  await p.evaluate(() => { document.querySelectorAll(".side-item").forEach(b => { if (b.dataset.panel === "todo") b.click(); }); });
  await p.click("#todoVoiceBtn"); await p.waitForTimeout(350);
  const todos = await p.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1")).todos.map(t => t.text));
  check("spoken to-do is added", todos.includes("water the plants"));
  await p.close();
}
await browser.close();
console.log("RESULT pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
