// Pace — the entitlement seat proof (production, live rules).
// HQ's standing test for subscriptions/{uid}: the record sits
// OUTSIDE every client-writable path while the client can read
// its own. Two purpose-created testers, swept at the end.
//   node tests/audit-subscriptions-live.mjs
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
const sv = (v) => typeof v === "number" ? { integerValue: String(v) } : typeof v === "boolean" ? { booleanValue: v } : { stringValue: String(v) };
const fields = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, sv(v)]));
const setDoc = (path, token, o, mask) => api(`${FS}/${path}${mask ? "?updateMask.fieldPaths=" + mask.join("&updateMask.fieldPaths=") : ""}`, token, { fields: fields(o) }, "PATCH");
const getDoc = (path, token) => api(`${FS}/${path}`, token);
const delDoc = (path, token) => api(`${FS}/${path}`, token, null, "DELETE");
async function signUp(tag) {
  const r = await api(`${AUTH}/accounts:signUp?key=${KEY}`, null, { email: `pace-subs-${tag}-${rnd}@example.com`, password: "subs-" + rnd + "-" + tag + "!", returnSecureToken: true });
  if (!r.j.idToken) throw new Error("signUp failed for " + tag + ": " + JSON.stringify(r.j).slice(0, 160));
  return { token: r.j.idToken, uid: r.j.localId };
}
const A = await signUp("a"), B = await signUp("b");
console.log("testers created: A=" + A.uid + " B=" + B.uid);
const rec = { entitlement: "plus", status: "active", product: "pace_plus_monthly", period_ends_at: "2030-01-01T00:00:00.000Z" };
const own = await getDoc(`subscriptions/${A.uid}`, A.token);
check("ALLOW get own record (rules permit; 404 = no record yet, 200 = present)", own.status === 200 || own.status === 404, "status " + own.status);
check("DENY create own record (full §3 shape)", (await setDoc(`subscriptions/${A.uid}`, A.token, rec)).status === 403);
check("DENY patch own record (updateMask)", (await setDoc(`subscriptions/${A.uid}`, A.token, { status: "active" }, ["status"])).status === 403);
check("DENY delete own record", (await delDoc(`subscriptions/${A.uid}`, A.token)).status === 403);
check("DENY get another user's record", (await getDoc(`subscriptions/${A.uid}`, B.token)).status === 403);
check("DENY write another user's record", (await setDoc(`subscriptions/${A.uid}`, B.token, rec)).status === 403);
check("DENY unauthenticated get", (await getDoc(`subscriptions/${A.uid}`, null)).status !== 200);
for (const U of [A, B]) await api(`${AUTH}/accounts:delete?key=${KEY}`, null, { idToken: U.token });
const relog = await api(`${AUTH}/accounts:signInWithPassword?key=${KEY}`, null, { email: `pace-subs-a-${rnd}@example.com`, password: "subs-" + rnd + "-a!", returnSecureToken: true });
check("SWEEP census: tester Auth users deleted (sign-in refused)", relog.status === 400, relog.j?.error?.message || "");
console.log("RESULT pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
