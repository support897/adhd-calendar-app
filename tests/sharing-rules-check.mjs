/* Build 39: the v2.6 sharedGoals fence, exercised as raw REST
   against the mock (which carries Security's ruled semantics:
   R1/R2 member-map fences on the goal doc + the F-P39-1 cure
   on per-step docs). The headliners are Security's named legs:
   the finding's two forgeries DENIED, owner-ticks-a-member's
   step DENIED beside them. The live-rules proof of the same
   fence rides the audit battery at publish time (twin, then
   production). */
const { startMock } = await import("./mock-firebase.mjs");
const mock = await startMock();
const BASE = `http://127.0.0.1:${mock.port}`;
let pass = 0, fail = 0;
const check = (n, c, d) => { if (c) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n + (d ? " [" + d + "]" : "")); } };

const enc = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  const f = {}; for (const k of Object.keys(v)) f[k] = enc(v[k]);
  return { mapValue: { fields: f } };
};
const fieldsOf = (o) => { const f = {}; for (const k of Object.keys(o)) f[k] = enc(o[k]); return f; };
async function signUp(email) {
  const r = await fetch(`${BASE}/v1/accounts:signUp?key=x`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "password-1", returnSecureToken: true }) });
  const j = await r.json();
  return { uid: j.localId, tok: j.idToken };
}
const DOCS = `${BASE}/v1/projects/pace-test/databases/(default)/documents`;
async function put(path, tok, doc) {
  const r = await fetch(`${DOCS}/${path}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok }, body: JSON.stringify({ fields: fieldsOf(doc) }) });
  return r.status;
}
async function get(path, tok) {
  const r = await fetch(`${DOCS}/${path}`, { headers: { Authorization: "Bearer " + tok } });
  return r.status;
}
async function del(path, tok) {
  const r = await fetch(`${DOCS}/${path}`, { method: "DELETE", headers: { Authorization: "Bearer " + tok } });
  return r.status;
}
const clone = (o) => JSON.parse(JSON.stringify(o));

const A = await signUp("a@test.dev"), B = await signUp("b@test.dev"), C = await signUp("c@test.dev"), D = await signUp("d@test.dev");

/* ---------- the goal doc (v2.5 arms, v2.6 key set) ---------- */
const GID = "testgoal000000000001";
const base = { title: "Bond goal", category: "money", end: "2026-11-28", ownerUid: A.uid, ownerName: "Ana", splitMode: "strengths", closed: false,
  members: { [A.uid]: { name: "Ana", focus: "" } }, stepCount: 1, createdAt: 1000, updatedAt: 1000 };

check("create by the owner as sole member: allowed", await put(`sharedGoals/${GID}`, A.tok, clone(base)) === 200);
const badCreate = clone(base); badCreate.members[B.uid] = { name: "Ben", focus: "" };
check("create smuggling a second member: denied", await put("sharedGoals/testgoal000000000002", A.tok, badCreate) === 403);
const stepsCreate = clone(base); stepsCreate.steps = [];
check("create carrying a steps field (v2.6 closed key set): DENIED", await put("sharedGoals/testgoal000000000003", A.tok, stepsCreate) === 403);

const joinDoc = clone(base); joinDoc.members[B.uid] = { name: "Ben", focus: "" }; joinDoc.updatedAt = 1001;
check("honest join: allowed", await put(`sharedGoals/${GID}`, B.tok, joinDoc) === 200);

// HEADLINE (Security R1): C's join that also drops the owner must deny.
const evilJoin = clone(joinDoc); delete evilJoin.members[A.uid]; evilJoin.members[C.uid] = { name: "Cat", focus: "" }; evilJoin.updatedAt = 1002;
check("join-rewrite (drops the owner while joining): DENIED", await put(`sharedGoals/${GID}`, C.tok, evilJoin) === 403);
const countJoin = clone(joinDoc); countJoin.members[C.uid] = { name: "Cat", focus: "" }; countJoin.stepCount = 99; countJoin.updatedAt = 1002;
check("join that also moves stepCount (pinned in the join arm): DENIED", await put(`sharedGoals/${GID}`, C.tok, countJoin) === 403);

const titleDoc = clone(joinDoc); titleDoc.title = "Hijacked"; titleDoc.updatedAt = 1004;
check("member renames the goal: DENIED", await put(`sharedGoals/${GID}`, B.tok, titleDoc) === 403);
const kickDoc = clone(joinDoc); delete kickDoc.members[A.uid]; kickDoc.updatedAt = 1004;
check("member kicks the owner out: DENIED", await put(`sharedGoals/${GID}`, B.tok, kickDoc) === 403);
const focusDoc = clone(joinDoc); focusDoc.members[B.uid].focus = "ring people"; focusDoc.updatedAt = 1004;
check("member edits their own focus words: allowed", await put(`sharedGoals/${GID}`, B.tok, focusDoc) === 200);
const fatFocus = clone(joinDoc); fatFocus.members[B.uid].focus = "x".repeat(201); fatFocus.updatedAt = 1004;
check("member focus over the 200 cap: DENIED", await put(`sharedGoals/${GID}`, B.tok, fatFocus) === 403);
const restamp = clone(focusDoc); restamp.stepCount = 7; restamp.updatedAt = 1005;
check("member restamps stepCount: allowed BY DESIGN (Addendum 2, display-only)", await put(`sharedGoals/${GID}`, B.tok, restamp) === 200);

check("stranger with the link reads the goal doc: allowed", await get(`sharedGoals/${GID}`, D.tok) === 200);
const dWrite = clone(restamp); dWrite.members[D.uid] = { name: "Dee", focus: "x" }; dWrite.members[B.uid].focus = "forged"; dWrite.updatedAt = 1006;
check("stranger's join that also rewrites another member: DENIED", await put(`sharedGoals/${GID}`, D.tok, dWrite) === 403);
check("signed-out read: denied", await get(`sharedGoals/${GID}`, "") === 403);

const closedDoc = clone(restamp); closedDoc.closed = true; closedDoc.updatedAt = 1007;
check("owner closes the goal: allowed", await put(`sharedGoals/${GID}`, A.tok, closedDoc) === 200);
const lateJoin = clone(closedDoc); lateJoin.members[C.uid] = { name: "Cat", focus: "" }; lateJoin.updatedAt = 1008;
check("join into a closed goal: DENIED", await put(`sharedGoals/${GID}`, C.tok, lateJoin) === 403);
const stealDoc = clone(closedDoc); stealDoc.ownerUid = B.uid; stealDoc.updatedAt = 1009;
check("ownerUid moved by anyone: DENIED", await put(`sharedGoals/${GID}`, A.tok, stealDoc) === 403);
check("member deletes the goal: DENIED", await del(`sharedGoals/${GID}`, B.tok) === 403);
check("owner deletes the goal: allowed", await del(`sharedGoals/${GID}`, A.tok) === 200);

/* ---------- the step docs (the F-P39-1 cure) ---------- */
const G2 = "testgoal000000000101";
const g2 = { title: "Move house", category: "life", end: "2026-12-01", ownerUid: A.uid, ownerName: "Ana", splitMode: "even", closed: false,
  members: { [A.uid]: { name: "Ana", focus: "" } }, stepCount: 3, createdAt: 2000, updatedAt: 2000 };
check("cure goal: owner creates", await put(`sharedGoals/${G2}`, A.tok, clone(g2)) === 200);
const g2join = clone(g2); g2join.members[B.uid] = { name: "Ben", focus: "" }; g2join.updatedAt = 2001;
check("cure goal: Ben joins", await put(`sharedGoals/${G2}`, B.tok, g2join) === 200);

const step = (over) => Object.assign({ title: "Step", date: "2026-11-02", time: null, durationMin: 20, minVersion: "x", assignee: null, status: "todo", doneBy: null, doneAt: null, createdBy: A.uid }, over || {});
const SP = (sid) => `sharedGoals/${G2}/steps/${sid}`;
check("owner creates a step assigned to the owner", await put(SP("s1"), A.tok, step({ title: "Ring the bank", assignee: A.uid })) === 200);
check("owner creates a step assigned to Ben", await put(SP("s2"), A.tok, step({ title: "Pack the kitchen", assignee: B.uid })) === 200);
check("member creates a pooled step (createdBy = the member)", await put(SP("s3"), B.tok, step({ title: "Buy tape", createdBy: B.uid })) === 200);
check("non-member creates a step: DENIED", await put(SP("sx"), D.tok, step({ createdBy: D.uid })) === 403);
check("create born-done: DENIED", await put(SP("sx"), A.tok, step({ status: "done", doneBy: A.uid, doneAt: 5 })) === 403);
check("create with assignee outside the membership: DENIED", await put(SP("sx"), A.tok, step({ assignee: D.uid })) === 403);

// THE FINDING, both forgeries, at the head of the cure legs:
const s1 = step({ title: "Ring the bank", assignee: A.uid });
const forge1 = Object.assign(clone(s1), { status: "done", doneBy: A.uid, doneAt: 3000 });
check("member ticks OWNER's step with doneBy = owner: DENIED (the finding)", await put(SP("s1"), B.tok, forge1) === 403);
const forge2 = Object.assign(clone(s1), { status: "done", doneBy: B.uid, doneAt: 3000 });
check("member ticks owner's step with doneBy = self: DENIED", await put(SP("s1"), B.tok, forge2) === 403);
const s2 = step({ title: "Pack the kitchen", assignee: B.uid });
const ownerTick = Object.assign(clone(s2), { status: "done", doneBy: B.uid, doneAt: 3000 });
check("owner ticks a MEMBER's step: DENIED (no owner bypass)", await put(SP("s2"), A.tok, ownerTick) === 403);
const wrongCredit = Object.assign(clone(s2), { status: "done", doneBy: A.uid, doneAt: 3000 });
check("assignee ticks with doneBy = another: DENIED", await put(SP("s2"), B.tok, wrongCredit) === 403);
const ownTick = Object.assign(clone(s2), { status: "done", doneBy: B.uid, doneAt: 3000 });
check("assignee ticks own step done, doneBy = self: allowed", await put(SP("s2"), B.tok, ownTick) === 200);
check("assignee reopens own step, credit cleared: allowed", await put(SP("s2"), B.tok, clone(s2)) === 200);

const s3 = step({ title: "Buy tape", createdBy: B.uid });
check("member takes a pooled step: allowed", await put(SP("s3"), B.tok, Object.assign(clone(s3), { assignee: B.uid })) === 200);
check("member returns own step to the pool: allowed", await put(SP("s3"), B.tok, clone(s3)) === 200);
check("member steals another's step (assignee grab): DENIED", await put(SP("s1"), B.tok, Object.assign(clone(s1), { assignee: B.uid })) === 403);
check("member edits another's step title: DENIED", await put(SP("s1"), B.tok, Object.assign(clone(s1), { title: "Hijacked" })) === 403);
check("creator edits own step title: allowed", await put(SP("s3"), B.tok, Object.assign(clone(s3), { title: "Buy more tape" })) === 200);
check("a write moving createdBy: DENIED (Addendum 2, provenance)", await put(SP("s3"), B.tok, Object.assign(clone(s3), { title: "Buy more tape", createdBy: A.uid })) === 403);

check("member lists steps: allowed", await get(`sharedGoals/${G2}/steps`, B.tok) === 200);
check("non-member lists steps: DENIED", await get(`sharedGoals/${G2}/steps`, D.tok) === 403);
check("member reads a step doc: allowed", await get(SP("s1"), B.tok) === 200);
check("non-member reads a step doc: DENIED", await get(SP("s1"), D.tok) === 403);
check("member deletes another's step: DENIED", await del(SP("s1"), B.tok) === 403);
check("creator deletes own step: allowed", await del(SP("s3"), B.tok) === 200);

// C-1 (Security's clearance change): membership binds the
// creator's delete — a removed member keeps no delete power.
check("member creates one more pooled step", await put(SP("s4"), B.tok, step({ title: "Water the plants", createdBy: B.uid })) === 200);
const removed = clone(g2join); delete removed.members[B.uid]; removed.updatedAt = 2002;
check("owner removes Ben from the goal", await put(`sharedGoals/${G2}`, A.tok, removed) === 200);
check("removed member deletes their created step: DENIED (C-1)", await del(SP("s4"), B.tok) === 403);
check("removed member writes a step at all: DENIED", await put(SP("s2"), B.tok, Object.assign(clone(s2), { status: "done", doneBy: B.uid, doneAt: 3000 })) === 403);

console.log(`RESULT pass=${pass} fail=${fail}`);
process.exit(fail ? 1 : 0);
