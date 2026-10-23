// Pace — GO-LIVE WIRING AUDIT, CLIENT-SHAPE leg (Security's ask).
// Meal Prep's RED: proofs used hand-shaped REST writes while the
// client's own emitted bytes had never landed under the rules.
// This leg drives the SHIPPED firebase.js itself (its encoder, its
// REST) through the exact call sequence app.js performs — sign-up,
// reconcile (aggSignups + spine), state write, daily touch,
// activation, import shard — capturing the client's exact emitted
// request bodies at the fetch seam, and asserting the stored wire
// types from the server's own response documents. The aggregate
// shards are WRITE-BLIND for the user by rules design (owner-read
// only) — that fence is asserted, not fought. Sweeps via the
// client's own delete calls; census read-back closes.
import { readFileSync } from "node:fs";
let pass = 0, fail = 0;
const check = (n, ok, extra) => { console.log((ok ? "PASS " : "FAIL ") + n + (extra ? "  [" + extra + "]" : "")); ok ? pass++ : fail++; };
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.window = globalThis;
// Fetch seam: record every Firestore request body + raw response.
const wire = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  const res = await realFetch(url, opts);
  if (String(url).includes("firestore.googleapis.com") && opts.body) {
    let respJson = null; try { respJson = await res.clone().json(); } catch (e) {}
    wire.push({ url: String(url), body: JSON.parse(opts.body), status: res.status, resp: respJson });
  }
  return res;
};
eval(readFileSync(new URL("../firebase-config.js", import.meta.url), "utf8"));
eval(readFileSync(new URL("../firebase.js", import.meta.url), "utf8"));
const FB = globalThis.PaceFB;
check("the shipped client loads and is configured for production", !!FB && FB.configured === true);
const cfg = globalThis.PACE_FB_CONFIG;
const rnd = Math.random().toString(36).slice(2, 10);
const email = `pace-shape-${rnd}@example.com`, pw = "shape-" + rnd + "!x";
const sess = await FB.emailSignUp(email, pw);
const uid = sess.uid;
check("client sign-up adopts a session", !!uid, uid);
const now = new Date().toISOString();
const bornAt = new Date(); // v2.3: createdAt crosses the wire as a true timestamp, exactly as the shipped client sends it (app.js ensureSpine)
const spine = { createdAt: bornAt, lastActiveAt: now, deletedByUser: false };
await FB.fsSet("aggSignups/" + uid, { createdAt: bornAt });
await FB.fsSet("users/" + uid, spine);
await FB.fsSet("users/" + uid + "/data/state", { stateJson: JSON.stringify({ audit: "client-shape", tasks: [] }), updatedAt: new Date().toISOString() });
await FB.fsSet("users/" + uid, { lastActiveAt: new Date().toISOString() }, ["lastActiveAt"]);
await FB.fsSet("users/" + uid, { activatedAt: now, activationKind: "email" }, ["activatedAt", "activationKind"]);
await FB.fsSet("aggSignups/" + uid, { activatedAt: now, activationKind: "email" }, ["activatedAt", "activationKind"]);
await FB.fsSet("aggImports/" + uid, { events: 3, imports: 1, at: new Date().toISOString() });
const call = (frag, nth) => wire.filter((w) => w.url.includes(frag))[nth ?? 0];
const aggImp = call("aggImports/" + uid);
check("the client's aggImports WRITE lands (server 200) with events as integerValue \"3\"", aggImp?.status === 200 && aggImp.body.fields?.events?.integerValue === "3", JSON.stringify(aggImp?.body?.fields?.events));
check("aggImports.imports emitted as integerValue \"1\" (aggregation-summable)", aggImp?.body?.fields?.imports?.integerValue === "1");
check("aggImports.at emitted as stringValue", typeof aggImp?.body?.fields?.at?.stringValue === "string");
check("the server's stored aggImports document echoes the same wire types", aggImp?.resp?.fields?.events?.integerValue === "3" && aggImp?.resp?.fields?.imports?.integerValue === "1");
const aggSuCreate = call("aggSignups/" + uid, 0);
check("the client's aggSignups create emits {createdAt: timestampValue} and lands (v2.3)", aggSuCreate?.status === 200 && typeof aggSuCreate.body.fields?.createdAt?.timestampValue === "string");
const aggSuAct = call("aggSignups/" + uid, 1);
check("the client's aggSignups activation patch lands with both fields as strings", aggSuAct?.status === 200 && typeof aggSuAct.body.fields?.activatedAt?.stringValue === "string" && aggSuAct.body.fields?.activationKind?.stringValue === "email");
const spineCall = call("users/" + uid, 0);
check("the client's spine create emits deletedByUser as booleanValue (not a string)", spineCall?.body?.fields?.deletedByUser?.booleanValue === false);
// Readable docs: verify via the client itself (fsGet decodes the wire):
const spBack = await FB.fsGet("users/" + uid);
check("client read-back of the spine: fields intact, types decoded", spBack?.deletedByUser === false && spBack?.activationKind === "email" && typeof spBack?.createdAt === "string");
const stBack = await FB.fsGet("users/" + uid + "/data/state");
let parsed = null; try { parsed = JSON.parse(stBack?.stateJson || ""); } catch (e) {}
check("client read-back of the state doc: stateJson parses (the state contract)", !!parsed && parsed.audit === "client-shape");
// The shards' read fence, asserted as designed (owner-read only):
const tok = JSON.parse(store.get("pace-auth-v1")).idToken;
const shardRead = await realFetch(`https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/aggImports/${uid}`, { headers: { Authorization: "Bearer " + tok } });
check("the shard is WRITE-BLIND for its own user (user read = 403, owner-read only by design)", shardRead.status === 403);
// The client's own §6 sweep, app order, then census:
await FB.fsDelete("users/" + uid + "/data/state");
await FB.fsDelete("users/" + uid);
await FB.fsDelete("aggSignups/" + uid);
await FB.fsDelete("aggImports/" + uid);
await FB.fsDelete("subscriptions/" + uid);
await FB.deleteAccount();
const relog = await realFetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${cfg.apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: pw, returnSecureToken: true }) });
check("sweep census: the client-deleted account refuses sign-in", relog.status === 400);
console.log("RESULT pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
