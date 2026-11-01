// Mock Firebase for the accounts battery: Identity Toolkit +
// Firestore REST shapes in-process, with the RULES' SHAPE enforced
// (ownership-by-address; owner counts on the spine only). The live
// test-twin battery (Security P4) proves the real rules text; this
// mock proves the APP's behaviour end to end.
import http from "http";

export function startMock() {
  const users = new Map(); // email -> { uid, email, password }
  const docs = new Map(); // path -> fields object (decoded values)
  const idpCalls = []; // every signInWithIdp postBody, decoded (the native-door legs read this)
  let uidN = 0;
  const ownerUids = [];
  const tok = (uid) => Buffer.from(JSON.stringify({ uid })).toString("base64");
  const uidOf = (req) => {
    const h = req.headers.authorization || "";
    if (!h.startsWith("Bearer ")) return null;
    try { return JSON.parse(Buffer.from(h.slice(7), "base64").toString()).uid || null; } catch { return null; }
  };
  const enc = (v) => {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === "string") return { stringValue: v };
    if (typeof v === "boolean") return { booleanValue: v };
    if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
    const f = {}; for (const k of Object.keys(v)) f[k] = enc(v[k]);
    return { mapValue: { fields: f } };
  };
  const dec = (v) => {
    if (!v || typeof v !== "object") return null;
    if ("stringValue" in v) return v.stringValue;
    if ("booleanValue" in v) return v.booleanValue;
    if ("integerValue" in v) return parseInt(v.integerValue, 10);
    if ("doubleValue" in v) return v.doubleValue;
    if ("timestampValue" in v) return v.timestampValue;
    if ("nullValue" in v) return null;
    if ("arrayValue" in v) return ((v.arrayValue && v.arrayValue.values) || []).map(dec);
    if ("mapValue" in v) { const o = {}; const f = (v.mapValue && v.mapValue.fields) || {}; for (const k of Object.keys(f)) o[k] = dec(f[k]); return o; }
    return null;
  };
  // Rules shape: who may touch a document path?
  const mayRead = (uid, path) => {
    if (!uid) return false;
    const seg = path.split("/");
    if (seg[0] === "users" && seg[1]) {
      if (seg.length === 2) return uid === seg[1]; // spine: the owner holds NO path into user folders (v2)
      return uid === seg[1]; // the data tree: owner-user only, CEO never
    }
    if (seg[0] === "reviews" || seg[0] === "outreach" || seg[0] === "groups") return ownerUids.includes(uid);
    if (seg[0] === "aggSignups" || seg[0] === "aggImports" || seg[0] === "aggSubs") return ownerUids.includes(uid);
    if (seg[0] === "subscriptions") return uid === seg[1];
    // Shared goals (build 39): a signed-in holder of the doc id
    // may read the GOAL doc; a STEP doc reads for members only
    // (v2.6 — membership from the parent doc).
    if (seg[0] === "sharedGoals" && seg[1]) {
      if (seg.length === 4 && seg[2] === "steps") {
        const parent = docs.get("sharedGoals/" + seg[1]);
        return !!parent && !!parent.members && !!parent.members[uid];
      }
      return true;
    }
    return false;
  };
  const mayWrite = (uid, path, incoming) => {
    if (!uid) return false;
    const seg = path.split("/");
    // v2.6 (build 39, Security's F-P39-1 cure ruling): the goal
    // doc carries NO steps (a write carrying the key is denied,
    // the closed key set) and gains stepCount — pinned in the
    // join arm, unpinned in the member arm by design
    // (Addendum 2: display-only, never trusted). Members map
    // fences as v2.5 (R1/R2). STEP docs (…/steps/{sid}) fence
    // per doc: create = member, createdBy == caller, born open,
    // assignee null or a standing member; update = createdBy
    // immutable + the status triple moves only for the STORED
    // assignee with doneBy == caller (owner included) +
    // assignee moves apart (owner any member/pool · grab
    // pooled · return own) + plan fields owner-or-createdBy.
    if (seg[0] === "sharedGoals" && seg[1] && seg[2] === "steps" && seg[3]) {
      const parent = docs.get("sharedGoals/" + seg[1]);
      if (!parent || !parent.members || !parent.members[uid]) return false;
      const isOwner = parent.ownerUid === uid;
      const cur = docs.get(path);
      if (!incoming || typeof incoming !== "object") return false;
      if (!cur) {
        return incoming.createdBy === uid && incoming.status === "todo"
          && (incoming.doneBy === null || incoming.doneBy === undefined)
          && (incoming.doneAt === null || incoming.doneAt === undefined)
          && (incoming.assignee == null || !!parent.members[incoming.assignee]);
      }
      if (incoming.createdBy !== cur.createdBy) return false;
      const tripleSame = incoming.status === cur.status && (incoming.doneBy ?? null) === (cur.doneBy ?? null) && (incoming.doneAt ?? null) === (cur.doneAt ?? null);
      const cure = cur.assignee === uid && ((cur.status === "todo" && incoming.status === "done" && incoming.doneBy === uid && typeof incoming.doneAt === "number")
        || (cur.status === "done" && incoming.status === "todo" && (incoming.doneBy == null) && (incoming.doneAt == null)));
      if (!tripleSame && !cure) return false;
      const assigneeOk = incoming.assignee === cur.assignee
        || (isOwner && (incoming.assignee == null || !!parent.members[incoming.assignee]))
        || (cur.assignee == null && incoming.assignee === uid)
        || (cur.assignee === uid && incoming.assignee == null);
      if (!assigneeOk) return false;
      const planSame = ["title", "date", "time", "durationMin", "minVersion"].every((k) => JSON.stringify(incoming[k] ?? null) === JSON.stringify(cur[k] ?? null));
      return planSame || isOwner || cur.createdBy === uid;
    }
    // v2.5 (build 39, Security ruling R1/R2): sharedGoals —
    // members is a uid-keyed MAP. Create: owner + sole member
    // with a sane own entry. Owner arm: ownerUid + createdAt
    // immutable, everything else open. Member arm: own entry
    // only (+ stepCount unpinned by design), proven by
    // members.remove(caller) equality. Join arm: that same
    // equality + own sane entry + all else (stepCount too)
    // unchanged + the goal is open (closed == false).
    if (seg[0] === "sharedGoals" && seg[1]) {
      const cur = docs.get(path);
      const saneEntry = (e) => !!e && typeof e === "object" && Object.keys(e).every((k) => k === "name" || k === "focus")
        && typeof e.name === "string" && e.name.length <= 100 && typeof e.focus === "string" && e.focus.length <= 200;
      if (!incoming || typeof incoming !== "object") return false;
      if ("steps" in incoming) return false;
      if (!cur) {
        const keys = Object.keys(incoming.members || {});
        return incoming.ownerUid === uid && keys.length === 1 && keys[0] === uid && saneEntry(incoming.members[uid]);
      }
      if (incoming.ownerUid !== cur.ownerUid || incoming.createdAt !== cur.createdAt) return false;
      const curM = cur.members || {}, inM = incoming.members || {};
      const strip = (m) => { const o = {}; for (const k of Object.keys(m)) if (k !== uid) o[k] = m[k]; return JSON.stringify(o); };
      const stripEqual = strip(inM) === strip(curM);
      const restEqual = (except) => { const keys = new Set([...Object.keys(cur), ...Object.keys(incoming)]); for (const k of keys) { if (except.includes(k)) continue; if (JSON.stringify(cur[k]) !== JSON.stringify(incoming[k])) return false; } return true; };
      if (cur.ownerUid === uid) return true;
      if (curM[uid]) {
        if (!stripEqual) return false;
        if (inM[uid] && !saneEntry(inM[uid])) return false;
        return restEqual(["members", "updatedAt", "stepCount"]);
      }
      if (!inM[uid] || !saneEntry(inM[uid])) return false;
      if (cur.closed !== false) return false;
      return stripEqual && restEqual(["members", "updatedAt"]);
    }
    return (seg[0] === "users" && seg[1] === uid) || (seg[0] === "aggSignups" && seg[1] === uid) || (seg[0] === "aggImports" && seg[1] === uid);
  };
  // v2.4: subscriptions/{uid} stays write-sealed for clients, but the
  // owner may DELETE their own record (the deletion-promise fold).
  const mayDelete = (uid, path) => {
    if (!uid) return false;
    const seg = path.split("/");
    // v2.6 (build 39): a STEP doc is deleted by the goal owner
    // or the step's createdBy; the GOAL doc by its owner alone.
    if (seg[0] === "sharedGoals" && seg[1] && seg[2] === "steps" && seg[3]) {
      const parent = docs.get("sharedGoals/" + seg[1]);
      const cur = docs.get(path);
      // C-1 (Security's clearance change): the creator branch
      // binds membership — a departed member keeps no delete.
      return !!parent && !!cur && (parent.ownerUid === uid || (!!parent.members && !!parent.members[uid] && cur.createdBy === uid));
    }
    if (seg[0] === "sharedGoals" && seg[1]) { const cur = docs.get(path); return !!cur && cur.ownerUid === uid; }
    if (mayWrite(uid, path)) return true;
    return seg[0] === "subscriptions" && seg[1] === uid;
  };
  const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const url = new URL(req.url, "http://x");
      const send = (code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
      const jbody = () => { try { return JSON.parse(body || "{}"); } catch { return {}; } };
      // ---- Identity Toolkit ----
      if (url.pathname.startsWith("/v1/accounts:")) {
        const action = url.pathname.split(":")[1];
        const b = jbody();
        if (action === "signUp") {
          if (users.has(b.email)) return send(400, { error: { message: "EMAIL_EXISTS" } });
          const uid = "uid-" + ++uidN;
          users.set(b.email, { uid, email: b.email, password: b.password });
          return send(200, { localId: uid, email: b.email, idToken: tok(uid), refreshToken: "rt-" + uid, expiresIn: "3600" });
        }
        if (action === "signInWithPassword") {
          const u = users.get(b.email);
          if (!u) return send(400, { error: { message: "EMAIL_NOT_FOUND" } });
          if (u.password !== b.password) return send(400, { error: { message: "INVALID_PASSWORD" } });
          return send(200, { localId: u.uid, email: u.email, idToken: tok(u.uid), refreshToken: "rt-" + u.uid, expiresIn: "3600" });
        }
        if (action === "signInWithIdp") {
          const params = new URLSearchParams(b.postBody || "");
          const providerId = params.get("providerId") || "";
          const idTok = params.get("id_token") || "";
          idpCalls.push({ providerId, idToken: idTok, nonce: params.get("nonce"), raw: b.postBody || "" });
          if (!idTok || !/^(google|apple)\.com$/.test(providerId)) return send(400, { error: { message: "INVALID_IDP_RESPONSE" } });
          const key = providerId + ":" + idTok;
          let u = users.get(key);
          if (!u) { const uid = "uid-" + ++uidN; u = { uid, email: "", password: null }; users.set(key, u); }
          return send(200, { localId: u.uid, email: u.email, idToken: tok(u.uid), refreshToken: "rt-" + u.uid, expiresIn: "3600", federatedId: key, providerId });
        }
        if (action === "sendOobCode") return send(200, { email: b.email });
        if (action === "delete") {
          const uid = uidOf({ headers: { authorization: "Bearer " + (b.idToken || "") } });
          for (const [e, u] of users) if (u.uid === uid) users.delete(e);
          return send(200, {});
        }
        return send(400, { error: { message: "OPERATION_NOT_ALLOWED" } });
      }
      if (url.pathname === "/v1/token") {
        const params = new URLSearchParams(body);
        const rt = params.get("refresh_token") || "";
        const uid = rt.replace("rt-", "");
        if (!uid) return send(400, { error: { message: "INVALID_REFRESH_TOKEN" } });
        return send(200, { id_token: tok(uid), refresh_token: rt, expires_in: "3600" });
      }
      // ---- Firestore ----
      const m = url.pathname.match(/^\/v1\/projects\/[^/]+\/databases\/\(default\)\/documents\/(.*)$/);
      if (m) {
        const uid = uidOf(req);
        const path = decodeURIComponent(m[1]);
        if (path === "documents:runAggregationQuery" || url.pathname.endsWith("documents:runAggregationQuery")) { /* handled below */ }
        if (req.method === "GET" && path.split("/").length === 1) {
          // Collection list: owner-only feeds/counters.
          if (!ownerUids.includes(uid)) return send(403, { error: { message: "PERMISSION_DENIED" } });
          const documents = [];
          for (const [p, doc] of docs) if (p.startsWith(path + "/") && p.split("/").length === 2) { const fields = {}; for (const k of Object.keys(doc)) fields[k] = enc(doc[k]); documents.push({ name: "projects/x/databases/(default)/documents/" + p, fields }); }
          return send(200, { documents });
        }
        if (req.method === "GET" && (() => { const s = path.split("/"); return s.length === 3 && s[0] === "sharedGoals" && s[2] === "steps"; })()) {
          // v2.6: listing a goal's steps is members-only.
          const parent = docs.get("sharedGoals/" + path.split("/")[1]);
          if (!uid || !parent || !parent.members || !parent.members[uid]) return send(403, { error: { message: "PERMISSION_DENIED" } });
          const documents = [];
          for (const [p, doc] of docs) if (p.startsWith(path + "/") && p.split("/").length === 4) { const fields = {}; for (const k of Object.keys(doc)) fields[k] = enc(doc[k]); documents.push({ name: "projects/x/databases/(default)/documents/" + p, fields }); }
          return send(200, { documents });
        }
        if (req.method === "GET") {
          if (!mayRead(uid, path)) return send(403, { error: { message: "PERMISSION_DENIED" } });
          const doc = docs.get(path);
          if (!doc) return send(404, { error: { message: "NOT_FOUND" } });
          const fields = {}; for (const k of Object.keys(doc)) fields[k] = enc(doc[k]);
          return send(200, { name: "projects/x/databases/(default)/documents/" + path, fields });
        }
        if (req.method === "PATCH") {
          const b = jbody();
          const incoming = {}; for (const k of Object.keys(b.fields || {})) incoming[k] = dec(b.fields[k]);
          if (!mayWrite(uid, path, incoming)) return send(403, { error: { message: "PERMISSION_DENIED" } });
          const mask = url.searchParams.getAll("updateMask.fieldPaths");
          if (mask.length) { const cur = docs.get(path) || {}; for (const f of mask) if (f in incoming) cur[f] = incoming[f]; docs.set(path, cur); }
          else docs.set(path, incoming);
          const fields = {}; const out = docs.get(path); for (const k of Object.keys(out)) fields[k] = enc(out[k]);
          return send(200, { name: "projects/x/databases/(default)/documents/" + path, fields });
        }
        if (req.method === "DELETE") {
          if (!mayDelete(uid, path)) return send(403, { error: { message: "PERMISSION_DENIED" } });
          docs.delete(path); return send(200, {});
        }
      }
      if (url.pathname.endsWith("documents:runAggregationQuery")) {
        const uid = uidOf(req);
        const b = jbody();
        const q = b.structuredAggregationQuery && b.structuredAggregationQuery.structuredQuery;
        const coll = q && q.from && q.from[0] && q.from[0].collectionId;
        // The CEO counts the spine/money/reviews — owner only.
        if (!ownerUids.includes(uid)) return send(403, { error: { message: "PERMISSION_DENIED" } });
        const filters = [];
        const collect = (w) => { if (!w) return; if (w.fieldFilter) filters.push(w.fieldFilter); if (w.compositeFilter) (w.compositeFilter.filters || []).forEach(collect); };
        collect(q && q.where);
        const matchF = (doc) => filters.every((f) => {
          const want = dec(f.value); const got = doc[f.field.fieldPath];
          switch (f.op) {
            case "EQUAL": return got === want;
            case "GREATER_THAN": return got > want;
            case "GREATER_THAN_OR_EQUAL": return got >= want;
            case "LESS_THAN": return got < want;
            case "LESS_THAN_OR_EQUAL": return got <= want;
            case "NOT_EQUAL": return got !== want;
            default: return true;
          }
        });
        const agg = b.structuredAggregationQuery.aggregations[0] || {};
        let count = 0, sum = 0;
        for (const [p, doc] of docs) if (p.split("/").length === 2 && p.startsWith(coll + "/") && matchF(doc)) { count++; if (agg.sum) sum += Number(doc[agg.sum.field.fieldPath] || 0); }
        if (agg.sum) return send(200, [{ result: { aggregateFields: { s: { integerValue: String(Math.round(sum)) } } } }]);
        return send(200, [{ result: { aggregateFields: { c: { integerValue: String(count) } } } }]);
      }
      return send(404, { error: { message: "UNROUTED " + url.pathname } });
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({
    port: server.address().port,
    users, docs, ownerUids, idpCalls,
    close: () => server.close(),
  })));
}
