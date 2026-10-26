// "Bring my calendar in" — module checks (pure layer, no DOM).
// Run: node tests/import-check.mjs
import { createRequire } from "module";
import fs from "fs";
const require = createRequire(import.meta.url);
const CI = require("../calendar-import.js");
let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS", name); } else { fail++; console.log("FAIL", name); } };
const NOW = new Date("2026-10-14T10:00:00"); // Wednesday 14 Oct 2026
const fx = n => fs.readFileSync(new URL("./fixtures/" + n, import.meta.url), "utf8");
const localKey = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const localClock = d => String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
const utcIsLocal = new Intl.DateTimeFormat("en-US", { timeZone: "UTC" }).resolvedOptions().timeZone === Intl.DateTimeFormat().resolvedOptions().timeZone;

// --- Google: live repeats map, singles land, all-day stays all-day ---
const g = CI.parseICS(fx("google.ics"));
check("google: 4 events parsed", g.events.length === 4);
check("google: calendar name read", g.calendarName === "Work");
const gp = CI.planImport(g, [], { now: NOW, sourceLabel: "google" });
const byUid = {}; gp.add.forEach(s => { byUid[s.importUid] = s; });
const weekly = gp.add.filter(s => s.importUid === "g1@google.com");
const daily = gp.add.filter(s => s.importUid === "g2@google.com");
check("google: UTC weekly repeats expand outside the device timezone", utcIsLocal ? weekly.length === 1 && weekly[0].repeat === "every week" : weekly.length > 20 && weekly.every(s => !s.repeat));
check("google: UTC daily repeats expand with local clock times", utcIsLocal ? daily.length === 1 && daily[0].repeat === "every day" : daily.length > 300 && daily.every(s => !s.repeat));
const expectedGoogleDaily = g.events.find(e => e.uid === "g2@google.com").start.toJSDate();
check("google: UTC event lands on the device's local day and time", utcIsLocal ? daily[0].date === localKey(expectedGoogleDaily) && daily[0].time === localClock(expectedGoogleDaily) : daily.some(s => s.date === localKey(expectedGoogleDaily) && s.time === localClock(expectedGoogleDaily)));
check("google: all-day has no time and keeps its all-day flag", byUid["g3@google.com"] && byUid["g3@google.com"].time === null && byUid["g3@google.com"].allDay === true && byUid["g3@google.com"].date === "2026-10-20");
check("google: single keeps notes+location", byUid["g4@google.com"] && /referral/.test(byUid["g4@google.com"].notes) && /Smile/.test(byUid["g4@google.com"].location));
check("google: UTC repeats stay live only when UTC is the device timezone", gp.liveRepeats === (utcIsLocal ? 2 : 0));

// --- Outlook: fortnightly + monthly must EXPAND, never map live ---
const o = CI.parseICS(fx("outlook.ics"));
const op = CI.planImport(o, [], { now: NOW, sourceLabel: "outlook" });
check("outlook: nothing mapped live", op.liveRepeats === 0 && op.add.every(s => !s.repeat));
const physio = op.add.filter(s => s.importUid === "o1@outlook.com");
check("outlook: fortnightly expanded to many instances", physio.length >= 20);
check("outlook: fortnightly spacing is 14 days", physio.length >= 2 && (new Date(physio[1].date) - new Date(physio[0].date)) === 14 * 864e5);
const rent = op.add.filter(s => s.importUid === "o2@outlook.com");
check("outlook: monthly expanded (12 in window)", rent.length >= 10 && rent.length <= 13);

