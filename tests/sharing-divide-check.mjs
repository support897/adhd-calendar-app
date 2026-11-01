/* Build 39, Phase B: divideSteps fairness + strengths matching,
   driven through a vm window stub (sharing-ui.js is browser code). */
import vm from "vm";
import fs from "fs";
let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log("ok -", n); } else { fail++; console.log("FAIL -", n); } };
const sandbox = {
  console, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => {},
  location: { search: "", pathname: "/" }, history: { replaceState() {} },
  document: { getElementById: () => null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, addEventListener() {}, querySelectorAll: () => [] }) },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
};
sandbox.window = sandbox;
sandbox.PaceCtx = { state: { settings: {}, tasks: [], goals: [] }, save() {}, uid: () => "u-x", toast() {}, refreshAll() {} };
sandbox.PaceShare = { myUid: () => "u-a", shareLink: (i) => "x?join=" + i };
sandbox.CalmLogic = {};
sandbox.t = (s, v) => v ? String(s).replace(/\{(\w+)\}/g, (m, k) => v[k] != null ? v[k] : m) : s;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL("../sharing-ui.js", import.meta.url), "utf8"), sandbox);
const D = sandbox.PaceShareUI && sandbox.PaceShareUI.divideSteps;
ok(typeof D === "function", "divideSteps is exposed");
const members = [{ uid: "u-a", name: "Ana", focus: "" }, { uid: "u-b", name: "Ben", focus: "" }];
const steps = [
  { sid: "s1", title: "Put $22 aside", date: "2026-11-02", durationMin: 20, status: "todo", assignee: null },
  { sid: "s2", title: "Put $22 aside", date: "2026-11-03", durationMin: 20, status: "todo", assignee: null },
  { sid: "s3", title: "Check the bank numbers", date: "2026-11-04", durationMin: 30, status: "todo", assignee: null },
  { sid: "s4", title: "Ring the bank", date: "2026-11-05", durationMin: 30, status: "todo", assignee: null },
];
const even = D(steps, members, "even");
const mins = { "u-a": 0, "u-b": 0 };
Object.entries(even).forEach(([sid, u]) => { mins[u] += steps.find((s) => s.sid === sid).durationMin; });
ok(mins["u-a"] === 50 && mins["u-b"] === 50, "even split balances minutes 50/50 (got " + JSON.stringify(mins) + ")");
const strong = D(steps, [{ uid: "u-a", name: "Ana", focus: "money and bank numbers" }, { uid: "u-b", name: "Ben", focus: "cooking and cleaning" }], "strengths");
ok(strong.s1 === "u-a" && strong.s3 === "u-a" && strong.s4 === "u-a", "strengths: the money/bank steps go to the money person");
const doneSteps = steps.concat([{ sid: "s9", title: "Old done step", date: "2026-11-01", durationMin: 15, status: "done", assignee: "u-b" }]);
const withDone = D(doneSteps, members, "even");
ok(!("s9" in withDone), "done steps are never re-divided");
const noMatch = D(steps, [{ uid: "u-a", name: "Ana", focus: "underwater basket weaving" }, { uid: "u-b", name: "Ben", focus: "quantum origami" }], "strengths");
const nm = { "u-a": 0, "u-b": 0 };
Object.entries(noMatch).forEach(([sid, u]) => { nm[u] += steps.find((s) => s.sid === sid).durationMin; });
ok(Math.abs(nm["u-a"] - nm["u-b"]) <= 30, "no focus match still lands fair (got " + JSON.stringify(nm) + ")");
console.log(`RESULT pass=${pass} fail=${fail}`);
process.exit(fail ? 1 : 0);
