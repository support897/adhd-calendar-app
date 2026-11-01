/* Build 39, Phase A: PaceShare transport logic against an
   in-memory PaceFB stub (no network). Proves the doc shape,
   the join (once only), member act, and leave semantics that
   sharing-ui.js will ride on. Rules are the mock's job; the
   live rules proof rides the audit battery at publish. */
import { createRequire } from "module";
const require = createRequire(import.meta.url);

let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) { pass++; console.log("ok -", name); } else { fail++; console.log("FAIL -", name); } };

const store = new Map();
let me = "uid-A";
globalThis.PaceFB = {
  session: () => ({ uid: me }),
  fsGet: (p) => Promise.resolve(store.has(p) ? JSON.parse(JSON.stringify(store.get(p))) : null),
  fsSet: (p, o) => { store.set(p, JSON.parse(JSON.stringify(o))); return Promise.resolve(o); },
  fsDelete: (p) => { store.delete(p); return Promise.resolve(true); },
  fsList: (p) => Promise.resolve([...store.keys()].filter((k) => k.startsWith(p + "/")).map((k) => { const o = JSON.parse(JSON.stringify(store.get(k))); o._id = k.split("/").pop(); return o; })),
};
const S = require("../sharing.js");

const run = async () => {
  const doc = await S.create({
    title: "Save $600 for the bond", category: "money", end: "2026-11-28", closed: false,
    ownerName: "Ana", splitMode: "even",
    members: { "uid-A": { name: "Ana", focus: "" } },
    steps: [
      { sid: "s1", title: "Put $22 aside", date: "2026-11-02", time: null, durationMin: 20, minVersion: "x", assignee: null, status: "todo", doneBy: null, doneAt: null },
      { sid: "s2", title: "Put $22 aside", date: "2026-11-03", time: null, durationMin: 20, minVersion: "x", assignee: null, status: "todo", doneBy: null, doneAt: null },
    ],
  });
  ok(typeof doc.id === "string" && doc.id.length >= 20, "create stamps a long random id");
  ok(doc.ownerUid === "uid-A" && Object.keys(doc.members).length === 1 && !!doc.members["uid-A"] && !("memberUids" in doc), "creator is owner and first member (uid-keyed map, no memberUids)");
  ok(S.shareLink(doc.id).endsWith("?join=" + doc.id), "share link carries the id");
  // v2.6 storeys: the stored goal doc carries stepCount and NO
  // steps; each step is its own doc, createdBy stamped.
  const rawGoal = store.get("sharedGoals/" + doc.id);
  ok(rawGoal && !("steps" in rawGoal) && rawGoal.stepCount === 2, "stored goal doc: stepCount in, steps field gone (v2.6)");
  const rawStep = store.get("sharedGoals/" + doc.id + "/steps/s1");
  ok(!!rawStep && rawStep.createdBy === "uid-A" && rawStep.status === "todo", "steps live as their own docs, createdBy stamped at birth");

  me = "uid-B";
  const j1 = await S.join(doc.id, "Ben");
  ok(j1.joined === true && Object.keys(j1.doc.members).length === 2 && j1.doc.members["uid-B"].name === "Ben", "second account joins once");
  const j2 = await S.join(doc.id, "Ben");
  ok(j2.joined === false && Object.keys(j2.doc.members).length === 2, "joining twice adds nobody");

  const ticked = await S.act(doc.id, (d) => { const s = d.steps[0]; s.status = "done"; s.doneBy = "uid-B"; s.doneAt = 123; });
  ok(ticked.steps[0].status === "done" && ticked.steps[0].doneBy === "uid-B", "member act writes a tick");

  const after = await S.act(doc.id, (d) => { d.steps[1].assignee = "uid-B"; });
  ok(after.steps[1].assignee === "uid-B", "assignment lands");
  const left = await S.leave(doc.id);
  ok(!left.members["uid-B"] && left.steps[1].assignee === null && left.steps[0].status === "done", "leave removes the member and frees their open steps, done stays");

  me = "uid-A";
  const ownLeave = await S.leave(doc.id);
  ok(!!ownLeave.members["uid-A"], "the owner cannot leave their own goal");

  // A non-member's read: the goal doc alone — no step bodies,
  // the count rides stepCount (the join sheet's source).
  me = "uid-C";
  const strangerView = await S.get(doc.id);
  ok(!!strangerView && strangerView.steps.length === 0 && strangerView.stepCount === 2, "non-member read: goal doc only, steps empty, stepCount stands");

  me = "uid-A";
  await S.destroy(doc.id);
  const gone = await S.get(doc.id);
  ok(gone === null, "owner destroy removes the doc");
  ok(![...store.keys()].some((k) => k.includes(doc.id)), "destroy removes the step docs too");

  console.log(`RESULT pass=${pass} fail=${fail}`);
  process.exit(fail ? 1 : 0);
};
run().catch((e) => { console.log("FAIL - threw:", e && e.message); console.log(`RESULT pass=${pass} fail=${fail + 1}`); process.exit(1); });