// --- Apple: VTIMEZONE conversion, UNTIL expands, EXDATE honoured, overrides land ---
const a = CI.parseICS(fx("apple.ics"));
const ap = CI.planImport(a, [], { now: NOW, sourceLabel: "apple" });
const school = ap.add.filter(s => s.importUid === "a1@icloud.com");
check("apple: UNTIL daily expanded, not live", school.length >= 10 && school.every(s => !s.repeat));
const schoolMaster = a.events.find(e => e.uid === "a1@icloud.com");
const schoolLocal = schoolMaster.start.toJSDate();
check("apple: Sydney time converts to this device's local day and clock", school.length > 0 && school[0].date === localKey(schoolLocal) && school[0].time === localClock(schoolLocal) && school.every(s => s.time === localClock(schoolLocal)));
const yoga = ap.add.filter(s => s.importUid === "a2@icloud.com");
const yogaMaster = a.events.find(e => e.uid === "a2@icloud.com");
const yogaSkipDate = yogaMaster.exdates[0].split("|")[0];
check("apple: EXDATE instance is absent on the device-local date", !yoga.some(s => s.date === yogaSkipDate));
check("apple: other yoga Wednesdays land on the device-local date", yoga.some(s => s.date === localKey(yogaMaster.start.toJSDate())));
const club = ap.add.filter(s => s.importUid === "a3@icloud.com");
check("apple: overridden series expands (not live)", club.length > 1 && club.every(s => !s.repeat));
const override = a.events.find(e => e.recurrenceId);
const overrideLocal = override.start.toJSDate();
const originalSlotDate = override.recurrenceSlot.split("|")[0];
check("apple: the override lands on its new device-local date and time", club.some(s => s.date === localKey(overrideLocal) && s.time === localClock(overrideLocal)));
check("apple: the original overridden slot is not doubled", club.filter(s => s.date === originalSlotDate).length === 1);

// --- dedupe: re-import adds nothing ---
const existing = gp.add.map(s => ({ title: s.title, date: s.date, time: s.time, importUid: s.importUid, importKey: s.importKey }));
const gp2 = CI.planImport(g, existing, { now: NOW, sourceLabel: "google" });
check("dedupe: re-import adds 0", gp2.add.length === 0);
check("dedupe: re-import counts the dupes", gp2.dupes === gp.add.length);

// --- broken file: no crash, nothing added ---
let bp = null, crashed = false;
try { bp = CI.planImport(CI.parseICS(fx("broken.ics")), [], { now: NOW }); } catch (e) { crashed = true; }
check("broken: no crash, adds nothing", !crashed && bp && bp.add.length === 0);

// --- apply: registry written, counts honest ---
const state = { tasks: [], imports: [] };
const toTask = s => ({ title: s.title, date: s.date, time: s.time, durationMin: s.durationMin, repeat: s.repeat, importUid: s.importUid, importKey: s.importKey, source: "import" });
const res = CI.applyImport(state, gp, "Google Calendar", toTask);
check("apply: tasks added == plan", state.tasks.length === gp.add.length && res.added === gp.add.length);
check("apply: registry entry recorded with count", state.imports.length === 1 && state.imports[0].count === gp.add.length);



// --- repeatModel: "none" (Meal Prep seam Q1: a repeat-less host must
// never be handed a live repeat it cannot honour — everything expands).
{
  const planNone = CI.planImport(g, [], { now: NOW, sourceLabel: "Google Calendar", repeatModel: "none" });
  check("repeatModel none: nothing maps live", planNone.liveRepeats === 0 && planNone.add.every(s => !s._live && !s.repeat));
  check("repeatModel none: the weekly + daily series expand into many dated instances", planNone.add.length > 40 && planNone.expanded > 40);
  const planDef = CI.planImport(g, [], { now: NOW, sourceLabel: "Google Calendar" });
  check("default maps UTC series live only in UTC, and otherwise expands", planDef.liveRepeats === (utcIsLocal ? 2 : 0) && (utcIsLocal ? planDef.add.length === 4 : planDef.add.length > 300));
}

const floating = CI.parseICS(["BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", "UID:floating-daily@example.test", "DTSTART:20261014T090000", "DTEND:20261014T093000", "RRULE:FREQ=DAILY", "SUMMARY:Local floating series", "END:VEVENT", "END:VCALENDAR"].join("\r\n"));
const floatingPlan = CI.planImport(floating, [], { now: NOW, sourceLabel: "floating" });
check("floating local-time series stays a truthful live daily repeat", floatingPlan.liveRepeats === 1 && floatingPlan.add[0].repeat === "every day");

console.log("RESULT pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);