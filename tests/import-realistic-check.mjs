// Realistic Google/Apple .ics import battery, generated in the OS temp folder.
// Run: TZ=Australia/Brisbane node tests/import-realistic-check.mjs
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
const require = createRequire(import.meta.url);
const CI = require("../calendar-import.js");
let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS", name); } else { fail++; console.log("FAIL", name); } };
const NOW = new Date("2026-10-14T10:00:00");
const base = name => fs.readFileSync(new URL("./fixtures/" + name, import.meta.url), "utf8");
const localKey = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const localClock = d => String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
const utcIsLocal = new Intl.DateTimeFormat("en-US", { timeZone: "UTC" }).resolvedOptions().timeZone === Intl.DateTimeFormat().resolvedOptions().timeZone;
const sydIsLocal = new Intl.DateTimeFormat("en-US", { timeZone: "Australia/Sydney" }).resolvedOptions().timeZone === Intl.DateTimeFormat().resolvedOptions().timeZone;
const z2 = n => String(n).padStart(2, "0");
const stampUTC = d => d.getUTCFullYear() + z2(d.getUTCMonth() + 1) + z2(d.getUTCDate()) + "T" + z2(d.getUTCHours()) + z2(d.getUTCMinutes()) + z2(d.getUTCSeconds()) + "Z";
const stampLocal = d => d.getUTCFullYear() + z2(d.getUTCMonth() + 1) + z2(d.getUTCDate()) + "T" + z2(d.getUTCHours()) + z2(d.getUTCMinutes()) + z2(d.getUTCSeconds());
const esc = s => String(s).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
const makeEvent = (uid, startLine, endLine, summary, extra = []) => [
  "BEGIN:VEVENT", ...(uid ? ["UID:" + uid] : []), "DTSTAMP:20261014T000000Z", startLine, endLine,
  "SUMMARY:" + esc(summary), ...extra, "END:VEVENT"
].join("\r\n");
const append = (calendar, events) => calendar.replace(/END:VCALENDAR\s*$/i, events.join("\r\n") + "\r\nEND:VCALENDAR\r\n");
const stampEvent = (prefix, timezone) => {
  const events = [];
  for (let i = 0; i < 1000; i++) {
    const moment = new Date(Date.UTC(2026, 9, 15 + (i % 360), 8 + (i % 15), (i * 7) % 60));
    const end = new Date(moment.getTime() + 30 * 60000);
    const startLine = timezone ? "DTSTART;TZID=" + timezone + ":" + stampLocal(moment) : "DTSTART:" + stampUTC(moment);
    const endLine = timezone ? "DTEND;TZID=" + timezone + ":" + stampLocal(end) : "DTEND:" + stampUTC(end);
    const title = i === 0 ? "Café, 東京 — Review 0000" : "Planning session " + String(i).padStart(4, "0");
    const extra = ["LOCATION:" + esc(i === 0 ? "Room 2; North" : "Meeting room"), "DESCRIPTION:" + esc("Exported appointment " + i + ", read-only copy")];
    if (i === 0) extra.push('ATTENDEE;CN="Zoë Müller";ROLE=REQ-PARTICIPANT:mailto:zoe@example.test', "BROKEN PROPERTY WITHOUT A COLON");
    events.push(makeEvent(prefix + "-event-" + String(i).padStart(4, "0") + "@example.test", startLine, endLine, title, extra));
  }
  return events;
};
const addSpecials = (isApple) => {
  const events = [];
  const zone = isApple ? "Australia/Sydney" : "";
  const zStart = (date, hour, minute) => isApple ? "DTSTART;TZID=" + zone + ":" + date + "T" + z2(hour) + z2(minute) + "00" : "DTSTART:" + date + "T" + z2(hour) + z2(minute) + "00Z";
  const zEnd = (date, hour, minute) => isApple ? "DTEND;TZID=" + zone + ":" + date + "T" + z2(hour) + z2(minute) + "00" : "DTEND:" + date + "T" + z2(hour) + z2(minute) + "00Z";
  events.push(makeEvent("weekly-zone@example.test", zStart("20261012", 9, 30), zEnd("20261012", 10, 0), "Weekly timezone meeting", ["RRULE:FREQ=WEEKLY;BYDAY=MO"]));
  events.push(makeEvent("floating-daily@example.test", "DTSTART:20261014T090000", "DTEND:20261014T093000", "Local floating daily series", ["RRULE:FREQ=DAILY"]));
  const rdateLine = isApple ? "RDATE;TZID=" + zone + ":20261019T100000,20261026T100000" : "RDATE:20261019T100000Z,20261026T100000Z";
  const exdateLine = isApple ? "EXDATE;TZID=" + zone + ":20261019T100000" : "EXDATE:20261019T100000Z";
  events.push(makeEvent("rdate-only@example.test", isApple ? "DTSTART;TZID=" + zone + ":20261012T100000" : "DTSTART:20261012T100000Z", isApple ? "DTEND;TZID=" + zone + ":20261012T103000" : "DTEND:20261012T103000Z", "RDATE-only event", [rdateLine, exdateLine]));
  events.push(makeEvent("cancelled-series@example.test", "DTSTART:20261012T090000", "DTEND:20261012T093000", "Series with a cancelled day", ["RRULE:FREQ=DAILY;COUNT=5"]));
  events.push(["BEGIN:VEVENT", "UID:cancelled-series@example.test", "RECURRENCE-ID:20261014T090000", "STATUS:CANCELLED", "END:VEVENT"].join("\r\n"));
  events.push(makeEvent("all-day-three@example.test", "DTSTART;VALUE=DATE:20261020", "DTEND;VALUE=DATE:20261023", "Three day conference", ["ATTENDEE;CN=Team:mailto:team@example.test"]));
  events.push(makeEvent("all-day-daily@example.test", "DTSTART;VALUE=DATE:20261028", "DTEND;VALUE=DATE:20261029", "Four day family leave", ["RRULE:FREQ=DAILY;COUNT=4"]));
  events.push(makeEvent("final-window-day@example.test", "DTSTART:20271014T191500", "DTEND:20271014T194500", "Appointment on final import day"));
  events.push(makeEvent(null, zStart("20261018", 11, 0), zEnd("20261018", 11, 30), "Same no-UID appointment"));
  events.push(makeEvent(null, zStart("20261018", 11, 0), zEnd("20261018", 11, 30), "Same no-UID appointment"));
  events.push(["BEGIN:VEVENT", "UID:cancelled@example.test", "DTSTAMP:20261014T000000Z", "DTSTART:20261020T110000Z", "DTEND:20261020T120000Z", "SUMMARY:Cancelled appointment", "STATUS:CANCELLED", "END:VEVENT"].join("\r\n"));
  events.push(["BEGIN:VEVENT", "UID:missing-date@example.test", "DTSTAMP:20261014T000000Z", "SUMMARY:No start date", "END:VEVENT"].join("\r\n"));
  events.push(makeEvent("bad-date@example.test", "DTSTART:NOT-A-DATE", "DTEND:NOT-A-DATE", "Bad date record"));
  if (isApple) {
    events.push(makeEvent("old-daily-sydney@example.test", "DTSTART;TZID=Australia/Sydney:20100101T083000", "DTEND;TZID=Australia/Sydney:20100101T090000", "Long-running Sydney daily series", ["RRULE:FREQ=DAILY"]));
    events.push(makeEvent("window-overlap@example.test", "DTSTART;VALUE=DATE:20260910", "DTEND;VALUE=DATE:20260918", "All-day event overlaps the import window"));
  } else {
    events.push(makeEvent("window-overlap@example.test", "DTSTART;VALUE=DATE:20260910", "DTEND;VALUE=DATE:20260918", "All-day event overlaps the import window"));
  }
  return events;
};
const toTask = s => ({ title: s.title, date: s.date, time: s.time, durationMin: s.durationMin, allDay: s.allDay, repeat: s.repeat, importUid: s.importUid, importKey: s.importKey });
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "pace-ics-"));
try {
  const googleICS = append(base("google.ics"), [...stampEvent("google", ""), ...addSpecials(false)]);
  const appleICS = append(base("apple.ics"), [...stampEvent("apple", "Australia/Sydney"), ...addSpecials(true)]);
  const googlePath = path.join(scratch, "Google-Calendar-export.ics");
  const applePath = path.join(scratch, "Apple-Calendar-export.ics");
  fs.writeFileSync(googlePath, googleICS, "utf8");
  fs.writeFileSync(applePath, appleICS, "utf8");
  const g = CI.parseICS(fs.readFileSync(googlePath, "utf8"));
  const a = CI.parseICS(fs.readFileSync(applePath, "utf8"));
  check("Google export is a real file with over 1,000 events", fs.statSync(googlePath).size > 100000 && g.events.length > 1000);
  check("Apple export is a real file with over 1,000 events", fs.statSync(applePath).size > 100000 && a.events.length > 1000);
  const gp = CI.planImport(g, [], { now: NOW, sourceLabel: "Google Calendar" });
  const ap = CI.planImport(a, [], { now: NOW, sourceLabel: "Apple / iCloud" });
  check("1,000 Google appointments import inside the supported date window", gp.add.filter(e => /^google-event-/.test(e.importUid)).length === 1000);
  check("1,000 Apple appointments import inside the supported date window", ap.add.filter(e => /^apple-event-/.test(e.importUid)).length === 1000);
  check("malformed property line is ignored and counted without losing its event", g.malformedLines === 1 && g.events.some(e => e.title === "Café, 東京 — Review 0000"));
  check("UTF-8 event titles survive parsing", g.events.some(e => e.title === "Café, 東京 — Review 0000") && a.events.some(e => e.title === "Café, 東京 — Review 0000"));
  check("attendee properties do not break imports or leak into task fields", !!g.events.find(e => e.title === "Café, 東京 — Review 0000") && !gp.add.find(e => e.title === "Café, 東京 — Review 0000").attendees);
  check("missing and invalid start dates are counted, not imported", g.skippedEvents >= 2 && !gp.add.some(e => e.title === "No start date" || e.title === "Bad date record"));
  check("cancelled events are ignored and counted", g.cancelledEvents === 2 && !gp.add.some(e => e.title === "Cancelled appointment"));
  const cancelledSeries = gp.add.filter(e => e.importUid === "cancelled-series@example.test");
  check("a cancelled recurrence override removes only its original slot", cancelledSeries.length === 4 && !cancelledSeries.some(e => e.date === "2026-10-14"));
  const rdateOnly = gp.add.filter(e => e.importUid === "rdate-only@example.test");
  check("RDATE-only events keep DTSTART, include extra dates, and honor EXDATE", rdateOnly.length === 2 && rdateOnly.every(e => !e.repeat));
  const googleName = gp.add.find(e => e.title === "Café, 東京 — Review 0000");
  const googleSource = g.events.find(e => e.title === "Café, 東京 — Review 0000").start.toJSDate();
  check("Google UTC event uses the device-local date and time", googleName.date === localKey(googleSource) && googleName.time === localClock(googleSource));
  const appleName = ap.add.find(e => e.title === "Café, 東京 — Review 0000");
  const appleSource = a.events.find(e => e.title === "Café, 東京 — Review 0000").start.toJSDate();
  check("Apple VTIMEZONE event uses the device-local date and time", appleName.date === localKey(appleSource) && appleName.time === localClock(appleSource));
  const allDay = gp.add.filter(e => e.importUid === "all-day-three@example.test");
  check("multi-day all-day event lands on all three dates with no time", allDay.length === 3 && allDay.every(e => e.time === null && e.allDay === true) && allDay.map(e => e.date).join(",") === "2026-10-20,2026-10-21,2026-10-22");
  const allDayRepeat = gp.add.filter(e => e.importUid === "all-day-daily@example.test");
  check("counted all-day recurrence expands to four date-only entries", allDayRepeat.length === 4 && allDayRepeat.every(e => e.time === null && e.allDay === true));
  const weeklyZone = gp.add.filter(e => e.importUid === "weekly-zone@example.test");
  check("UTC weekly RRULE stays live only on a UTC device", utcIsLocal ? weeklyZone.length === 1 && !!weeklyZone[0].repeat : weeklyZone.length > 40 && weeklyZone.every(e => !e.repeat));
  const localRepeat = gp.add.filter(e => e.importUid === "floating-daily@example.test");
  check("floating local-time RRULE maps to a live daily repeat", localRepeat.length === 1 && localRepeat[0].repeat === "every day");
  const oldDaily = ap.add.filter(e => e.importUid === "old-daily-sydney@example.test");
  check("old timezone recurrence reaches the window instead of stopping at 600 occurrences", sydIsLocal ? oldDaily.length === 1 && !!oldDaily[0].repeat : oldDaily.length > 300 && oldDaily.every(e => !e.repeat));
  const overlap = ap.add.filter(e => e.importUid === "window-overlap@example.test");
  check("multi-day all-day event that began before the window is clipped into it", overlap.length === 4 && overlap[0].date === "2026-09-14" && overlap[3].date === "2026-09-17");
  check("the full final day of the 12-month window is included", gp.add.some(e => e.importUid === "final-window-day@example.test" && e.date === "2027-10-14"));
  const noUid = gp.add.filter(e => e.title === "Same no-UID appointment");
  check("identical events without UID get a stable fallback and do not double", noUid.length === 1 && gp.dupes >= 1);
  check("import summaries expose malformed, skipped, and cancelled counts", gp.malformedLines === 1 && gp.skipped.length >= 2 && gp.cancelled === 2);

  const existing = gp.add.map(toTask);
  const replay = CI.planImport(g, existing, { now: NOW, sourceLabel: "a calendar file" });
  check("same Google export re-imported under a different label adds nothing", replay.add.length === 0 && replay.dupes === gp.add.length + gp.dupes);
  const added = makeEvent("new-event@example.test", "DTSTART:20261101T120000Z", "DTEND:20261101T123000Z", "One new appointment");
  const updated = CI.parseICS(append(googleICS, [added]));
  const updatePlan = CI.planImport(updated, existing, { now: NOW, sourceLabel: "a calendar file" });
  check("updated export imports only its new event without duplicating old events", updatePlan.add.length === 1 && updatePlan.add[0].title === "One new appointment" && updatePlan.importKey === gp.importKey);
  const state = { tasks: [], imports: [] };
  const applied = CI.applyImport(state, gp, "Google Calendar", toTask);
  const replayApplied = CI.applyImport(state, replay, "a calendar file", toTask);
  check("apply writes one per-calendar registry row and never adds dupes on replay", applied.added === gp.add.length && replayApplied.added === 0 && state.imports.length === 1 && state.imports[0].count === gp.add.length);
  check("apply result returns counts for the import summary", applied.malformedLines === 1 && applied.skipped === gp.skipped.length && applied.cancelled === gp.cancelled && applied.expanded > 0);
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
console.log("RESULT pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
