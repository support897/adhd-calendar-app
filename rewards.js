/* Pace Rewards: kind motivation that never guilts.
   Points ("sparks") for real finished work only, once per task per day.
   Streaks forgive: rest days and Low days protect them, missed days never wipe wins.
   Pure functions over state.rewards; the UI decides how to show them. */
(function (root) {
"use strict";
var L = (typeof require !== "undefined" && typeof module !== "undefined" && module.exports) ? require("./logic.js") : root.CalmLogic;

var LEVELS = [
  { at: 0, name: "Seed", line: "Every big thing starts small." },
  { at: 30, name: "Sprout", line: "You are growing." },
  { at: 90, name: "Sapling", line: "Steady roots." },
  { at: 200, name: "Bloom", line: "Look at you go." },
  { at: 400, name: "Grove", line: "A whole garden of wins." },
  { at: 750, name: "Forest", line: "Strong and calm." },
  { at: 1300, name: "Lighthouse", line: "You light the way for yourself." }
];
var BADGES = {
  first: { name: "First win", desc: "Finished your first thing." },
  five: { name: "Five wins", desc: "Five things done." },
  twentyfive: { name: "Twenty-five wins", desc: "Twenty-five things done." },
  streak3: { name: "Three days in a row", desc: "Three days with a win." },
  streak7: { name: "A whole week", desc: "Seven days with a win." },
  low: { name: "Gentle day hero", desc: "Did something on a Low day. That counts double." },
  comeback: { name: "Welcome back", desc: "Came back after a break. Nothing was lost." },
  early: { name: "Early start", desc: "Finished something before 9am." },
  juggler: { name: "Goal juggler", desc: "Moved three goals forward in one week." },
  braindump: { name: "Brain dump", desc: "Captured ten things from your head." },
  smallest: { name: "Tiny step, real step", desc: "Did the smallest version of a task." },
  goalHalf: { name: "Halfway there", desc: "A goal reached 50%." },
  goalDone: { name: "Goal complete", desc: "Finished a whole goal." }
};
var CHEERS = ["That counts.", "Nice. One more thing off your mind.", "You did it.", "Look how far you have come.", "Small steps add up.", "Done. Take a breath.", "Well done. You showed up.", "That was real progress."];
var LOW_CHEERS = ["On a Low day, this is a big deal.", "You did something on a gentle day. That counts double.", "Slow is still moving."];

function R(state) { if (!state.rewards || typeof state.rewards !== "object") state.rewards = {}; var r = state.rewards; if (!r.log) r.log = []; if (!r.badges) r.badges = {}; if (typeof r.xp !== "number") r.xp = 0; if (!r.captured) r.captured = 0; if (!r.rest) r.rest = {}; return r; }

function sparksFor(task, ctx) {
  ctx = ctx || {};
  var m = +task.durationMin || 25;
  var x = m <= 10 ? 5 : m <= 30 ? 10 : m <= 60 ? 15 : 20;
  if (task.essential) x += 5;
  if (task.deadline) x += 3;
  if (task.goalId) x += 5;
  if (ctx.level === "low") x *= 2;
  return x;
}
function levelOf(xp) {
  var i = 0; for (var j = 0; j < LEVELS.length; j++) if (xp >= LEVELS[j].at) i = j;
  var cur = LEVELS[i], nxt = LEVELS[i + 1] || null;
  return { index: i, name: cur.name, line: cur.line, xp: xp, next: nxt ? nxt.at : null, toNext: nxt ? nxt.at - xp : 0, pct: nxt ? Math.round((xp - cur.at) * 100 / (nxt.at - cur.at)) : 100 };
}
function pick(arr, seed) { var h = 0; String(seed).split("").forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) | 0; }); return arr[Math.abs(h) % arr.length]; }

function winDays(state) { var d = {}; R(state).log.forEach(function (e) { d[e.key] = true; }); return d; }
function protectedDays(state) { var d = {}, r = R(state); Object.keys(r.rest).forEach(function (k) { d[k] = true; }); Object.keys(state.feelings || {}).forEach(function (k) { if (state.feelings[k] === "low") d[k] = true; }); return d; }

/* Gentle streak: counts back from today (or yesterday if today is not done yet).
   A day with a win counts; a Low or rest day holds the streak without adding to it;
   ONE ordinary missed day is forgiven per run ("grace"). More than that ends the run, never the total. */
function streak(state, today) {
  var wins = winDays(state), prot = protectedDays(state);
  var k = wins[today] ? today : L.addDays(today, -1);
  var run = 0, grace = 1, usedGrace = false, pending = false, guard = 0;
  while (guard++ < 800) {
    if (wins[k]) { run++; if (pending) { usedGrace = true; pending = false; } }
    else if (prot[k]) { /* held, not counted */ }
    else if (grace > 0 && run > 0) { grace--; pending = true; }
    else break;
    k = L.addDays(k, -1);
  }
  var best = bestStreak(state);
  return { current: run, best: Math.max(best, run), graceUsed: usedGrace, doneToday: !!wins[today] };
}
function bestStreak(state) {
  var wins = Object.keys(winDays(state)).sort(), best = 0, run = 0, prev = null;
  wins.forEach(function (k) { if (prev && L.addDays(prev, 1) === k) run++; else run = 1; best = Math.max(best, run); prev = k; });
  return best;
}

