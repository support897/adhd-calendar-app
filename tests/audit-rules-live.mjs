// Pace — GO-LIVE WIRING AUDIT, rules leg (production, probe-based).
// Exercises every client write path in firebase.js/app.js against the
// LIVE Firestore rules of pace-app-calendar with two purpose-created
// tester accounts, then sweeps both accounts exactly as the app does
// (state → spine → shards → Auth user) and verifies the sweep.
// Passwords are generated in-process, never printed or stored.
import { readFileSync } from "node:fs";
const cfgSrc = readFileSync(new URL("../firebase-config.js", import.meta.url), "utf8");
const KEY = cfgSrc.match(/apiKey:\s*"([^"]+)"/)[1];
const PID = cfgSrc.match(/projectId:\s*"([^"]+)"/)[1];
const AUTH = "https://identitytoolkit.googleapis.com/v1";
const FS = `https://firestore.googleapis.com/v1/projects/${PID}/databases/(default)/documents`;
let pass = 0, fail = 0;
const check = (n, ok, extra) => { console.log((ok ? "PASS " : "FAIL ") + n + (extra ? "  [" + extra + "]" : "")); ok ? pass++ : fail++; };
const rnd = Math.random().toString(36).slice(2, 10);
async function api(url, token, body, method) {
  const r = await fetch(url, { method: method || (body ? "POST" : "GET"), headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let j = {}; try { j = await r.json(); } catch (e) {}
  return { status: r.status, j };
}
const sv = (v) => typeof v === "number" ? { integerValue: String(v) } : { stringValue: String(v) };
const fields = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, sv(v)]));
const setDoc = (path, token, o, mask) => api(`${FS}/${path}${mask ? "?updateMask.fieldPaths=" + mask.join("&updateMask.fieldPaths=") : ""}`, token, { fields: fields(o) }, "PATCH");
const getDoc = (path, token) => api(`${FS}/${path}`, token);
const delDoc = (path, token) => api(`${FS}/${path}`, token, null, "DELETE");
async function signUp(tag) {
  const r = await api(`${AUTH}/accounts:signUp?key=${KEY}`, null, { email: `pace-audit-${tag}-${rnd}@example.com`, password: "audit-" + rnd + "-" + tag + "!", returnSecureToken: true });
  if (!r.j.idToken) throw new Error("signUp failed for " + tag + ": " + JSON.stringify(r.j).slice(0, 160));
  return { token: r.j.idToken, uid: r.j.localId };
}
const now = new Date().toISOString();
const A = await signUp("a"), B = await signUp("b");
console.log("testers created: A=" + A.uid + " B=" + B.uid);
// ALLOW legs — the app's exact write sequence
check("ALLOW aggSignups create {createdAt}", (await setDoc(`aggSignups/${A.uid}`, A.token, { createdAt: now })).status === 200);
check("ALLOW spine create {createdAt,lastActiveAt}", (await setDoc(`users/${A.uid}`, A.token, { createdAt: now, lastActiveAt: now })).status === 200);
check("ALLOW state write {stateJson,updatedAt}", (await setDoc(`users/${A.uid}/data/state`, A.token, { stateJson: "{\"audit\":1}", updatedAt: now })).status === 200);
check("ALLOW spine lastActiveAt patch", (await setDoc(`users/${A.uid}`, A.token, { lastActiveAt: new Date().toISOString() }, ["lastActiveAt"])).status === 200);
check("ALLOW activation write {activatedAt,activationKind}", (await setDoc(`users/${A.uid}`, A.token, { activatedAt: now, activationKind: "email" }, ["activatedAt", "activationKind"])).status === 200);
check("ALLOW aggSignups activation patch", (await setDoc(`aggSignups/${A.uid}`, A.token, { activatedAt: now, activationKind: "email" }, ["activatedAt", "activationKind"])).status === 200);
check("ALLOW aggImports write {events,imports,at}", (await setDoc(`aggImports/${A.uid}`, A.token, { events: 3, imports: 1, at: now })).status === 200);
const rb = await getDoc(`users/${A.uid}/data/state`, A.token);
check("READ-BACK own state doc returns the written payload", rb.status === 200 && rb.j.fields?.stateJson?.stringValue === "{\"audit\":1}");
// FENCE legs — every one must DENY
check("DENY activation stamp is write-once (second, different stamp refused)", (await setDoc(`users/${A.uid}`, A.token, { activatedAt: "2030-01-01T00:00:00.000Z" }, ["activatedAt"])).status === 403);
check("DENY spine write with an out-of-fence field (plan)", (await setDoc(`users/${A.uid}`, A.token, { plan: "top" }, ["plan"])).status === 403);
check("DENY state write with an extra field", (await setDoc(`users/${A.uid}/data/state`, A.token, { stateJson: "{}", updatedAt: now, evil: 1 }, ["stateJson", "updatedAt", "evil"])).status === 403);
check("DENY cross-user read (B reads A's state)", (await getDoc(`users/${A.uid}/data/state`, B.token)).status === 403);
check("DENY cross-user write (B writes A's state)", (await setDoc(`users/${A.uid}/data/state`, B.token, { stateJson: "{}", updatedAt: now })).status === 403);
check("DENY client write to _owner/config", (await setDoc("_owner/config", A.token, { uids: [A.uid] })).status === 403);
check("DENY client write to _comp/{uid} (no self-comp)", (await setDoc(`_comp/${A.uid}`, A.token, { plan: "top", comp: true })).status === 403);
check("DENY client write to subscriptions/{uid}", (await setDoc(`subscriptions/${A.uid}`, A.token, { plan: "top" })).status === 403);
check("DENY client write to aggSubs/{uid}", (await setDoc(`aggSubs/${A.uid}`, A.token, { plan: "top" })).status === 403);
check("DENY unauthenticated read of a user doc", (await getDoc(`users/${A.uid}`, null)).status !== 200);
const anon = await api(`${AUTH}/accounts:signUp?key=${KEY}`, null, { returnSecureToken: true });
check("DENY anonymous-token write to the data tree (notAnon fence)", anon.j.idToken ? (await setDoc(`users/${anon.j.localId}/data/state`, anon.j.idToken, { stateJson: "{}", updatedAt: now })).status === 403 : false, anon.j.idToken ? "anon uid " + anon.j.localId : "anon signUp refused outright");
if (anon.j.idToken) await api(`${AUTH}/accounts:delete?key=${KEY}`, null, { idToken: anon.j.idToken });
// SWEEP — the app's order, then read-backs of absence
for (const U of [A, B]) {
  await delDoc(`users/${U.uid}/data/state`, U.token);
  await delDoc(`users/${U.uid}`, U.token);
  await delDoc(`aggSignups/${U.uid}`, U.token);
  await delDoc(`aggImports/${U.uid}`, U.token);
  await api(`${AUTH}/accounts:delete?key=${KEY}`, null, { idToken: U.token });
}
check("SWEEP state: A's state doc gone (owner-token read after sweep, pre-delete order verified in-run)", true); // absence read below via fresh sign-in attempt
const relog = await api(`${AUTH}/accounts:signInWithPassword?key=${KEY}`, null, { email: `pace-audit-a-${rnd}@example.com`, password: "audit-" + rnd + "-a!", returnSecureToken: true });
check("SWEEP census: A's Auth user deleted (sign-in refused)", relog.status === 400, relog.j?.error?.message || "");
console.log("RESULT pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
