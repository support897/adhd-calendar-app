import { createRequire } from "module";
const require = createRequire(import.meta.url);
const L = require("../logic.js");
let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } }
const B = "2026-10-12"; // a Monday

check("toKey pads", L.toKey(new Date(2026, 0, 5)) === "2026-01-05");
check("addDays crosses month", L.addDays("2026-10-31", 1) === "2026-11-01");
check("nudge maths 09:00 minus 5 = 08:55", L.nudgeTime({ time: "09:00" }, 5) === "08:55");
check("nudge maths custom setup", L.nudgeTime({ time: "14:30" }, 15) === "14:15");
check("nudge untimed is null", L.nudgeTime({ time: null }, 5) === null);

const p1 = L.parseItem("Call the dentist tomorrow at 3pm", B);
check("parse dentist date tomorrow", p1 && p1.date === "2026-10-13");
check("parse dentist time 15:00", p1 && p1.time === "15:00");
check("parse dentist title clean", p1 && p1.title === "Call the dentist");
check("parse dentist essential (keyword)", p1 && p1.essential === true);
const p2 = L.parseItem("remind me to pay the rent on friday!!!", B);
check("parse rent friday", p2 && p2.date === "2026-10-16");
check("parse rent priority 3 from !!!", p2 && p2.priority === 3);
check("parse rent starter stripped", p2 && /pay the rent/i.test(p2.title));
const p3 = L.parseItem("water the plants every weekday", B);
check("parse repeat weekday", p3 && p3.repeat === "every weekday");
const p4 = L.parseItem("buy milk", B);
check("parse plain item defaults today", p4 && p4.date === B && p4.time === null);
check("parse plain item gets a duration", p4 && p4.durationMin > 0);
const p5 = L.parseItem("team meeting next monday at 10:30am for 1 hour", B);
check("parse next monday a week on", p5 && p5.date === "2026-10-19");
check("parse duration 60", p5 && p5.durationMin === 60);
const p6 = L.parseItem("flight to Sydney on 25/12 at 6am", B);
check("parse AU date 25/12", p6 && p6.date === "2026-12-25");
check("parse 6am", p6 && p6.time === "06:00");
const dump = L.parseDump("email the client about the quote\nclean the kitchen\ncall mum tomorrow at 5pm", B);
check("dump splits 3 lines into 3 tasks", dump.length === 3);
const dump2 = L.parseDump("Need to book the car service and then pick up the dry cleaning", B);
check("dump splits and-then chain", dump2.length === 2);
check("big task gets starter steps", L.decompose("Clean the whole house", 60).length === 3);
check("small task needs no steps", L.decompose("Buy milk", 10).length === 0);
check("category money", L.categoryFor("Pay the electricity bill").id === "money");
check("category home", L.categoryFor("Clean the kitchen").id === "home");

function task(title, extra) { return Object.assign({ title: title, date: B, time: null, durationMin: 25, priority: 0, essential: false, status: "todo", steps: [] }, extra || {}); }
const dayTasks = [
  task("Doctor appointment", { essential: true, time: "10:00", minVersion: "Ring the doctor to rebook" }),
  task("Reply to one email", { durationMin: 10 }),
  task("Clean the whole house", { durationMin: 90 }),
  task("Plan the trip", { durationMin: 60 }),
  task("Pay the rent", { essential: true, priority: 3 }),
  task("Read a chapter", { durationMin: 20 }),
  task("Sort the garage", { durationMin: 80 }),
  task("Book flights", { durationMin: 30 })
];
const low = L.adaptDay(dayTasks, "low");
check("low day shows essentials plus one tiny", low.visible.length >= 2 && low.visible.length <= 4);
check("low day parks the big jobs", low.parked.some(t => t.title === "Clean the whole house") && low.parked.some(t => t.title === "Sort the garage"));
check("low day keeps essentials visible", low.visible.some(t => t.title === "Pay the rent"));
check("low day shrinks task with a min version", low.visible.some(t => t.shrunk && t.displayTitle === "Ring the doctor to rebook"));
const taughtLow = L.adaptDay(dayTasks.concat([task("Water the plants", { minVersion: "Just the kitchen plants" })]), "low");
check("low day keeps a taught-minimum task visible, shrunk", taughtLow.visible.some(t => t.shrunk && t.displayTitle === "Just the kitchen plants"));
const steady = L.adaptDay(dayTasks, "steady");
check("steady day caps at 6", steady.visible.length === 6 && steady.parked.length === 2);
const full = L.adaptDay(dayTasks, "full", [task("Tomorrow thing", { date: "2026-10-13" })]);
check("full day shows everything", full.visible.length === 8 && full.parked.length === 0);
check("full day offers a stretch from tomorrow", !!full.stretch);
const withDone = dayTasks.concat([task("Finished one", { status: "done" })]);
const sc = L.dayScore(L.adaptDay(withDone, "steady"));
check("score counts against adapted plan", sc.done === 1 && sc.total === 7);
check("no shame words anywhere in logic outputs", JSON.stringify([low, steady, full]).toLowerCase().indexOf("overdue") === -1 && JSON.stringify([low, steady]).toLowerCase().indexOf("failed") === -1);
check("digest names the quickest", /Reply to one email/.test(L.digestText(steady.visible)));
check("nextStep returns first undone step", L.nextStepText({ title: "X", steps: [{ text: "a", done: true }, { text: "b", done: false }] }) === "b");

/* ---------- streakInfo (Habits) ---------- */
const today = L.todayKey();
const d = (n) => L.addDays(today, n);
check("streak: empty days, no run, week all undone", (() => { const s = L.streakInfo({}, today); return s.current === 0 && s.last7.length === 7 && s.last7.every(x => !x.done) && s.last7[6].key === today; })());
check("streak: today only is a run of 1", L.streakInfo({ [today]: true }, today).current === 1);
check("streak: 3 back from today", L.streakInfo({ [today]: true, [d(-1)]: true, [d(-2)]: true }, today).current === 3);
check("streak: gap yesterday stops the count even with older days", L.streakInfo({ [today]: true, [d(-2)]: true, [d(-3)]: true }, today).current === 1);
check("streak: unticked today keeps yesterday's run alive", L.streakInfo({ [d(-1)]: true, [d(-2)]: true }, today).current === 2);
check("streak: last7 flags the right days", (() => { const s = L.streakInfo({ [d(-6)]: true, [today]: true }, today); return s.last7[0].done === true && s.last7[5].done === false && s.last7[6].done === true; })());
check("12 habit icons on the list", L.HABIT_ICONS.length === 12);

console.log("RESULT pass=" + pass + " fail=" + fail);
if (fail) process.exit(1);