/* Record a real finish. Idempotent per (task, day). Returns what to celebrate. */
function award(state, task, key, ctx) {
  ctx = ctx || {};
  var r = R(state);
  var id = task.id + "@" + key;
  if (r.log.some(function (e) { return e.id === id; })) return { duplicate: true, sparks: 0 };
  var sparks = sparksFor(task, ctx);
  var before = levelOf(r.xp), beforeStreak = streak(state, key).current;
  var daysAway = lastWinGap(state, key);
  r.log.push({ id: id, taskId: task.id, key: key, xp: sparks, goalId: task.goalId || null, low: ctx.level === "low", small: !!ctx.small, at: ctx.nowMin != null ? ctx.nowMin : null, title: String(task.title || "").slice(0, 60) });
  r.xp += sparks;
  var after = levelOf(r.xp);
  var newBadges = [];
  function give(b) { if (!r.badges[b]) { r.badges[b] = key; newBadges.push(b); } }
  var count = r.log.length;
  if (count >= 1) give("first"); if (count >= 5) give("five"); if (count >= 25) give("twentyfive");
  var st = streak(state, key);
  if (st.current >= 3) give("streak3"); if (st.current >= 7) give("streak7");
  if (ctx.level === "low") give("low");
  if (daysAway >= 3) give("comeback");
  if (ctx.nowMin != null && ctx.nowMin < 540) give("early");
  if (ctx.small) give("smallest");
  var wk = weekGoalsTouched(state, key); if (wk >= 3) give("juggler");
  if (ctx.goalPct != null) { if (ctx.goalPct >= 100) give("goalDone"); else if (ctx.goalPct >= 50) give("goalHalf"); }
  var msg = ctx.level === "low" ? pick(LOW_CHEERS, id) : pick(CHEERS, id);
  if (daysAway >= 3) msg = "Welcome back. That win counts, and nothing was lost.";
  if (after.index > before.index) msg = (daysAway >= 3 ? msg + " " : "") + "Level up: you are now a " + after.name + ". " + after.line;
  return { duplicate: false, sparks: sparks, message: msg, levelUp: after.index > before.index ? after : null, badges: newBadges.map(function (b) { return { id: b, name: BADGES[b].name, desc: BADGES[b].desc }; }), streak: st.current, confetti: after.index > before.index || newBadges.length > 0 };
}
/* Un-ticking takes the sparks back honestly (no free points from tick-untick loops). */
function revoke(state, task, key) {
  var r = R(state), id = task.id + "@" + key;
  var i = -1; r.log.forEach(function (e, n) { if (e.id === id) i = n; });
  if (i === -1) return 0;
  var x = r.log[i].xp; r.log.splice(i, 1); r.xp = Math.max(0, r.xp - x); return x;
}
function lastWinGap(state, key) {
  var days = Object.keys(winDays(state)).filter(function (k) { return k < key; }).sort();
  if (!days.length) return 0;
  return Math.round((L.parseKey(key) - L.parseKey(days[days.length - 1])) / 86400000);
}
function weekGoalsTouched(state, key) {
  var from = L.addDays(key, -6), g = {};
  R(state).log.forEach(function (e) { if (e.goalId && e.key >= from && e.key <= key) g[e.goalId] = 1; });
  return Object.keys(g).length;
}
function noteCaptured(state, n) { var r = R(state); var before = r.captured; r.captured += n; if (before < 10 && r.captured >= 10 && !r.badges.braindump) { r.badges.braindump = L.todayKey(); return BADGES.braindump; } return null; }
function markRest(state, key) { R(state).rest[key] = true; }

/* Per-goal momentum so many goals stay visible, each with ONE next step. */
function goalMomentum(goal, tasks, today, rewardsLog) {
  var mine = (tasks || []).filter(function (t) { return t.goalId === goal.id; });
  var done = mine.filter(function (t) { return t.status === "done"; }).length;
  var open = mine.filter(function (t) { return t.status !== "done"; }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  var weekAgo = L.addDays(today, -6);
  var winsThisWeek = (rewardsLog || []).filter(function (e) { return e.goalId === goal.id && e.key >= weekAgo; }).length;
  var remainingMin = open.reduce(function (a, t) { return a + (+t.durationMin || 25); }, 0);
  var next = open.filter(function (t) { return t.date >= today; })[0] || open[0] || null;
  return { goalId: goal.id, total: mine.length, done: done, pct: mine.length ? Math.round(done * 100 / mine.length) : 0, next: next, remainingMin: remainingMin, winsThisWeek: winsThisWeek, stale: !winsThisWeek && open.length > 0, complete: mine.length > 0 && !open.length };
}
function weekSummary(state, today) {
  var from = L.addDays(today, -6), r = R(state), wins = r.log.filter(function (e) { return e.key >= from && e.key <= today; });
  var goals = {}; wins.forEach(function (e) { if (e.goalId) goals[e.goalId] = 1; });
  var days = {}; wins.forEach(function (e) { days[e.key] = 1; });
  return { wins: wins.length, sparks: wins.reduce(function (a, e) { return a + e.xp; }, 0), goalsMoved: Object.keys(goals).length, activeDays: Object.keys(days).length };
}
function snapshot(state, today) {
  var r = R(state);
  return { level: levelOf(r.xp), streak: streak(state, today), week: weekSummary(state, today), badges: Object.keys(r.badges).map(function (b) { return { id: b, name: BADGES[b] && BADGES[b].name, desc: BADGES[b] && BADGES[b].desc, on: r.badges[b] }; }), allBadges: BADGES, total: r.log.length };
}

var api = { LEVELS: LEVELS, BADGES: BADGES, sparksFor: sparksFor, levelOf: levelOf, streak: streak, award: award, revoke: revoke, goalMomentum: goalMomentum, weekSummary: weekSummary, snapshot: snapshot, noteCaptured: noteCaptured, markRest: markRest, lastWinGap: lastWinGap };
if (typeof module !== "undefined" && module.exports) module.exports = api;
root.PaceRewards = api;
})(typeof window !== "undefined" ? window : globalThis);
