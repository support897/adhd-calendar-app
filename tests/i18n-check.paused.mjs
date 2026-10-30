// PAUSED 30 Oct 2026: Spanish removed (owner ruling), the app is English only. Restore the name i18n-check.mjs if a language returns.
// Pace — Spanish coverage sweep, runtime-accurate (PACE-013).
// tr() literals are extracted from the shipped JS and unescaped the
// JS way (JSON.parse) before lookup — a purely textual sweep cannot
// see \u2019-style escapes and once reported two covered strings as
// missing. The lookup target is the ES table itself (PACE_ES_TABLE):
// every literal the app can speak must have a Spanish entry.
import { readFileSync } from "node:fs";
let pass = 0, fail = 0;
const check = (name, ok) => { console.log((ok ? "PASS " : "FAIL ") + name); ok ? pass++ : fail++; };
globalThis.window = {};
eval(readFileSync(new URL("../i18n.js", import.meta.url), "utf8"));
const ES = globalThis.window.PACE_ES_TABLE;
check("the ES table is exposed and populated (" + (ES ? Object.keys(ES).length : 0) + " entries)", !!ES && Object.keys(ES).length > 300);
const seen = new Set();
for (const f of ["app.js", "calendar-import.js", "firebase.js", "billing.js", "logic.js", "goals.js", "goals-ui.js"]) {
  const src = readFileSync(new URL("../" + f, import.meta.url), "utf8");
  for (const m of src.matchAll(/\btr\("((?:[^"\\]|\\.)*)"/g)) seen.add(JSON.parse('"' + m[1] + '"'));
}
const missing = [...seen].filter((s) => !Object.prototype.hasOwnProperty.call(ES, s));
check("all " + seen.size + " tr() literals carry a Spanish entry (missing: " + missing.length + (missing.length ? " — " + missing.slice(0, 3).join(" | ") : "") + ")", missing.length === 0);
check("PACE-013 regression: the import error lines are covered", !!ES["That didn\u2019t read as a calendar. Nothing was brought in."] && !!ES["That file couldn\u2019t be read."]);
console.log("RESULT pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
