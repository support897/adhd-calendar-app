// Sign-in checks: native origin + stay-signed-in rules. Runs firebase.js in a stub window.
import fs from "fs"; import vm from "vm";
let pass = 0, fail = 0; const check = (n, c) => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + n); };
const src = fs.readFileSync(new URL("../firebase.js", import.meta.url), "utf8");
function boot(origin, stored, respond) {
  const store = new Map(stored ? [["pace-auth-v1", JSON.stringify(stored)]] : []);
  const calls = [];
  const win = { PACE_FB_CONFIG: { apiKey: "AIza-test-key-123", projectId: "pace-app-calendar", authDomain: "pace-app-calendar.firebaseapp.com" } };
  const ctx = { window: win, location: { origin }, localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) },
    fetch: async (url, o) => { calls.push({ url, body: o && o.body }); return respond(url, o); }, AbortController, setTimeout, clearTimeout, Date, JSON, encodeURIComponent, Promise, Object, Array, String, parseInt, Error, TypeError, console };
  ctx.self = ctx; vm.createContext(ctx); vm.runInContext(src, ctx);
  return { api: win.PaceFB, calls, store };
}
const okJson = j => ({ ok: true, status: 200, json: async () => j });
const bad = (status, msg) => ({ ok: false, status, json: async () => ({ error: { message: msg } }) });
const idp = { idToken: "i", refreshToken: "r", expiresIn: "3600", localId: "u1", email: "a@b.co" };
{ const t = boot("capacitor://localhost", null, () => okJson(idp)); await t.api.googleSignIn("tok");
  const b = JSON.parse(t.calls[0].body); check("native Google sign-in sends an https requestUri", b.requestUri === "https://pace-app-calendar.firebaseapp.com"); }
{ const t = boot("capacitor://localhost", null, () => okJson(idp)); await t.api.appleSignIn("tok", null, "nonce1");
  const b = JSON.parse(t.calls[0].body); check("native Apple sign-in sends an https requestUri", b.requestUri.startsWith("https://")); check("Apple nonce passes through raw", /nonce=nonce1/.test(b.postBody)); }
{ const t = boot("https://app.example.com", null, () => okJson(idp)); await t.api.googleSignIn("tok");
  check("web origin is kept", JSON.parse(t.calls[0].body).requestUri === "https://app.example.com"); }
const old = { uid: "u1", email: "a@b.co", idToken: "x", refreshToken: "r", expiresAt: 1 };
{ const t = boot("capacitor://localhost", old, () => bad(503, "BACKEND_ERROR")); let err; try { await t.api.fsGet("users/u1"); } catch (e) { err = e; }
  check("a server hiccup keeps the person signed in", !!t.api.session() && !!t.store.get("pace-auth-v1") && !!err); }
{ const t = boot("capacitor://localhost", old, () => bad(429, "TOO_MANY_ATTEMPTS_TRY_LATER")); try { await t.api.fsGet("users/u1"); } catch (e) {}
  check("a rate limit keeps the person signed in", !!t.api.session()); }
{ const t = boot("capacitor://localhost", old, () => bad(400, "INVALID_REFRESH_TOKEN")); try { await t.api.fsGet("users/u1"); } catch (e) {}
  check("a revoked login does sign out", !t.api.session()); }
{ const t = boot("capacitor://localhost", old, () => okJson({ id_token: "n", refresh_token: "r2", expires_in: "3600" }));
  try { await t.api.fsGet("users/u1"); } catch (e) {} check("refresh stores the new token and stays signed in", t.api.session() && t.api.session().refreshToken === "r2"); }
console.log(`RESULT pass=${pass} fail=${fail}`); process.exit(fail ? 1 : 0);
