import { strict as assert } from "node:assert";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Audio = require("../audio-notes.js");
let pass = 0;
const checks = [];
function check(name, fn) { checks.push({ name, fn }); }
class FakeStream {
  constructor() { this.stopped = false; }
  getTracks() { return [{ stop: () => { this.stopped = true; } }]; }
}
class FakeRecorder {
  static isTypeSupported(type) { return type === "audio/webm;codecs=opus"; }
  constructor(stream, options) { this.stream = stream; this.mimeType = options && options.mimeType || "audio/webm"; this.state = "inactive"; }
  start() { this.state = "recording"; }
  stop() { this.state = "inactive"; this.ondataavailable({ data: new Blob(["voice note"], { type: this.mimeType }) }); this.onstop(); }
}

check("prefers a browser-supported audio format", () => assert.equal(Audio.chooseMime(FakeRecorder), "audio/webm;codecs=opus"));
check("sets a short recording limit", () => assert.equal(Audio.MAX_RECORDING_MS, 45000));
check("offline precache includes the export and audio modules", () => {
  const sw = require("node:fs").readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");
  assert.match(sw, /"calendar-export\.js"/); assert.match(sw, /"audio-notes\.js"/);
});
check("requests the microphone only when recording starts", async () => {
  let requests = 0; const stream = new FakeStream();
  const session = Audio.start({ navigator: { mediaDevices: { getUserMedia: async () => { requests++; return stream; } } }, MediaRecorder: FakeRecorder });
  assert.equal(requests, 0); await session.ready; assert.equal(requests, 1); session.stop();
  const result = await session.done; assert.equal(result.blob.size, 10); assert.equal(stream.stopped, true);
});
check("permission errors are returned, not hidden", async () => {
  const session = Audio.start({ navigator: { mediaDevices: { getUserMedia: async () => { throw new Error("denied"); } } }, MediaRecorder: FakeRecorder });
  await assert.rejects(session.ready, /denied/); await assert.rejects(session.done, /denied/);
});
check("refuses recording when MediaRecorder is missing", () => assert.throws(() => Audio.start({ navigator: { mediaDevices: { getUserMedia: async () => new FakeStream() } }, MediaRecorder: null }), /recording-unavailable/));
check("fits a small note into the user's state", () => {
  const state = { tasks: [{ id: "a", title: "Task" }] };
  assert.equal(Audio.fitsInState(state, "a", { dataUrl: "data:audio/webm;base64,AA==" }), true);
  assert.equal(state.tasks[0].audioNote, undefined);
});
check("rejects audio when the Firestore document would exceed its safe size", () => {
  const state = { tasks: [{ id: "a", title: "Task" }] };
  assert.equal(Audio.fitsInState(state, "a", { dataUrl: "x".repeat(100) }, 80), false);
});
check("converts a saved blob to an audio data URL", async () => {
  class Reader { readAsDataURL() { this.result = "data:audio/webm;base64,dm9pY2U="; this.onload(); } }
  assert.equal(await Audio.toDataUrl(new Blob(["voice"]), Reader), "data:audio/webm;base64,dm9pY2U=");
});
check("measures UTF-8 bytes rather than characters", () => {
  const state = { tasks: [{ id: "a", title: "😀" }] };
  const note = { dataUrl: "" };
  const projected = JSON.stringify({ tasks: [{ id: "a", title: "😀", audioNote: note }] });
  assert.ok(new TextEncoder().encode(projected).length > projected.length);
  assert.equal(Audio.fitsInState(state, "a", note, projected.length), false);
});
let fail = 0;
for (const item of checks) {
  try { await item.fn(); console.log("PASS " + item.name); pass++; }
  catch (error) { console.log("FAIL " + item.name + ": " + error.message); fail++; }
}
console.log("RESULT pass=" + pass + " fail=" + fail);
if (fail) process.exit(1);
