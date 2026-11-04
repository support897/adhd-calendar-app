/* Pace Planner: the fixed, explainable planning rules. No AI, no randomness.
   Same tasks + same energy level = same plan, every time.
   Rules (the "Pace Planning Law"): essentials never move; never fill every minute;
   changing energy never punishes; the user sees a preview and can undo. */
(function (root) {
"use strict";
var L = (typeof require !== "undefined" && typeof module !== "undefined" && module.exports) ? require("./logic.js") : root.CalmLogic;

var DEFAULTS = { workStart: "09:00", workEnd: "17:30", breakMin: 60, capacityPct: 72, maxPriorities: { low: 1, steady: 3, full: 4 }, levelFactor: { low: 0.4, steady: 1, full: 1.15 } };
function settingsOf(s) { var o = {}; for (var k in DEFAULTS) o[k] = DEFAULTS[k]; s = s || {}; for (var k2 in s) if (s[k2] != null && DEFAULTS.hasOwnProperty(k2) && typeof s[k2] !== "object") o[k2] = s[k2]; return o; }

function minutesOf(t, cal) { var base = +t.durationMin || 25; var f = cal && cal.factor ? cal.factor : 1; return Math.max(5, Math.round(base * f / 5) * 5); }

/* Learn from real finishing times: needs 3+ samples; says so, never silent. */
function calibration(tasks) {
  var r = [];
  (tasks || []).forEach(function (t) { if (t && t.actualMin > 0 && t.durationMin > 0) r.push(t.actualMin / t.durationMin); });
  if (r.length < 3) return { factor: 1, samples: r.length, suggest: null };
  r.sort(function (a, b) { return a - b; });
  var med = r[Math.floor(r.length / 2)];
  var f = Math.min(3, Math.max(0.7, med));
  var suggest = Math.abs(f - 1) >= 0.25 ? (f > 1 ? "Your tasks usually take about " + Math.round(f * 100 - 100) + "% longer than you guess. Want Pace to plan with that?" : "You finish faster than you guess. Want Pace to plan shorter?") : null;
  return { factor: Math.round(f * 100) / 100, samples: r.length, suggest: suggest };
}

function isEssential(t) { return !!(t.essential || t.source === "import" || (t.time && /appointment|doctor|dentist|flight|interview|exam/i.test(t.title || ""))); }
function isDeadlineToday(t, key) { return !!t.deadline && t.deadline <= key; }

function windowMin(s) { return Math.max(0, L.toMin(s.workEnd) - L.toMin(s.workStart)); }
/* Time really free: work window minus breaks minus timed appointments. */
function capacity(dayTasks, level, settings) {
  var s = settingsOf(settings);
  var win = windowMin(s);
  var timed = 0;
  (dayTasks || []).forEach(function (t) { if (t.time && t.status !== "done" && isEssential(t)) timed += +t.durationMin || 30; });
  var avail = Math.max(0, win - s.breakMin - timed);
  var usable = Math.round(avail * (s.capacityPct / 100) * (s.levelFactor[level] || 1) / 5) * 5;
  usable = Math.min(usable, Math.round(avail * 0.85 / 5) * 5); /* never fill every minute */
  return { window: win, availableMin: avail, usableMin: Math.max(0, usable), bookedMin: timed, pct: s.capacityPct };
}

function dayLoad(tasks, key, cal) {
  var m = 0;
  (tasks || []).forEach(function (t) { if (t.date === key && t.status !== "done" && !t.parkedFrom) m += minutesOf(t, cal); });
  return m;
}
function weekLoad(tasks, startKey, level, settings, cal) {
  var out = [];
  for (var i = 0; i < 7; i++) {
    var k = L.addDays(startKey, i);
    var dayT = (tasks || []).filter(function (t) { return t.date === k; });
    var cap = capacity(dayT, level || "steady", settings);
    var mins = dayLoad(tasks, k, cal);
    out.push({ key: k, minutes: mins, usableMin: cap.usableMin, pct: cap.usableMin ? Math.round(mins * 100 / cap.usableMin) : (mins ? 999 : 0), tooFull: mins > cap.usableMin && mins > 0, tasks: dayT.length });
  }
  return out;
}
function lightDays(tasks, fromKey, n, settings, cal, notBefore) {
  var best = [];
  for (var i = 1; i <= 14; i++) {
    var k = L.addDays(fromKey, i);
    if (notBefore && k < notBefore) continue;
    var dayT = (tasks || []).filter(function (t) { return t.date === k; });
    var cap = capacity(dayT, "steady", settings);
    best.push({ key: k, free: cap.usableMin - dayLoad(tasks, k, cal) });
  }
  return best.filter(function (d) { return d.free > 0; });
}

function nextAction(t) {
  if (!t) return null;
  if (t.steps && t.steps.length) for (var i = 0; i < t.steps.length; i++) if (!t.steps[i].done) return { text: t.steps[i].text, from: "step" };
  if (t.firstStep) return { text: t.firstStep, from: "first" };
  return { text: t.title, from: "title" };
}
function smallest(t) {
  if (!t) return null;
  if (t.minVersion) return t.minVersion;
  return "Just 5 minutes: " + t.title;
}

/* Build the day's plan. Returns a preview only. Nothing is changed. */
function planDay(tasks, level, opts) {
  opts = opts || {};
  level = level || "steady";
  var key = opts.key, s = settingsOf(opts.settings), cal = opts.calibration || { factor: 1 };
  var todays = (tasks || []).filter(function (t) { return t.date === key && t.status !== "done"; });
  var allDay = (tasks || []).filter(function (t) { return t.date === key; });
  var cap = capacity(allDay, level, s);
  var explain = [];
  var essential = [], deadlineNow = [], flexible = [], optional = [];
  todays.forEach(function (t) {
    if (isEssential(t)) essential.push(t);
    else if (isDeadlineToday(t, key)) deadlineNow.push(t);
    else if (t.optional) optional.push(t);
    else flexible.push(t);
  });
  function byValue(a, b) {
    return (b.priority || 0) - (a.priority || 0) || (a.deadline && !b.deadline ? -1 : b.deadline && !a.deadline ? 1 : 0) || ((a.deadline || "9") < (b.deadline || "9") ? -1 : (a.deadline || "9") > (b.deadline || "9") ? 1 : 0) || (a.time && !b.time ? -1 : b.time && !a.time ? 1 : 0) || minutesOf(a, cal) - minutesOf(b, cal) || String(a.id).localeCompare(String(b.id));
  }
  essential.sort(byValue); deadlineNow.sort(byValue); flexible.sort(byValue);
  var maxP = s.maxPriorities[level] || 3;
  var used = 0, priorities = [], quick = null, shrink = [], moves = [], conflicts = [], keep = [];
  /* Deadline-today work is never silently moved: it gets a clear choice. */
  deadlineNow.forEach(function (t) {
    priorities.push(t); used += level === "low" ? Math.min(minutesOf(t, cal), 15) : minutesOf(t, cal);
    conflicts.push({ id: t.id, title: t.title, reason: "This is due today.", options: ["Keep it scheduled", "Make it smaller", "Move something else to make space"] });
  });
  var pool = flexible.slice();
  var allowed = Math.max(0, maxP - priorities.length);
  for (var i = 0; i < pool.length && allowed > 0; i++) {
    var t = pool[i];
    var m = level === "low" ? Math.min(minutesOf(t, cal), 15) : minutesOf(t, cal);
    if (priorities.length && used + m > cap.usableMin && level !== "low") continue;
    priorities.push(t); used += m; allowed--; pool.splice(i, 1); i--;
    if (level === "low" && minutesOf(t, cal) > 15) shrink.push(t.id);
  }
  if (level === "low") {
    var q = pool.slice().sort(function (a, b) { return minutesOf(a, cal) - minutesOf(b, cal); }).filter(function (t) { return minutesOf(t, cal) <= 10; })[0];
    if (q) { quick = q; pool = pool.filter(function (x) { return x !== q; }); }
  }
  var spare = pool.concat(optional);
  if (level === "full") {
    /* Full day: add what still fits with room left over, never to the brim. */
    spare.slice().forEach(function (t) { var m2 = minutesOf(t, cal); if (used + m2 <= cap.usableMin) { keep.push(t); used += m2; spare = spare.filter(function (x) { return x !== t; }); } });
  } else if (level === "steady") {
    spare.slice().forEach(function (t) { var m3 = minutesOf(t, cal); if (used + m3 <= cap.usableMin && t.optional !== true) { keep.push(t); used += m3; spare = spare.filter(function (x) { return x !== t; }); } });
  }
  /* What is left moves, with a real day that has room. Essentials never appear here. */
  var roomDays = lightDays(tasks, key, spare.length, s, cal, null).map(function (d) { return { key: d.key, free: d.free }; });
  spare.forEach(function (t) {
    if (isEssential(t) || t.repeat || t.source === "import") { keep.push(t); return; }
    var m4 = minutesOf(t, cal);
    var dest = null;
    for (var d = 0; d < roomDays.length; d++) {
      if (t.deadline && roomDays[d].key > t.deadline) continue;
      if (roomDays[d].free >= m4) { dest = roomDays[d]; break; }
    }
    if (!dest) { for (var d2 = 0; d2 < roomDays.length; d2++) { if (!t.deadline || roomDays[d2].key <= t.deadline) { dest = roomDays[d2]; break; } } }
    if (dest) { dest.free -= m4; moves.push({ id: t.id, title: t.title, from: key, to: dest.key, minutes: m4, reason: level === "low" ? "A smaller day. This waits for a lighter one." : "Not enough room today. It has space here." }); }
    else keep.push(t);
  });
  var overloaded = used > cap.usableMin && level !== "low";
  if (essential.length) explain.push("Your " + (essential.length === 1 ? "commitment stays." : essential.length + " commitments stay.") + " Flexible work is arranged around " + (essential.length === 1 ? "it." : "them."));
  if (level === "low") explain.push("Low day: one priority, one small first step, and room to rest.");
  if (level === "steady") explain.push("Steady day: up to " + maxP + " priorities with breaks and buffer left free.");
  if (level === "full") explain.push("Full day: a bit more fits, but Pace still leaves " + (100 - s.capacityPct) + "% of your time open.");
  if (moves.length) explain.push(moves.length + (moves.length === 1 ? " thing moves" : " things move") + " to a day with room. You can undo it.");
  if (overloaded) explain.push("Today is still full. Pick what can wait.");
  return { key: key, level: level, essential: essential, deadlineNow: deadlineNow, priorities: priorities, quickWin: quick, keep: keep, shrink: shrink, moves: moves, conflicts: conflicts, capacity: cap, usedMin: used, overloaded: overloaded, explain: explain, calibration: cal };
}

/* Apply approved moves. Returns a snapshot that undo() restores exactly. */
function applyMoves(tasks, moves) {
  var snap = [];
  (moves || []).forEach(function (m) {
    var t = (tasks || []).filter(function (x) { return x.id === m.id; })[0];
    if (!t || isEssential(t) || t.status === "done") return; /* the law: essentials and finished work never move */
    snap.push({ id: t.id, date: t.date, time: t.time || null, movedFrom: t.movedFrom || null });
    t.movedFrom = t.date; t.date = m.to;
  });
  return snap;
}
function undoMoves(tasks, snap) {
  (snap || []).forEach(function (r) {
    var t = (tasks || []).filter(function (x) { return x.id === r.id; })[0];
    if (t) { t.date = r.date; t.time = r.time; if (r.movedFrom) t.movedFrom = r.movedFrom; else delete t.movedFrom; }
  });
}

/* Welcome-back plan after missed days: small, no pile-up, no guilt. */
function restartPlan(tasks, todayKey, settings) {
  var missed = (tasks || []).filter(function (t) { return t.status !== "done" && t.date < todayKey && !t.repeat && !isEssential(t); });
  var deadlines = missed.filter(function (t) { return t.deadline; });
  var pick = deadlines.concat(missed.filter(function (t) { return !t.deadline; })).slice(0, 1);
  var s = settingsOf(settings), cap = capacity([], "steady", s);
  var rest = missed.filter(function (t) { return pick.indexOf(t) === -1; });
  var days = lightDays((tasks || []).filter(function (t) { return t.date >= todayKey; }), todayKey, rest.length, s, null, null);
  var moves = [], di = 0, perDay = 0;
  rest.forEach(function (t) {
    var m = minutesOf(t);
    if (perDay >= 2) { di++; perDay = 0; }
    while (di < days.length && days[di].free < m) { di++; perDay = 0; }
    var d = days[di] || days[days.length - 1];
    if (!d) return;
    d.free -= m; perDay++;
    moves.push({ id: t.id, title: t.title, from: t.date, to: d.key, minutes: m, reason: "Spread out so today stays light." });
  });
  return { today: pick, moves: moves, message: missed.length ? "Welcome back. Nothing is lost. Today is one small thing; the rest is spread over the next days." : "Welcome back. You are all clear." };
}

/* Laws, checkable. Returns a list of broken laws (empty = all good). */
function lawCheck(before, after, plan) {
  var broken = [];
  before.forEach(function (b) {
    var a = after.filter(function (x) { return x.id === b.id; })[0];
    if (!a) broken.push("Law 1: task disappeared: " + b.title);
    else {
      if (isEssential(b) && a.date !== b.date) broken.push("Law 3: essential moved: " + b.title);
      if (b.status === "done" && a.status !== "done") broken.push("Law 2: completion lost: " + b.title);
      if (b.status !== "done" && a.status === "done") broken.push("Law 2: marked done without user: " + b.title);
      if ((b.notes || "") !== (a.notes || "")) broken.push("Law 1: notes changed: " + b.title);
    }
  });
  if (plan && plan.capacity && plan.usedMin > plan.capacity.availableMin) broken.push("Law 4: plan fills every minute");
  return broken;
}

var api = { DEFAULTS: DEFAULTS, settingsOf: settingsOf, capacity: capacity, calibration: calibration, planDay: planDay, applyMoves: applyMoves, undoMoves: undoMoves, weekLoad: weekLoad, lightDays: lightDays, nextAction: nextAction, smallest: smallest, restartPlan: restartPlan, lawCheck: lawCheck, minutesOf: minutesOf, isEssential: isEssential };
if (typeof module !== "undefined" && module.exports) module.exports = api;
root.PacePlanner = api;
})(typeof window !== "undefined" ? window : globalThis);
