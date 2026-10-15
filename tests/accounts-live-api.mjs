// Pace accounts battery — LIVE API legs (Security P4 core):
// the TU story at the REST level against the REAL test twin
// (pace-test-c00fa) with the shipped rules v2.1 published —
// using the app's exact call shapes and payloads. The browser
// journeys ride the same twin through the managed browser on
// the scratch host; these legs are the rules' own proof.
const KEY = "AIzaSyDtzBATSYj-pbQiBipcj4rZ6G6lx66TRhg";
const PROJ = "pace-test-c00fa";
const IDP = "https://identitytoolkit.googleapis.com/v1/accounts:";
const FS = "https://firestore.googleapis.com/v1/projects/" + PROJ + "/databases/(default)/documents/";
let pass = 0, fail = 0;
const check = (n, ok) => { console.log((ok ? "PASS " : "FAIL ") + n); ok ? pass++ : fail++; };
const stamp = Date.now().toString(36);
async function signUp(email, pw) {
  const r = await fetch(IDP + "signUp?key=" + KEY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: pw, returnSecureToken: true }) });
  const j = await r.json(); if (!r.ok) throw new Error("signUp " + email + ": " + JSON.stringify(j.error || j).slice(0, 120));
  return { uid: j.localId, token: j.idToken };
}
async function signIn(email, pw) {
  const r = await fetch(IDP + "signInWithPassword?key=" + KEY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: pw, returnSecureToken: true }) });
  const j = await r.json(); if (!r.ok) throw new Error("signIn " + email);
  return { uid: j.localId, token: j.idToken };
}
async function signInAnon() {
  const r = await fetch(IDP + "signUp?key=" + KEY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ returnSecureToken: true }) });
  const j = await r.json(); return { uid: j.localId, token: j.idToken };
}
const enc = (v) => typeof v === "string" ? { stringValue: v } : typeof v === "boolean" ? { booleanValue: v } : { integerValue: String(v) };
const fields = (o) => { const f = {}; for (const k of Object.keys(o)) f[k] = enc(o[k]); return { fields: f }; };
async function fsWrite(path, obj, token, mask) {
  const q = mask ? "?" + mask.map((f) => "updateMask.fieldPaths=" + encodeURIComponent(f)).join("&") : "";
  const r = await fetch(FS + path + q, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify(fields(obj)) });
  return r.status;
}
async function fsRead(path, token) {
  const r = await fetch(FS + path, { headers: token ? { Authorization: "Bearer " + token } : {} });
  return r.status;
}
async function fsDelete(path, token) {
  const r = await fetch(FS + path, { method: "DELETE", headers: { Authorization: "Bearer " + token } });
  return r.status;
}
const now = new Date().toISOString();
const A = await signUp("sec-pace-a+" + stamp + "@example.com", "password-a1");
check("TU-A signs up on the twin", !!A.uid);
// The app's exact first writes: aggSignups shard, then the spine.
check("aggSignups CREATE with the fence fields only → 200", (await fsWrite("aggSignups/" + A.uid, { createdAt: now }, A.token)) === 200);
check("spine CREATE (light fields, NO plan) → 200", (await fsWrite("users/" + A.uid, { createdAt: now, lastActiveAt: now, deletedByUser: false }, A.token)) === 200);
check("state CREATE under data/state → 200", (await fsWrite("users/" + A.uid + "/data/state", { stateJson: "{\"tasks\":[1]}", updatedAt: now }, A.token)) === 200);
check("a plan-shaped key on the spine is REFUSED by the fence (403)", (await fsWrite("users/" + A.uid, { plan: "top" }, A.token, ["plan"])) === 403);
check("activation stamp update → 200", (await fsWrite("users/" + A.uid, { activatedAt: now, activationKind: "event" }, A.token, ["activatedAt", "activationKind"])) === 200);
check("activatedAt is WRITE-ONCE in the rules (second stamp → 403)", (await fsWrite("users/" + A.uid, { activatedAt: new Date(Date.now() + 60000).toISOString() }, A.token, ["activatedAt"])) === 403);
check("shard activation update → 200", (await fsWrite("aggSignups/" + A.uid, { activatedAt: now, activationKind: "event" }, A.token, ["activatedAt", "activationKind"])) === 200);
check("aggImports shard write → 200", (await fsWrite("aggImports/" + A.uid, { events: 12, imports: 1, at: now }, A.token)) === 200);
check("an out-of-fence shard field is refused (403)", (await fsWrite("aggImports/" + A.uid, { email: "a@x" }, A.token, ["email"])) === 403);
const B = await signUp("sec-pace-b+" + stamp + "@example.com", "password-b1");
check("TU-B signs up on the twin", !!B.uid && B.uid !== A.uid);
await fsWrite("aggSignups/" + B.uid, { createdAt: now }, B.token); // B's app writes its shard at sign-up, like A's did
check("B → A's state: 403", (await fsRead("users/" + A.uid + "/data/state", B.token)) === 403);
check("B → A's spine: 403", (await fsRead("users/" + A.uid, B.token)) === 403);
check("B → A's aggSignups shard: 403 (owner space)", (await fsRead("aggSignups/" + A.uid, B.token)) === 403);
check("A → own aggSignups shard READ: 403 too (write-only for users)", (await fsRead("aggSignups/" + A.uid, A.token)) === 403);
check("B → _owner/config: 403", (await fsRead("_owner/config", B.token)) === 403);
check("B → _comp/{A}: 403", (await fsRead("_comp/" + A.uid, B.token)) === 403);
check("signed-out → A's state: 401/403", [401, 403].includes(await fsRead("users/" + A.uid + "/data/state", null)));
const AN = await signInAnon();
check("anonymous session mints (provider on)", !!AN.uid);
check("anon → spine write REFUSED by the provider fence (403)", (await fsWrite("users/" + AN.uid, { createdAt: now }, AN.token)) === 403);
check("anon → aggSignups write REFUSED (403)", (await fsWrite("aggSignups/" + AN.uid, { createdAt: now }, AN.token)) === 403);
check("B deleting A's shard is still denied (403)", (await fsDelete("aggSignups/" + A.uid, B.token)) === 403);
// Deletion sweep (the app's v2.2 order: state, spine, shards,
// then the Auth user — erasure takes the shard).
check("A deletes own state → 200", (await fsDelete("users/" + A.uid + "/data/state", A.token)) === 200);
check("A deletes own spine → 200", (await fsDelete("users/" + A.uid, A.token)) === 200);
check("A deletes own aggSignups shard → 200 (v2.2 carve-out)", (await fsDelete("aggSignups/" + A.uid, A.token)) === 200);
check("A deletes own aggImports shard → 200 (v2.2 carve-out)", (await fsDelete("aggImports/" + A.uid, A.token)) === 200);
const ownSign = await signIn("ceo-owner@twin.test", "owner-pass-1");
const listR = await fetch(FS + "aggSignups?pageSize=200", { headers: { Authorization: "Bearer " + ownSign.token } });
const listJ = await listR.json();
const remaining = (listJ.documents || []).map((d) => d.name.split("/").pop());
check("owner's shard list no longer holds A (counts = accounts that exist)", !remaining.includes(A.uid) && remaining.includes(B.uid));
const del = await fetch(IDP + "delete?key=" + KEY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: A.token }) });
check("A deletes own Auth user → 200", del.status === 200);
const relog = await fetch(IDP + "signInWithPassword?key=" + KEY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "sec-pace-a+" + stamp + "@example.com", password: "password-a1", returnSecureToken: true }) });
check("deleted A can no longer sign in (400)", relog.status === 400);
console.log("IDENTITIES B stands on the twin: sec-pace-b+" + stamp + "@example.com uid=" + B.uid);
console.log("RESULT pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
