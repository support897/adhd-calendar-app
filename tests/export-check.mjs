// Calendar export: real .ics fixture round-trip checks.
// Run: node tests/export-check.mjs
import { createRequire } from "module";
import fs from "fs";
const require = createRequire(import.meta.url);
const CI = require("../calendar-import.js");
const CE = require("../calendar-export.js");
let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS", name); } else { fail++; console.log("FAIL", name); } };
const fixture = name => fs.readFileSync(new URL("./fixtures/" + name, import.meta.url), "utf8");
const now = new Date("2026-10-28T00:00:00");
const apple = CI.parseICS(fixture("apple.ics"));
const applePlan = CI.planImport(apple, [], { now, sourceLabel: "apple" });
const google = CI.parseICS(fixture("google.ics"));
const googlePlan = CI.planImport(google, [], { now, sourceLabel: "google" });
const sourceZoneEvent = apple.events.find(e => e.title === "School run");
const localZoneSpec = applePlan.add.find(e => e.title === "School run");
const allDaySpec = googlePlan.add.find(e => e.title === "Mum's birthday");
check("Apple fixture has a named VTIMEZONE", !!sourceZoneEvent && sourceZoneEvent.timeZoneId === "Australia/Sydney");
check("Apple timezone event imports into a local date and time", !!localZoneSpec && /^\d{4}-\d{2}-\d{2}$/.test(localZoneSpec.date) && /^\d{2}:\d{2}$/.test(localZoneSpec.time));
check("Google all-day fixture is available for round-trip", !!allDaySpec && allDaySpec.allDay === true && allDaySpec.date === "2026-10-20");

const state = { tasks: [
  { id: "weekly-monday", title: "Weekly standup", date: "2026-10-12", time: "09:30", durationMin: 30, repeat: "every monday", status: "todo" },
  { id: "weekday", title: "Weekday check-in", date: "2026-10-26", time: "08:00", durationMin: 15, repeat: "every weekday", status: "todo" },
  { id: "weekend", title: "Weekend reset", date: "2026-10-24", time: null, allDay: true, durationMin: 30, repeat: "every weekend", status: "todo" },
  { id: "zone-import", title: "Imported Sydney event", date: localZoneSpec.date, time: localZoneSpec.time, durationMin: localZoneSpec.durationMin, status: "todo" },
  { id: "all-day-import", title: allDaySpec.title, date: allDaySpec.date, time: null, allDay: true, durationMin: 30, status: "todo" },
  { id: "skip-repeat", title: "Skipped weekly task", date: "2026-10-12", time: "11:00", durationMin: 20, repeat: "every monday", skipDates: ["2026-10-19"], status: "todo" },
  { id: "comma-title", title: "Pay rent, then plan", date: "2026-10-29", time: "13:00", durationMin: 25, notes: "Breathe, then leave.", status: "todo" }
] };
const exported = CE.toICS(state, { timeZone: "Australia/Brisbane", now });
const reparsed = CI.parseICS(exported);
check("export is a valid VCALENDAR with no malformed lines", !reparsed.error && reparsed.events.length === state.tasks.length && reparsed.malformedLines === 0);
check("export declares the device timezone hint", exported.includes("X-WR-TIMEZONE:Australia/Brisbane"));
check("weekly and weekday recurrences are serialized as RRULEs", exported.includes("RRULE:FREQ=WEEKLY;BYDAY=MO") && exported.includes("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"));
check("all-day events use DATE values and exclusive next-day DTEND", /DTSTART;VALUE=DATE:20261020\r\nDTEND;VALUE=DATE:20261021/.test(exported));
check("skipped repeat dates become EXDATE", exported.includes("EXDATE:20261019T110000"));
check("comma in title is escaped and apostrophe text survives", exported.includes("SUMMARY:Pay rent\\, then plan") && reparsed.events.some(e => e.title === "Mum's birthday"));
check("written task notes round-trip in the event description", exported.includes("DESCRIPTION:Breathe\\, then leave.") && reparsed.events.some(e => e.title === "Pay rent, then plan" && e.notes === "Breathe, then leave."));

const roundPlan = CI.planImport(reparsed, [], { now, sourceLabel: "Pace export" });
const returnedWeekday = roundPlan.add.find(e => e.title === "Weekday check-in");
const returnedWeekend = roundPlan.add.find(e => e.title === "Weekend reset");
const returnedZone = roundPlan.add.find(e => e.title === "Imported Sydney event");
const returnedAllDay = roundPlan.add.find(e => e.title === "Mum's birthday");
const returnedSkip = roundPlan.add.find(e => e.title === "Skipped weekly task");
check("weekday recurrence round-trips as a live series", !!returnedWeekday && returnedWeekday.repeat === "every weekday" && returnedWeekday.time === "08:00");
check("all-day weekend recurrence round-trips as a live series", !!returnedWeekend && returnedWeekend.repeat === "every weekend" && returnedWeekend.allDay === true);
check("imported named-zone event keeps its device-local date and time", !!returnedZone && returnedZone.date === localZoneSpec.date && returnedZone.time === localZoneSpec.time);
check("Google all-day date round-trips unchanged", !!returnedAllDay && returnedAllDay.date === allDaySpec.date && returnedAllDay.allDay === true);
check("EXDATE is respected after round-trip", !!returnedSkip && returnedSkip.date === "2026-10-12" && !roundPlan.add.some(e => e.title === "Skipped weekly task" && e.date === "2026-10-19"));

const empty = CI.parseICS(CE.toICS({ tasks: [] }, { now }));
check("empty calendar export stays a valid empty calendar", !empty.error && empty.events.length === 0);
console.log("RESULT pass=" + pass + " fail=" + fail);
if (fail) process.exitCode = 1;
