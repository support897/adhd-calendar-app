// "Bring my calendar in" — ISOLATION battery (Security NS-2, 14 Oct 2026).
// The module is isolation-first: it only ever sees the importing user's
// own space. These checks pin that at the module level with the TU cast
// (tests/fixtures/users/): an import lands ONLY in the importer's space,
// dedupe never crosses users, counts move for the importer alone.
// Run: node tests/import-isolation-check.mjs
import { createRequire } from "module";
import fs from "fs";
const require = createRequire(import.meta.url);
const CI = require("../calendar-import.js");
let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS", name); } else { fail++; console.log("FAIL", name); } };
const NOW = new Date("2026-10-14T10:00:00");
const load = n => JSON.parse(fs.readFileSync(new URL("./fixtures/users/" + n, import.meta.url), "utf8"));
const clone = o => JSON.parse(JSON.stringify(o));
const ics = fs.readFileSync(new URL("./fixtures/google.ics", import.meta.url), "utf8");
const toTask = s => ({ id: "x", title: s.title, date: s.date, time: s.time, durationMin: s.durationMin, repeat: s.repeat, source: "import", importUid: s.importUid, importKey: s.importKey });

const A = load("tu-a.state.json"), B = load("tu-b.state.json"), C = load("tu-c.state.json");
const bBefore = JSON.stringify(B), cBefore = JSON.stringify(C);

// TU-B imports the SAME Google calendar TU-A already holds events from.
const planB = CI.planImport(CI.parseICS(ics), B.tasks, { now: NOW, sourceLabel: "Google Calendar" });
check("NS-2: dedupe never crosses users — B is offered the full set despite A's imports", planB.add.length === 4 && planB.dupes === 0);
const resB = CI.applyImport(B, planB, "Google Calendar", toTask);
check("NS-2: the import lands in B's space (tasks + registry)", B.tasks.length === 5 && B.imports.length === 1);
check("NS-2: A's space is byte-identical after B's import", JSON.stringify(A) === JSON.stringify(load("tu-a.state.json")));
check("NS-2: C's space is byte-identical after B's import", JSON.stringify(C) === cBefore);

// Within B's own space, re-import dedupes (the fence inside one user).
const planB2 = CI.planImport(CI.parseICS(ics), B.tasks, { now: NOW, sourceLabel: "Google Calendar" });
check("NS-2: re-import inside B's own space dedupes to 0", planB2.add.length === 0 && planB2.dupes === 4);
check("NS-2: A's counts never moved (tasks, registry)", A.tasks.length === 3 && A.imports.length === 1 && A.imports[0].count === 1);

// A malformed file writes nothing anywhere.
const aBefore = JSON.stringify(A);
const planBad = CI.planImport(CI.parseICS("not a calendar {{{"), A.tasks, { now: NOW });
CI.applyImport(A, planBad, "junk", toTask);
check("NS-2: a malformed file adds nothing + writes no registry", planBad.add.length === 0 && JSON.stringify(A) === aBefore);

// Personalisation contrast stays put: worlds remain their own after imports.
check("PZ seed: A and C keep different looks after all imports", A.settings.appearance.theme === "sky" && C.settings.appearance.theme === "lavender" && C.settings.appearance.cute === true);

console.log("RESULT pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
