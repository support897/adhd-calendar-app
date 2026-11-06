/* Pace UI: the "calendar that thinks like you" layer.
   Today plan (preview + undo), Talk to it review (Captured inbox), Goal Path for many goals,
   kind rewards, Quiet mode. All offline rules: no AI service anywhere.
   Uses PaceCtx (app.js), PaceBrain, PacePlanner, PaceRewards, PaceGoals. */
(function () {
"use strict";
var C = window.PaceCtx, L = window.CalmLogic, B = window.PaceBrain, P = window.PacePlanner, R = window.PaceRewards, G = window.PaceGoals;
var tr = window.t || function (s, v) { return v ? String(s).replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }) : s; };
if (!C || !B || !P || !R) return;
function $(id) { return document.getElementById(id); }
function S() { return C.state; }
function esc(s) { return C.esc(s); }
function el(tag, cls, text, attrs) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); }); return n; }

/* PaceTime: picking a time is one tap on a chip. The native time box stays
   as "Other", so nothing is ever blocked. Used in Settings and on review cards. */
function fmtClock(v) { var m = /^(\d{1,2}):(\d\d)/.exec(v || ""); if (!m) return ""; var h = +m[1], ap = h >= 12 ? "pm" : "am"; h = h % 12 || 12; return h + (m[2] === "00" ? "" : ":" + m[2]) + ap; }
function timeChips(input, presets, onPick) {
  if (!input || input.getAttribute("data-chips")) return null;
  input.setAttribute("data-chips", "1");
  var row = el("div", "time-chips", null, { role: "group", "aria-label": input.getAttribute("aria-label") || tr("Time") });
  function paint() { Array.prototype.forEach.call(row.querySelectorAll("button[data-t]"), function (b) { var on = b.getAttribute("data-t") === input.value; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on)); }); }
  presets.forEach(function (t) {
    var b = el("button", "time-chip", fmtClock(t), { type: "button", "data-t": t });
    b.addEventListener("click", function () { input.value = t; input.dispatchEvent(new Event("input", { bubbles: true })); input.dispatchEvent(new Event("change", { bubbles: true })); if (onPick) onPick(t); paint(); });
    row.appendChild(b);
  });
  input.addEventListener("change", paint); input.addEventListener("input", paint);
  input.parentNode.insertBefore(row, input);
  paint();
  return row;
}
function nowMin() { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
function today() { return L.todayKey(); }
function niceDate(k) { try { return L.parseKey(k).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }); } catch (e) { return k; } }
function quiet() { return !!(S().settings && S().settings.quiet); }
function ensure() {
  var s = S();
  if (!Array.isArray(s.captured)) s.captured = [];
  if (!s.settings.plan || typeof s.settings.plan !== "object") s.settings.plan = {};
  R.snapshot(s, today()); /* makes s.rewards exist */
  if (s.rewards.log.length > 1500) s.rewards.log = s.rewards.log.slice(-1500); /* keeps the saved profile small; xp and badges are stored separately */
  return s;
}
function planSettings() { var p = ensure().settings.plan; return { workStart: p.workStart || "09:00", workEnd: p.workEnd || "17:30", capacityPct: 100 - (+p.open || 28), breakMin: 60 }; }
function calib() { var s = ensure(); var c = P.calibration(s.tasks); return s.settings.plan.learn ? c : { factor: 1, samples: c.samples, suggest: c.suggest }; }
function addDays(k, n) { return L.addDays(k, n); }
function tasksOn(key) { return S().tasks.filter(function (t) { return t.date === key; }); }
function realTasksFor(key) { return S().tasks.filter(function (t) { return !t.repeat && t.date === key; }); }
/* Repeating tasks occur on days without a stored copy; plan over the plain, one-off tasks and treat repeats as keepers. */
function planFor(key) {
  var level = C.levelFor(key);
  var tasks = S().tasks.filter(function (t) { return !t.repeat && !(t.skipDates && t.skipDates.length && false); });
  return P.planDay(tasks, level, { key: key, settings: planSettings(), calibration: calib() });
}
function findTask(id) { return S().tasks.filter(function (t) { return t.id === id; })[0]; }

/* ============ celebration + toasts ============ */
function celebrate(res) {
  if (!res || res.duplicate) return;
  var msg = res.message + (res.sparks ? " +" + res.sparks : "");
  if (quiet()) { C.toast(res.message); return; }
  var box = $("paceCelebrate");
  if (!box) { box = el("div", "pace-celebrate", null, { id: "paceCelebrate", role: "status", "aria-live": "polite" }); document.body.appendChild(box); }
  var badgeHtml = (res.badges || []).map(function (b) { return '<div class="pcb-badge">' + esc(b.name) + "</div>"; }).join("");
  box.innerHTML = '<div class="pcb-card"><div class="pcb-art">' + C.skipSvg("celebrate") + '</div><div class="pcb-msg">' + esc(msg) + "</div>" + badgeHtml + '<button type="button" class="soft-btn pcb-ok">' + esc(tr("Thanks")) + "</button></div>";
  if (res.confetti && !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    var cf = el("div", "pcb-confetti"); for (var i = 0; i < 18; i++) { var sp = el("span"); sp.style.left = (5 + i * 5) + "%"; sp.style.animationDelay = (i % 6) * 0.08 + "s"; sp.style.background = ["#5b6bd5", "#f0a868", "#35704e", "#8b99e4"][i % 4]; cf.appendChild(sp); }
    box.appendChild(cf);
  }
  box.hidden = false; box.classList.add("is-on");
  var off = function () { box.classList.remove("is-on"); box.hidden = true; };
  box.querySelector(".pcb-ok").addEventListener("click", off);
  clearTimeout(celebrate._t); celebrate._t = setTimeout(off, res.confetti ? 4200 : 2600);
}

/* ============ rewards hook (called from toggleDone) ============ */
function onToggle(t, dateKey) {
  var s = ensure();
  var isDone = t.repeat ? (t.doneDates || []).indexOf(dateKey) !== -1 : t.status === "done";
  if (isDone) {
    var level = C.levelFor(dateKey);
    var goalPct = null;
    if (t.goalId && G) {
      var g = (s.goals || []).filter(function (x) { return x.id === t.goalId; })[0];
      if (g) goalPct = G.goalProgress(g, s.tasks, today()).pct;
    }
    var small = !!(t.minVersion && level === "low" && !t.essential);
    var res = R.award(s, t, dateKey, { level: level, nowMin: nowMin(), goalPct: goalPct, small: small });
    if (!t.repeat) t.doneOn = dateKey;
    markCapturedDone(t);
    setTimeout(function () { celebrate(res); renderChip(); }, 60);
  } else {
    R.revoke(s, t, dateKey);
    if (!t.repeat) delete t.doneOn;
  }
}
function markCapturedDone(t) {
  if (!t.captureId) return;
  var cap = ensure().captured.filter(function (c) { return c.id === t.captureId; })[0];
  if (cap && cap.taskIds) { var all = cap.taskIds.every(function (id) { var x = findTask(id); return !x || x.status === "done"; }); if (all && cap.status === "tasks") cap.allDone = true; }
}

/* ============ Today plan card ============ */
function energyName(level) { var n = S().settings.names || {}; return n[level] || level; }
function fmtMin(m) { return m >= 60 ? (Math.floor(m / 60) + "h" + (m % 60 ? " " + (m % 60) + "m" : "")) : m + " min"; }

function renderToday() {
  var root = $("paceToday"); if (!root) return;
  var s = ensure(), key = C.selected, level = C.levelFor(key);
  var plan = planFor(key);
  root.innerHTML = "";
  var hasAny = S().tasks.some(function (t) { return t.date === key || t.repeat; });
  var card = el("div", "pt-card" + (quiet() ? " is-quiet" : ""), null, { "data-level": level });
  var head = el("div", "pt-head");
  head.appendChild(el("div", "pt-title", key === today() ? tr("Your day") : tr("This day") + " · " + niceDate(key)));
  var lv = el("span", "pt-level", energyName(level)); head.appendChild(lv);
  card.appendChild(head);
  var wonToday = (s.rewards.log || []).some(function (e) { return e.key === key; });
  card.appendChild(el("div", "pt-skip", tr(level === "low" ? "Skip: Let's make things smaller." : wonToday ? "Skip: Look how far you've come." : level === "full" ? "Skip: More room today, and your breaks are still safe." : "Skip: Let's make today easier.")));

  if (!quiet()) {
    var sn = R.snapshot(S(), key), tg = weekTarget(S());
    var wkb = el("button", "pt-week", null, { type: "button", id: "ptWeek", "aria-label": tr("See my progress") });
    wkb.appendChild(el("span", "pt-week-t", tr("This week") + ": " + sn.week.wins + " " + tr("of") + " " + tg + " " + tr("wins")));
    var wbar = el("span", "pt-week-bar"); var wf = el("i"); wf.style.width = Math.max(4, Math.min(100, Math.round(sn.week.wins * 100 / tg))) + "%"; wbar.appendChild(wf); wkb.appendChild(wbar);
    wkb.addEventListener("click", function () { C.showPanel("progress"); });
    card.appendChild(wkb);
  }

  /* welcome back after a break: small, kind, no pile-up */
  var gap = R.lastWinGap(s, today());
  var overdue = S().tasks.filter(function (t) { return !t.repeat && t.status !== "done" && t.date < today() && !P.isEssential(t); });
  if (key === today() && s.rewards.log.length && gap >= 3 && overdue.length) {
    var rp = P.restartPlan(S().tasks, today(), planSettings());
    var wb = el("div", "pt-welcome");
    wb.appendChild(el("p", "pt-wb-msg", rp.message));
    var wbBtn = el("button", "soft-btn", tr("Show me a gentle restart"), { type: "button", id: "ptRestart" });
    wbBtn.addEventListener("click", function () { previewMoves({ moves: rp.moves, essential: [], explain: [rp.message], title: tr("A gentle restart") }, tr("Spread them out")); });
    wb.appendChild(wbBtn); card.appendChild(wb);
  }

  if (!hasAny) {
    card.appendChild(el("p", "pt-empty", tr("Nothing planned 🌿")));
    var b1 = el("button", "primary-btn", tr("Talk to it"), { type: "button", id: "ptTalk" });
    b1.addEventListener("click", function () { C.showPanel("capture"); C.setBottomTab("capture"); });
    card.appendChild(b1); root.appendChild(card); return;
  }

  /* capacity bar: never the whole day */
  var cap = plan.capacity, usePct = cap.usableMin ? Math.min(100, Math.round(plan.usedMin * 100 / cap.usableMin)) : 0;
  var bar = el("div", "pt-cap", null, { "aria-label": tr("Planned time") });
  var fill = el("div", "pt-cap-fill"); fill.style.width = usePct + "%"; if (plan.overloaded) fill.classList.add("is-over");
  bar.appendChild(fill); card.appendChild(bar);
  card.appendChild(el("div", "pt-cap-txt", tr("{a} planned of about {b} you can use. The rest stays open.", { a: fmtMin(plan.usedMin), b: fmtMin(cap.usableMin) })));

  /* the one next action */
  var lead = plan.priorities[0] || plan.essential[0] || plan.keep[0];
  if (lead) {
    var na = P.nextAction(lead);
    var nxt = el("div", "pt-next");
    nxt.appendChild(el("div", "pt-kicker", tr("Start here")));
    nxt.appendChild(el("div", "pt-next-title", level === "low" ? (lead.minVersion || P.smallest(lead)) : lead.title));
    nxt.appendChild(el("div", "pt-next-sub", tr("Next action") + ": " + na.text));
    var row = el("div", "pt-actions");
    var go = el("button", "primary-btn", tr("Start"), { type: "button", id: "ptStart" });
    go.addEventListener("click", function () { C.startFocus(lead.id, lead.date); });
    var sm = el("button", "soft-btn", tr("Smallest version"), { type: "button", id: "ptSmall" });
    var smTxt = el("div", "pt-small", null); smTxt.hidden = true; smTxt.textContent = P.smallest(lead);
    sm.addEventListener("click", function () { smTxt.hidden = !smTxt.hidden; });
    var dn = el("button", "soft-btn", tr("Done"), { type: "button", id: "ptDone" });
    dn.addEventListener("click", function () { C.toggleDone(lead.id, lead.date); });
    row.appendChild(go); row.appendChild(sm); row.appendChild(dn);
    nxt.appendChild(row); nxt.appendChild(smTxt);
    card.appendChild(nxt);
  }
  /* priorities + quick win */
  var rest = plan.priorities.slice(lead === plan.priorities[0] ? 1 : 0);
  if (rest.length || plan.quickWin) {
    var more = el("ul", "pt-list");
    rest.forEach(function (t) { more.appendChild(el("li", null, t.title + " · " + fmtMin(P.minutesOf(t, plan.calibration)))); });
    if (plan.quickWin) { var qi = el("li", "pt-quick", tr("Quick win") + ": " + plan.quickWin.title); more.appendChild(qi); }
    card.appendChild(more);
  }
  plan.conflicts.forEach(function (c) {
    var cf = el("div", "pt-conflict"); cf.appendChild(el("b", null, c.title)); cf.appendChild(el("span", null, " " + tr(c.reason) + " " + tr("Keep it, make it smaller, or move something else.")));
    card.appendChild(cf);
  });
  /* explanations: show what changed and why */
  var details = el("details", "pt-details");
  details.appendChild(el("summary", null, tr("Why this plan?")));
  plan.explain.forEach(function (x) { details.appendChild(el("p", null, tr(x))); });
  var wk = P.weekLoad(S().tasks.filter(function (t) { return !t.repeat; }), key, "steady", planSettings(), calib());
  var full = wk.filter(function (d) { return d.tooFull; });
  if (full.length) details.appendChild(el("p", "pt-warn", tr("Too full this week") + ": " + full.map(function (d) { return niceDate(d.key); }).join(", ")));
  var cb = calib(); if (cb.suggest && !s.settings.plan.learn) { var cl = el("p", "pt-learn", cb.suggest + " "); var yes = el("button", "soft-btn", tr("Yes, use it"), { type: "button", id: "ptLearn" }); yes.addEventListener("click", function () { s.settings.plan.learn = true; C.save(); C.refreshAll(); }); cl.appendChild(yes); details.appendChild(cl); }
  card.appendChild(details);
  var help = el("button", "soft-btn pt-help", tr("I don't know where to start"), { type: "button", id: "ptHelp" });
  help.addEventListener("click", function () { skipHelp(plan, key); });
  card.appendChild(help);
  /* optional end-of-day look back (off unless chosen) */
  if (s.settings.plan.reflect && key === today() && nowMin() >= 18 * 60) {
    var left = S().tasks.filter(function (t) { return !t.repeat && t.date === key && t.status !== "done" && !P.isEssential(t); });
    var doneN = S().tasks.filter(function (t) { return t.date === key && t.status === "done"; }).length;
    var rf = el("div", "pt-reflect");
    rf.appendChild(el("b", null, tr("Today, looking back")));
    rf.appendChild(el("p", null, tr("{a} done. {b} still open. A little progress goes a long way.", { a: doneN, b: left.length })));
    if (left.length) {
      var rb = el("button", "soft-btn", tr("Carry the rest to tomorrow"), { type: "button", id: "ptCarry" });
      rb.addEventListener("click", function () { previewMoves({ moves: left.map(function (t) { return { id: t.id, title: t.title, from: key, to: addDays(key, 1) }; }), essential: [], explain: [tr("Nothing is lost. These simply wait for tomorrow.")], title: tr("Carry to tomorrow") }, tr("Carry them")); });
      rf.appendChild(rb);
    }
    card.appendChild(rf);
  }
  if (plan.moves.length) {
    var tidy = el("button", "soft-btn pt-tidy", tr("Tidy my day") + " (" + plan.moves.length + ")", { type: "button", id: "ptTidy" });
    tidy.addEventListener("click", function () { previewMoves({ moves: plan.moves, essential: plan.essential, explain: plan.explain, title: tr("Tidy my day") }, tr("Move them")); });
    card.appendChild(tidy);
  }
  root.appendChild(card);
}

/* Skip helps when it all feels like too much: one thing, kindly, with a way out. */
function skipHelp(plan, key) {
  var old = $("planSheet"); if (old) old.remove();
  var lead = plan.priorities[0] || plan.essential[0] || plan.keep[0] || null;
  var sheet = el("div", "pace-sheet", null, { id: "planSheet", role: "dialog", "aria-modal": "true", "aria-label": tr("Skip can help") });
  var card = el("div", "ps-card ps-skip");
  var art = el("div", "pcb-art"); art.innerHTML = C.skipSvg("point"); card.appendChild(art);
  card.appendChild(el("h3", null, tr("That's okay. Let's make today simpler.")));
  if (lead) {
    card.appendChild(el("div", "ps-h", tr("Just this one thing")));
    card.appendChild(el("div", "pt-next-title", lead.minVersion || P.smallest(lead)));
    card.appendChild(el("p", "ps-explain", tr("Next action") + ": " + P.nextAction(lead).text));
  } else card.appendChild(el("p", "ps-explain", tr("Free day 🌿")));
  var row = el("div", "ps-actions");
  if (lead) { var go = el("button", "primary-btn", tr("Start it"), { type: "button", id: "skipStart" }); go.addEventListener("click", function () { sheet.remove(); C.startFocus(lead.id, lead.date); }); row.appendChild(go); }
  var gentle = el("button", "soft-btn", tr("Make today gentler"), { type: "button", id: "skipGentle" });
  gentle.addEventListener("click", function () { sheet.remove(); var lb = document.querySelector('.level-btn[data-level="low"]'); if (lb) lb.click(); });
  var no = el("button", "soft-btn", tr("Not now"), { type: "button", id: "psNo" }); no.addEventListener("click", function () { sheet.remove(); });
  row.appendChild(gentle); row.appendChild(no); card.appendChild(row); sheet.appendChild(card); document.body.appendChild(sheet);
}

/* Preview: always show what will move; nothing changes until the person agrees. Undo after. */
function previewMoves(info, okLabel, after) {
  var old = $("planSheet"); if (old) old.remove();
  var sheet = el("div", "pace-sheet", null, { id: "planSheet", role: "dialog", "aria-modal": "true", "aria-label": info.title || tr("Preview") });
  var card = el("div", "ps-card");
  card.appendChild(el("h3", null, info.title || tr("Preview")));
  (info.explain || []).forEach(function (x) { card.appendChild(el("p", "ps-explain", tr(x))); });
  var stay = (info.stay || []).concat(info.essential || []);
  if (stay.length) {
    card.appendChild(el("div", "ps-h", tr("These stay today")));
    stay.forEach(function (t) { card.appendChild(el("div", "ps-stay", t.title + (t.time ? " \u00b7 " + t.time : ""))); });
  }
  card.appendChild(el("div", "ps-h", info.waitLabel || tr("These move")));
  if (!info.moves.length) card.appendChild(el("div", "ps-stay", tr("Nothing needs to move.")));
  info.moves.forEach(function (m) { card.appendChild(el("div", "ps-move", m.title + " \u00b7 " + niceDate(m.from) + " \u2192 " + niceDate(m.to))); });
  var row = el("div", "ps-actions");
  var ok = el("button", "primary-btn", okLabel || tr("Looks good"), { type: "button", id: "psOk" });
  var no = el("button", "soft-btn", tr("Not now"), { type: "button", id: "psNo" });
  no.addEventListener("click", function () { sheet.remove(); if (info.onCancel) info.onCancel(); });
  ok.addEventListener("click", function () {
    var before = JSON.stringify(S().tasks.map(function (t) { return { id: t.id, date: t.date }; }));
    var snap = P.applyMoves(S().tasks, info.moves);
    if (info.afterApply) info.afterApply();
    sheet.remove(); C.save(); C.refreshAll();
    if (snap.length) C.toast(tr("Moved {n}. Your must-dos stayed.", { n: snap.length }), function () { P.undoMoves(S().tasks, snap); if (info.onUndo) info.onUndo(); C.save(); C.refreshAll(); C.toast(tr("Back as it was.")); });
    else if (info.afterApply) C.toast(tr("Done."));
    if (after) after(snap);
  });
  row.appendChild(ok); row.appendChild(no); card.appendChild(row); sheet.appendChild(card);
  document.body.appendChild(sheet);
  ok.focus();
}

/* Choosing Low: preview first, so nothing is moved behind your back. */
function wireLevelButtons() {
  document.querySelectorAll(".level-btn").forEach(function (b) {
    b.addEventListener("click", function (e) {
      if (window.__paceBypass) return;
      var level = b.getAttribute("data-level"), key = C.selected;
      if (level !== "low" || C.levelFor(key) === "low" && S().feelings[key] === "low") return;
      var plan = P.planDay(S().tasks.filter(function (t) { return !t.repeat; }), "low", { key: key, settings: planSettings(), calibration: calib() });
      var movable = plan.moves;
      if (!movable.length && !plan.essential.length) return; /* nothing to preview: let it through */
      e.stopImmediatePropagation(); e.preventDefault();
      previewMoves({ moves: movable, stay: plan.priorities.concat(plan.quickWin ? [plan.quickWin] : []), essential: plan.essential, waitLabel: tr("These wait for a lighter day"), explain: plan.explain.concat([tr("Big things become small steps.")]), title: tr("A gentler day") }, tr("Make it gentler"), null);
      var okb = $("psOk"); var clone = okb.cloneNode(true); okb.parentNode.replaceChild(clone, okb);
      clone.addEventListener("click", function () { $("planSheet").remove(); window.__paceBypass = true; try { b.click(); } finally { window.__paceBypass = false; } });
    }, true);
  });
}

/* ============ Talk to it: capture -> understand -> review -> create ============ */
var cur = null; /* current review */
function capCtx() { var s = ensure(); return { goals: s.goals || [], tasks: s.tasks, processed: s.captured.filter(function (c) { return c.status === "tasks" || c.status === "note"; }).map(function (c) { return c.fp; }), nowMin: nowMin() }; }
function capture(text, opts) {
  opts = opts || {};
  var s = ensure(), msg = $("captureMsg");
  text = String(text || "");
  if (!text.trim()) { if (msg) msg.textContent = tr("Type or speak first. Your words are safe here."); return null; }
  var res = B.understand(text, today(), capCtx());
  var entry = s.captured.filter(function (c) { return c.fp === res.fingerprint && c.status === "review"; })[0];
  if (!entry) { entry = { id: C.uid(), text: text, at: Date.now(), fp: res.fingerprint, status: "review", taskIds: [], notes: [], counts: { tasks: 0, goals: 0, notes: 0, feelings: 0 } }; s.captured.unshift(entry); }
  entry.counts = { tasks: res.items.length, goals: res.goals.length, notes: res.notes.length, feelings: res.feelings.length };
  C.save();
  cur = { entry: entry, res: res, demo: !!opts.demo };
  if (msg) msg.textContent = res.heard ? "" : tr("I did not find anything to sort. Your words are safe.");
  renderReview(); renderCaptured();
  return res;
}

/* ===== Talk to Skip: the mascot is the conversation. One step at a time. ===== */
var skipMood = "idle", skipDoneAt = 0;
var SKIP_LINES = {
  idle: ["chill", "One step at a time. I'm right here. What's on your mind?", 1],
  typing: ["listen", "I'm listening. Take all the time you need.", 1],
  hearing: ["listen", "I'm all ears. Just talk, I'll keep up.", 1],
  thinking: ["think", "Hmm, let me sort this out for you\u2026", 2],
  result: ["point", "Here's what I found. You choose what happens next.", 2],
  empty: ["chill", "I couldn't find a task in that, and that's okay. Your words are safe.", 1],
  done: ["celebrate", "Done! That's one step. Take a breath, you did well.", 3]
};
function skipTalkPaint(mood) {
  var box = $("skipTalk"); if (!box) return;
  skipMood = mood || skipMood;
  var L0 = SKIP_LINES[skipMood] || SKIP_LINES.idle;
  var step = L0[2];
  box.setAttribute("data-mood", skipMood);
  box.innerHTML = "";
  var art = el("div", "st-art"); art.innerHTML = C.skipSvg(L0[0]);
  var bub = el("div", "st-bubble", L0[1]);
  var dots = el("div", "st-steps", null, { "aria-hidden": "true" });
  [["\ud83d\udcac", "Tell me"], ["\ud83d\udc40", "Check"], ["\u2705", "Add"]].forEach(function (x, i) {
    var d = el("span", "st-step" + (i + 1 === step ? " is-on" : i + 1 < step ? " is-past" : ""));
    d.appendChild(el("b", null, x[0])); d.appendChild(el("i", null, tr(x[1]))); dots.appendChild(d);
  });
  box.appendChild(art); box.appendChild(bub); box.appendChild(dots);
}
function skipTalkSync() {
  if (cur) { skipTalkPaint(cur.res && cur.res.heard === false ? "empty" : "result"); return; }
  if (Date.now() - skipDoneAt < 60000) { skipTalkPaint("done"); return; }
  var dt = $("dumpText"); skipTalkPaint(dt && dt.value.trim() ? "typing" : "idle");
}
(function wireSkipTalk() {
  var dt = $("dumpText"), vb = $("voiceBtn"), pb = $("parseBtn");
  if (dt) dt.addEventListener("input", function () { skipDoneAt = 0; if (!cur) skipTalkSync(); });
  if (vb) vb.addEventListener("click", function () { skipTalkPaint("hearing"); setTimeout(function () { if (!cur && !(vb.classList.contains("is-on") || vb.getAttribute("aria-pressed") === "true")) skipTalkSync(); }, 4000); });
  if (pb) pb.addEventListener("click", function () { if (dt && dt.value.trim() && !cur) { skipTalkPaint("thinking"); } });
  skipTalkSync();
})();
function renderReview() {
  skipTalkSync();
  var root = $("paceReview"); if (!root) return;
  var old = $("draftArea"); if (old) old.hidden = true;
  if (!cur) { root.hidden = true; root.innerHTML = ""; return; }
  var res = cur.res; root.hidden = false; root.innerHTML = "";
  root.appendChild(el("h3", null, tr("Here is what I understood")));
  root.appendChild(el("p", "pr-sum", tr(res.summary)));
  if (res.alreadyProcessed) root.appendChild(el("p", "pr-dup", tr("Already sorted these.")));
  /* tasks */
  if (res.items.length) {
    root.appendChild(el("div", "pr-h", tr("Tasks") + " (" + res.items.length + ")"));
    res.items.forEach(function (d, i) {
      if (d.include == null) d.include = d.confident && !d.duplicate && !res.alreadyProcessed;
      var card = el("div", "pr-card" + (d.include ? "" : " is-off"), null, { "data-i": i });
      var chk = el("input", null, null, { type: "checkbox", "aria-label": tr("Add this task") }); chk.checked = !!d.include;
      chk.addEventListener("change", function () { d.include = chk.checked; card.classList.toggle("is-off", !d.include); updateAddBtn(); });
      var body = el("div", "pr-body");
      var title = el("input", "pr-title", null, { type: "text", value: d.title, "aria-label": tr("Task title") });
      title.value = d.title; title.addEventListener("change", function () { d.title = title.value.trim() || d.title; });
      var meta = el("div", "pr-meta");
      var date = el("input", null, null, { type: "date", value: d.date, "aria-label": tr("Date") }); date.value = d.date; date.addEventListener("change", function () { d.date = date.value || d.date; });
      var time = el("input", null, null, { type: "time", "aria-label": tr("Time") }); time.value = d.time || ""; time.addEventListener("change", function () { d.time = time.value || null; });
      var dur = el("input", null, null, { type: "number", min: "5", step: "5", "aria-label": tr("Minutes") }); dur.value = d.durationMin; dur.style.width = "72px"; dur.addEventListener("change", function () { d.durationMin = Math.max(5, +dur.value || 25); });
      meta.appendChild(date); meta.appendChild(time); meta.appendChild(dur); meta.appendChild(el("span", "hint", tr("min")));
      /* one calm line; the three pickers hide until you tap Change */
      var sumTxt = function () { return niceDate(d.date) + (d.time ? " \u00b7 " + d.time : "") + " \u00b7 " + d.durationMin + " " + tr("min"); };
      var when = el("button", "pr-when", null, { type: "button", "aria-expanded": "false" });
      var whenTxt = el("span", "pr-when-t", sumTxt()); when.appendChild(whenTxt); when.appendChild(el("span", "pr-when-c", tr("Change")));
      meta.hidden = true;
      when.addEventListener("click", function () { meta.hidden = !meta.hidden; when.setAttribute("aria-expanded", String(!meta.hidden)); });
      [date, time, dur].forEach(function (x) { x.addEventListener("change", function () { whenTxt.textContent = sumTxt(); }); });
      body.appendChild(title); body.appendChild(when); body.appendChild(meta);
      var chips = el("div", "pr-chips");
      if (d.deadline) chips.appendChild(el("span", "chip chip-deadline", tr("Deadline") + " " + niceDate(d.deadline)));
      if (d.essential) chips.appendChild(el("span", "chip chip-must", tr("must not slip")));
      if (d.repeat) chips.appendChild(el("span", "chip", tr(d.repeat)));
      if (d.optional) chips.appendChild(el("span", "chip", tr("if there is time")));
      if (d.goalTitle) chips.appendChild(el("span", "chip chip-goal", tr("Goal") + ": " + d.goalTitle));
      if (d.assumed === "time") chips.appendChild(el("span", "chip chip-unsure", tr("I guessed am or pm. Check the time.")));
      (d.unsure || []).forEach(function (u) { chips.appendChild(el("span", "chip chip-unsure", tr(u))); });
      body.appendChild(chips);
      body.appendChild(el("div", "pr-small", tr("Smallest version") + ": " + d.minVersion));
      var del = el("button", "dc-del", tr("Remove"), { type: "button" });
      del.addEventListener("click", function () { res.items.splice(i, 1); cur.entry.counts.tasks = res.items.length; renderReview(); });
      /* icon read from the words; tap it to try the next fitting one */
      var an = C.TASK_ICONS ? L.analyzeTask(d.title, (S().goals || []), C.TASK_ICONS) : null;
      var cands = an ? (an.icons && an.icons.length ? an.icons.slice(0, 8) : [an.icon]) : [];
      if (d.icon == null) d.icon = (an && an.icon) || "";
      var ib = el("button", "pr-ico", d.icon || "\u2795", { type: "button", "aria-label": tr("Change icon") });
      ib.addEventListener("click", function () { if (!cands.length) return; var k = cands.indexOf(d.icon); d.icon = cands[(k + 1) % cands.length]; ib.textContent = d.icon; });
      timeChips(time, ["07:00", "09:00", "12:00", "15:00", "18:00", "20:00"]);
      card.appendChild(chk); card.appendChild(ib); card.appendChild(body); card.appendChild(del); root.appendChild(card);
    });
  }
  /* goals */
  if (res.goals.length) {
    root.appendChild(el("div", "pr-h", tr("Goals") + " (" + res.goals.length + ")"));
    res.goals.forEach(function (g) {
      if (g.include == null) g.include = !g.needsClarify;
      var card = el("div", "pr-card pr-goal" + (g.include ? "" : " is-off"));
      var chk = el("input", null, null, { type: "checkbox", "aria-label": tr("Create this goal") }); chk.checked = !!g.include;
      chk.addEventListener("change", function () { g.include = chk.checked; card.classList.toggle("is-off", !g.include); updateAddBtn(); });
      var body = el("div", "pr-body");
      var title = el("input", "pr-title", null, { type: "text", "aria-label": tr("Goal") }); title.value = g.title; title.addEventListener("change", function () { g.title = title.value.trim() || g.title; });
      body.appendChild(title);
      if (g.needsClarify && g.question) {
        body.appendChild(el("div", "pr-ask", tr(g.question.q)));
        var opts = el("div", "pr-opts");
        g.question.options.forEach(function (o) {
          var ob = el("button", "soft-btn", tr(o), { type: "button" });
          ob.addEventListener("click", function () { g.title = o; g.needsClarify = false; g.include = true; renderReview(); });
          opts.appendChild(ob);
        });
        body.appendChild(opts);
        body.appendChild(el("div", "hint", tr("Or type it in the box above in your own words.")));
        title.addEventListener("change", function () { g.needsClarify = false; g.include = true; renderReview(); });
      } else body.appendChild(el("div", "pr-small", g.end ? tr("Deadline") + " " + niceDate(g.end) + " · " + tr("One small step a day.") : tr("One small step a day.")));
      var gico = el("span", "pr-ico is-static", (G.suggestIcons(g.title, 1, [G.goalCategory(g.category || "personal").emoji]) || [])[0] || "\ud83c\udfaf", { "aria-hidden": "true" });
      card.appendChild(chk); card.appendChild(gico); card.appendChild(body); root.appendChild(card);
    });
  }
  /* notes + ideas */
  if (res.notes.length) {
    root.appendChild(el("div", "pr-h", tr("Notes and ideas") + " (" + res.notes.length + ")"));
    res.notes.forEach(function (n) {
      var card = el("div", "pr-card is-note");
      card.appendChild(el("span", "pr-tag", n.kind === "idea" ? tr("Idea") : tr("Note")));
      card.appendChild(el("div", "pr-body", n.text));
      root.appendChild(card);
    });
    root.appendChild(el("p", "hint", tr("Saved as notes.")));
  }
  /* feelings */
  if (res.feelings.length) {
    root.appendChild(el("div", "pr-h", tr("How you feel")));
    res.feelings.forEach(function (f) { var c = el("div", "pr-card is-note"); c.appendChild(el("span", "pr-tag", tr("Journal"))); c.appendChild(el("div", "pr-body", f.text)); root.appendChild(c); });
    if (res.suggestLevel === "low") {
      var kind = el("div", "pr-kind");
      kind.appendChild(el("p", null, tr("Lots today. Gentler day?")));
      var gb = el("button", "soft-btn", tr("Make today gentler"), { type: "button", id: "prGentle" });
      gb.addEventListener("click", function () { C.showPanel("calendar"); C.setBottomTab("calendar"); var lb = document.querySelector('.level-btn[data-level="low"]'); if (lb) lb.click(); });
      kind.appendChild(gb); root.appendChild(kind);
    }
  }
  if (!res.items.length && !res.goals.length && !res.notes.length && !res.feelings.length) root.appendChild(el("p", "pr-none", tr("I did not find anything to sort. Your words are safe. Try one thing per line.")));
  var acts = el("div", "draft-actions");
  var add = el("button", "primary-btn", "", { type: "button", id: "prAdd" });
  var clear = el("button", "soft-btn", tr("Start again"), { type: "button", id: "prClear" });
  add.addEventListener("click", commitReview);
  clear.addEventListener("click", function () { if (cur && cur.entry.status === "review") cur.entry.status = "captured"; cur = null; C.save(); renderReview(); renderCaptured(); var dt = $("dumpText"); if (dt) dt.value = ""; });
  acts.appendChild(add); acts.appendChild(clear); root.appendChild(acts);
  root.appendChild(el("details", "original-keep", null)).innerHTML = "<summary>" + esc(tr("Keep the original words")) + "</summary><pre>" + esc(cur.entry.text) + "</pre>";
  updateAddBtn();
}
function updateAddBtn() {
  var b = $("prAdd"); if (!b || !cur) return;
  var t = cur.res.items.filter(function (d) { return d.include; }).length, g = cur.res.goals.filter(function (d) { return d.include; }).length, n = cur.res.notes.length;
  var parts = []; if (t) parts.push(t + (t === 1 ? " " + tr("task") : " " + tr("tasks"))); if (g) parts.push(g + (g === 1 ? " " + tr("goal") : " " + tr("goals")));
  b.textContent = parts.length ? tr("Add") + " " + parts.join(" + ") : (n || cur.res.feelings.length ? tr("Save as notes") : tr("Nothing to add"));
  b.disabled = !parts.length && !n && !cur.res.feelings.length;
}
function goalCategoryFor(title) {
  var l = String(title).toLowerCase();
  if (/health|fit|walk|gym|run|eat|sleep|weight|yoga/.test(l)) return "health";
  if (/money|save|budget|debt|dollar|pay|earn|invest/.test(l)) return "money";
  if (/study|learn|exam|course|degree|school|read|language|piano|guitar/.test(l)) return "school";
  if (/work|website|business|client|launch|career|job|podcast|app|book/.test(l)) return "work";
  if (/home|clean|tidy|declutter|organi|house|move/.test(l)) return "home";
  return "personal";
}
function createGoal(title, end) {
  var s = ensure(), t0 = today();
  var cat = goalCategoryFor(title);
  var to = end || addDays(t0, 42);
  var steps = G.buildPlan({ title: title, category: cat, start: t0, end: to, pace: "daily", mins: 20, milestones: [], text: title, answers: {} });
  if (!steps || !steps.length) steps = [{ date: t0, title: "Write what done looks like for: " + title, durationMin: 20, minVersion: "Just 5 minutes: write one sentence" }];
  var goal = { id: C.uid(), title: title, icon: (G.suggestIcons(title, 1, [G.goalCategory(cat).emoji]) || [])[0], category: cat, start: t0, end: to, pace: "daily", mins: 20, notes: "", created: Date.now(), outcome: title };
  if (!Array.isArray(s.goals)) s.goals = [];
  s.goals.push(goal);
  var gc = G.goalCategory(cat), ids = [];
  var phases = {}; steps.forEach(function (st) { phases[st.phase || ""] = 1; });
  steps.forEach(function (st) {
    var sv = B.smallestVersion(st.title);
    var task = { id: C.uid(), title: st.title, date: st.date, time: null, durationMin: st.durationMin, priority: 0, repeat: null, category: "other", color: gc.color, icon: gc.emoji, essential: false, status: "todo", steps: [], minVersion: st.minVersion && !/very first bit/.test(st.minVersion) ? st.minVersion : sv.small, firstStep: sv.first, fullVersion: "", source: "goal", goalId: goal.id, phase: st.phase || "", remind: [10], originalText: title, skipDates: [], doneDates: [] };
    s.tasks.push(task); ids.push(task.id);
  });
  return { goal: goal, taskIds: ids };
}
function commitReview() {
  if (!cur) return;
  var s = ensure(), res = cur.res, entry = cur.entry, made = [], madeGoals = [], nTasks = 0, nGoals = 0;
  res.items.forEach(function (d) {
    if (!d.include) return;
    /* duplicate protection: the same title on the same day is never added twice */
    if (s.tasks.some(function (t) { return !t.repeat && t.status !== "done" && t.date === d.date && B.overlap(t.title, d.title) >= 0.9; })) return;
    var cat = L.categoryFor(d.title);
    var an = (C.TASK_ICONS ? L.analyzeTask(d.title, s.goals || [], C.TASK_ICONS) : null);
    var task = { id: C.uid(), icon: (d.icon != null && d.icon !== "") ? d.icon : (an && an.icon) || "", title: d.title, date: d.date, time: d.time, durationMin: d.durationMin, priority: d.priority, repeat: d.repeat, category: cat.id, color: cat.color, essential: d.essential, status: "todo", steps: d.steps || [], minVersion: d.minVersion, firstStep: d.firstStep, fullVersion: "", source: "capture", originalText: entry.text, skipDates: [], doneDates: [], captureId: entry.id };
    if (d.deadline) task.deadline = d.deadline;
    if (d.optional) task.optional = true;
    if (d.goalId) task.goalId = d.goalId;
    s.tasks.push(task); made.push(task.id); nTasks++;
  });
  res.goals.forEach(function (g) { if (!g.include) return; var r = createGoal(g.title, g.end); made = made.concat(r.taskIds); madeGoals.push(r.goal.id); nGoals++; });
  entry.notes = res.notes.map(function (n) { return { kind: n.kind, text: n.text }; }).concat(res.feelings.map(function (f) { return { kind: "journal", text: f.text }; }));
  entry.taskIds = made; entry.counts.tasks = nTasks; entry.counts.goals = nGoals;
  entry.status = (nTasks || nGoals) ? "tasks" : (entry.notes.length ? "note" : "captured");
  entry.doneAt = Date.now(); skipDoneAt = Date.now();
  var b = R.noteCaptured(s, nTasks);
  C.save(); if (nTasks || nGoals) C.markActivated("event");
  var summary = [];
  if (nTasks) summary.push(nTasks + (nTasks === 1 ? " " + tr("task") : " " + tr("tasks")));
  if (nGoals) summary.push(nGoals + (nGoals === 1 ? " " + tr("goal") : " " + tr("goals")));
  if (entry.notes.length) summary.push(entry.notes.length + " " + tr("saved as notes"));
  var wasDemo = cur.demo; cur = null;
  var dt = $("dumpText"); if (dt) dt.value = "";
  renderReview();
  if (nTasks || nGoals) { C.showPanel("calendar"); C.setBottomTab("calendar"); C.selectDate(today(), true); }
  C.refreshAll(); renderCaptured();
  C.toast(summary.length ? tr("Added") + ": " + summary.join(", ") + "." : tr("Nothing was added. Your words are safe."), (nTasks || nGoals) ? function () {
    s.tasks = s.tasks.filter(function (t) { return made.indexOf(t.id) === -1; });
    if (madeGoals.length) s.goals = (s.goals || []).filter(function (g) { return madeGoals.indexOf(g.id) === -1; });
    entry.status = "review"; entry.taskIds = []; C.save(); C.refreshAll(); renderCaptured(); C.toast(tr("Undone. Your words are still in Captured."));
  } : null);
  if (b && !quiet()) setTimeout(function () { celebrate({ message: tr("You have captured ten things from your head."), sparks: 0, badges: [{ name: b.name }], confetti: true }); }, 400);
}
var STATUS = { captured: "Captured", processing: "Processing", review: "Ready to review", tasks: "Tasks created", note: "Saved as note", archived: "Archived" };
function renderCaptured() {
  var root = $("paceCaptured"); if (!root) return;
  var s = ensure(); root.innerHTML = "";
  var list = s.captured.filter(function (c) { return c.status !== "archived"; });
  root.appendChild(el("h3", null, tr("Captured") + " (" + list.length + ")"));
  if (!list.length) { root.appendChild(el("p", "hint", tr("Everything lands here first."))); return; }
  list.slice(0, 20).forEach(function (c) {
    var row = el("div", "cap-row", null, { "data-status": c.status });
    var info = el("div", "cap-info");
    info.appendChild(el("div", "cap-text", String(c.text).replace(/\s+/g, " ").slice(0, 80)));
    var cnt = c.counts || {}; var bits = [];
    if (cnt.tasks) bits.push(cnt.tasks + " " + tr("tasks")); if (cnt.goals) bits.push(cnt.goals + " " + tr("goals")); if (c.notes && c.notes.length) bits.push(c.notes.length + " " + tr("notes"));
    info.appendChild(el("div", "hint", bits.join(" · ")));
    row.appendChild(info);
    row.appendChild(el("span", "cap-status st-" + c.status, tr(STATUS[c.status] || c.status)));
    if (c.status === "review" || c.status === "captured") { var rv = el("button", "soft-btn", tr("Review"), { type: "button", "data-act": "review" }); rv.addEventListener("click", function () { var dt = $("dumpText"); if (dt) dt.value = c.text; capture(c.text); }); row.appendChild(rv); }
    var ar = el("button", "soft-btn", tr("Archive"), { type: "button", "data-act": "archive" });
    ar.addEventListener("click", function () { c.status = "archived"; C.save(); renderCaptured(); });
    row.appendChild(ar);
    root.appendChild(row);
  });
}

/* ============ Goal Path (many goals, one next step each) ============ */
var STAGES = ["Define", "Create", "Review", "Finish"];
function stagesFor(tasks) {
  var sorted = tasks.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  var named = {}; sorted.forEach(function (t) { if (t.phase) named[t.phase] = 1; });
  var names = Object.keys(named);
  var out = [];
  if (names.length >= 2) names.forEach(function (n) { out.push({ name: n, tasks: sorted.filter(function (t) { return t.phase === n; }) }); });
  else { var n = STAGES.length; STAGES.forEach(function (name, i) { var a = Math.floor(sorted.length * i / n), b = Math.floor(sorted.length * (i + 1) / n); out.push({ name: name, tasks: sorted.slice(a, Math.max(b, a + (sorted.length ? 0 : 0))) }); }); }
  return out.filter(function (st) { return st.tasks.length; });
}
function renderGoalPaths() {
  var root = $("goalsRoot"); if (!root) return;
  var old = $("paceGoalPath"); if (old) old.remove();
  var s = ensure(), goals = (s.goals || []);
  if (!goals.length) return;
  var wrap = el("section", "pace-goalpath", null, { id: "paceGoalPath" });
  var moms = goals.map(function (g) { return { g: g, m: R.goalMomentum(g, s.tasks, today(), s.rewards.log) }; }).filter(function (x) { return !x.m.complete; });
  /* at a glance: every goal, ONE next step each */
  var glance = el("div", "gp-glance");
  glance.appendChild(el("h3", null, tr("All my goals, one next step each")));
  moms.forEach(function (x) {
    var row = el("button", "gp-row" + (x.m.stale ? " is-stale" : ""), null, { type: "button", "data-goal": x.g.id });
    row.appendChild(el("span", "gp-name", x.g.title));
    row.appendChild(el("span", "gp-pct", x.m.pct + "%"));
    row.appendChild(el("span", "gp-next", x.m.next ? P.nextAction(x.m.next).text : tr("All steps done")));
    row.addEventListener("click", function () { var card = document.querySelector('.gp-card[data-goal="' + x.g.id + '"]'); if (card) card.scrollIntoView({ block: "start" }); });
    glance.appendChild(row);
  });
  if (moms.length > 1) {
    var neglected = moms.filter(function (x) { return x.m.stale; })[0] || moms.slice().sort(function (a, b) { return a.m.winsThisWeek - b.m.winsThisWeek; })[0];
    glance.appendChild(el("p", "gp-suggest", tr("Balanced pick today") + ": " + neglected.g.title + ". " + tr("Just the smallest version is enough.")));
  }
  wrap.appendChild(glance);
  moms.forEach(function (x) { wrap.appendChild(goalCard(x.g, x.m)); });
  var anchor = root.querySelector(".panel-lede");
  if (anchor && anchor.nextSibling) root.insertBefore(wrap, anchor.nextSibling); else root.appendChild(wrap);
}
function goalCard(g, m) {
  var s = S();
  var tasks = s.tasks.filter(function (t) { return t.goalId === g.id; });
  var card = el("article", "gp-card", null, { "data-goal": g.id });
  card.appendChild(el("div", "gp-kicker", tr("Goal Path")));
  card.appendChild(el("h4", null, g.title));
  card.appendChild(el("div", "gp-outcome", tr("Your outcome") + ": " + (g.outcome || g.title)));
  var bar = el("div", "pt-cap", null, { "aria-label": tr("Progress") }); var f = el("div", "pt-cap-fill"); f.style.width = m.pct + "%"; bar.appendChild(f); card.appendChild(bar);
  var info = [m.done + " / " + m.total + " " + tr("steps"), tr("About {n} left", { n: fmtMin(m.remainingMin) })];
  if (g.end) info.push(tr("Deadline") + " " + niceDate(g.end));
  card.appendChild(el("div", "gp-info", info.join(" · ")));
  /* milestones */
  var stages = stagesFor(tasks), found = false;
  var ol = el("ol", "gp-stages");
  stages.forEach(function (st) {
    var doneAll = st.tasks.every(function (t) { return t.status === "done"; });
    var isCur = !doneAll && !found; if (isCur) found = true;
    var li = el("li", doneAll ? "is-done" : isCur ? "is-current" : "");
    li.appendChild(el("b", null, tr(st.name)));
    li.appendChild(el("span", null, " " + st.tasks.filter(function (t) { return t.status === "done"; }).length + "/" + st.tasks.length));
    if (isCur) {
      var det = el("details", "gp-expand"); det.appendChild(el("summary", null, tr("Show the steps")));
      st.tasks.slice(0, 8).forEach(function (t) {
        var d = el("div", "gp-step" + (t.status === "done" ? " is-done" : ""), t.title);
        det.appendChild(d);
      });
      li.appendChild(det);
    }
    ol.appendChild(li);
  });
  card.appendChild(ol);
  /* the one next action */
  if (m.next) {
    var na = P.nextAction(m.next), box = el("div", "pt-next");
    box.appendChild(el("div", "pt-kicker", tr("Next action") + " · " + fmtMin(+m.next.durationMin || 25)));
    box.appendChild(el("div", "pt-next-title", na.text === m.next.title ? m.next.title : m.next.title));
    if (na.text !== m.next.title) box.appendChild(el("div", "pt-next-sub", na.text));
    var row = el("div", "pt-actions");
    var st = el("button", "primary-btn", tr("Start"), { type: "button", "data-act": "start" }); st.addEventListener("click", function () { C.startFocus(m.next.id, m.next.date); });
    var sm = el("button", "soft-btn", tr("Smallest version"), { type: "button", "data-act": "small" });
    var txt = el("div", "pt-small"); txt.hidden = true; txt.textContent = P.smallest(m.next);
    sm.addEventListener("click", function () { txt.hidden = !txt.hidden; });
    var ex = el("button", "soft-btn", tr("Break it down"), { type: "button", "data-act": "expand" });
    ex.addEventListener("click", function () {
      var subs = L.decompose(m.next.title, Math.max(+m.next.durationMin || 25, 45), true);
      txt.hidden = false; txt.innerHTML = "<ol>" + subs.map(function (x) { return "<li>" + esc(x.text) + "</li>"; }).join("") + "</ol>";
      var addb = el("button", "soft-btn", tr("Add these as steps"), { type: "button" });
      addb.addEventListener("click", function () { m.next.steps = subs; C.save(); C.refreshAll(); });
      txt.appendChild(addb);
    });
    row.appendChild(st); row.appendChild(sm); row.appendChild(ex); box.appendChild(row); box.appendChild(txt); card.appendChild(box);
  } else card.appendChild(el("p", "hint", tr("No open steps. Add one in your calendar.")));
  if (m.stale) card.appendChild(el("p", "gp-stale", tr("Quiet week. Smallest step counts.")));
  return card;
}

/* ============ Rewards panel + chip ============ */
function renderChip() {
  var s = ensure(), snap = R.snapshot(s, today());
  var chip = $("paceChip");
  if (!chip) { var side = document.querySelector(".side-foot"); if (!side) return; chip = el("button", "pace-chip", null, { id: "paceChip", type: "button", "aria-label": tr("My progress") }); side.insertBefore(chip, side.firstChild); chip.addEventListener("click", function () { C.showPanel("progress"); C.setBottomTab("more"); }); }
  chip.hidden = quiet();
  chip.textContent = snap.level.name + " · " + s.rewards.xp + " " + tr("sparks") + (snap.streak.current ? " · " + snap.streak.current + " " + tr(snap.streak.current === 1 ? "day" : "days") : "");
}
function weekTarget(s) {
  /* Your own pace: the average of your last 4 weeks, never below 3, never above 10. */
  var td = today(), log = (s.rewards.log || []), tot = 0;
  var from = L.addDays(td, -34), to2 = L.addDays(td, -7);
  log.forEach(function (e) { if (e.key >= from && e.key <= to2) tot++; });
  var avg = tot / 4; return Math.max(3, Math.min(10, Math.round(avg) || 3));
}
function winDaySet(s) { var m = {}; (s.rewards.log || []).forEach(function (e) { m[e.key] = 1; }); return m; }
function motivationLine(s, snap, target) {
  var td = today(), wk = snap.week.wins, lvl = C.levelFor ? C.levelFor(td) : "steady";
  var wd = L.parseKey(td).getDay(), left = Math.max(0, target - wk);
  var won = (s.rewards.log || []).some(function (e) { return e.key === td; });
  if (!snap.total) return { t: tr("One tiny step = first win."), k: "first" };
  var gap = 0, days = Object.keys(winDaySet(s)).filter(function (k) { return k < td; }).sort();
  if (days.length && !won) gap = Math.round((L.parseKey(td) - L.parseKey(days[days.length - 1])) / 86400000);
  if (gap >= 3) return { t: tr("Welcome back. Fresh start 🌱"), k: "back" };
  if (wk >= target) return { t: tr("You reached your week. Rest is allowed, and so is more."), k: "done" };
  if (won && left <= 2) return { t: left === 1 ? tr("You won today. One more win closes your week.") : tr("You won today. {n} more and your week is done.", { n: left }), k: "close" };
  if (won) return { t: tr("You already won today. Anything more is a bonus."), k: "won" };
  if (lvl === "low") return { t: tr("Low days count too. One small thing is plenty."), k: "low" };
  if (wk / target >= 0.7) return { t: left === 1 ? tr("So close. One more win closes your week.") : tr("So close. {n} more wins close your week.", { n: left }), k: "close" };
  if (wd === 1) return { t: tr("A fresh week. The slate is clean. Start with one small step."), k: "fresh" };
  return { t: tr("Small steps add up. {n} wins this week so far.", { n: wk }), k: "steady" };
}
function ringSvg(pct) {
  var c = 2 * Math.PI * 54, off = c * (1 - Math.max(0, Math.min(1, pct)));
  return '<svg viewBox="0 0 120 120" aria-hidden="true"><circle class="pg-ring-bg" cx="60" cy="60" r="54"/><circle class="pg-ring-fg" cx="60" cy="60" r="54" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 60 60)"/></svg>';
}
var BADGE_EMO = { first: "\u2B50", five: "\u270B", twentyfive: "\uD83C\uDF1F", ten: "\uD83D\uDD1F", fifty: "\uD83C\uDFC5", hundred: "\uD83D\uDCAF", fivehundred: "\uD83C\uDFC6", streak3: "\uD83D\uDD25", streak7: "\uD83D\uDCC5", streak14: "\uD83C\uDF08", streak30: "\uD83C\uDF19", low: "\uD83D\uDECB\uFE0F", comeback: "\uD83D\uDC4B", early: "\uD83C\uDF05", juggler: "\uD83E\uDD39", braindump: "\uD83E\uDDE0", smallest: "\uD83D\uDC23", goalHalf: "\u26F0\uFE0F", goalDone: "\uD83C\uDFAF", habit7: "\uD83C\uDF31", together: "\uD83E\uDD1D" };
var LEVEL_EMO = ["\uD83C\uDF30", "\uD83C\uDF31", "\uD83C\uDF3F", "\uD83C\uDF38", "\uD83C\uDF33", "\uD83C\uDF32", "\uD83D\uDDFC"];
/* A winding trail of levels, bottom to top. The ferry sits where you are. */
function journeySvg(levelIdx, levels) {
  var n = levels.length, H = 70, W = 300, y0 = (n - 1) * H + 46, pts = [], d = "";
  for (var i = 0; i < n; i++) pts.push({ x: i % 2 ? 214 : 86, y: y0 - i * H });
  d = "M" + pts[0].x + " " + pts[0].y;
  for (var j = 1; j < n; j++) { var a = pts[j - 1], b = pts[j]; d += " C" + a.x + " " + (a.y - H / 2) + " " + b.x + " " + (b.y + H / 2) + " " + b.x + " " + b.y; }
  var g = '<path class="jm-trail" d="' + d + '"/>';
  pts.forEach(function (p, k) {
    var on = k <= levelIdx;
    g += '<g class="jm-node' + (on ? " is-on" : "") + (k === levelIdx ? " is-here" : "") + '" data-lv="' + k + '"><circle cx="' + p.x + '" cy="' + p.y + '" r="24"/><text x="' + p.x + '" y="' + (p.y + 8) + '" text-anchor="middle" class="jm-emo">' + (on ? LEVEL_EMO[k] : "\uD83D\uDD12") + '</text><text x="' + (p.x + (k % 2 ? -34 : 34)) + '" y="' + (p.y + 5) + '" text-anchor="' + (k % 2 ? "end" : "start") + '" class="jm-lbl">' + esc(tr(levels[k].name)) + '</text></g>';
    if (k === levelIdx) g += '<text x="' + (p.x + (k % 2 ? 30 : -30)) + '" y="' + (p.y - 22) + '" text-anchor="middle" class="jm-boat">\u26F5</text>';
  });
  return '<svg viewBox="0 0 ' + W + " " + (y0 + 40) + '" class="jm-svg" role="img" aria-label="' + esc(tr("Your journey")) + '">' + g + "</svg>";
}
var BADGE_PROGRESS = { first: 1, five: 5, twentyfive: 25 };
function renderRewards() {
  var root = $("paceRewards"); if (!root) return;
  var s = ensure(), snap = R.snapshot(s, today()); root.innerHTML = "";
  var det = $("pgBoard");
  if (quiet()) { root.hidden = true; if (det) det.open = true; return; } root.hidden = false;
  var target = weekTarget(s), wk = snap.week.wins, td = today(), mot = motivationLine(s, snap, target);
  var wrap = el("div", "pg-wrap");

  /* 1. Hero: this week, as one ring and one kind sentence */
  var hero = el("section", "pg-card pg-hero", null, { "aria-label": tr("This week") });
  var ring = el("div", "pg-ring"); ring.innerHTML = ringSvg(wk / target);
  var mid = el("div", "pg-ring-mid"); mid.appendChild(el("b", null, String(wk))); mid.appendChild(el("span", null, tr("of {n} wins", { n: target }))); ring.appendChild(mid);
  hero.appendChild(ring);
  var ht = el("div", "pg-hero-text");
  ht.appendChild(el("h3", null, "\uD83D\uDCC8 " + tr("This week")));
  ht.appendChild(el("p", "pg-mot", mot.t, { id: "pgMot", "data-k": mot.k }));
  ht.appendChild(el("p", "hint", tr("Your week goal is {n} wins. Pace sets it from your own pace.", { n: target })));
  hero.appendChild(ht);
  wrap.appendChild(hero);

  /* 1b. All time: everything you have ever done, as pictures */
  (function () {
    var doneNow = (s.tasks || []).filter(function (t) { return t.status === "done"; }).length;
    var habits = s.habits || [], hCheck = 0, hBest = 0;
    habits.forEach(function (h) { var hs = G.habitStats(h.days, td); hCheck += hs.total || 0; hBest = Math.max(hBest, hs.best || 0); });
    var gAll = s.goals || [], gDone = 0, shared = 0;
    gAll.forEach(function (g) { var m = R.goalMomentum(g, s.tasks, td, s.rewards.log); if (m.complete) gDone++; if (g.sharedGoalId) shared++; });
    var gotNew = false;
    if (shared) gotNew = R.grantBadge(s, "together", td) || gotNew;
    if (hBest >= 7) gotNew = R.grantBadge(s, "habit7", td) || gotNew;
    if (gotNew) C.save();
    var earnedN = Object.keys(s.rewards.badges || {}).length;
    var items = [
      ["\u2705", Math.max(snap.total, doneNow), tr("wins ever")], ["\u2728", s.rewards.xp, tr("sparks")],
      ["\uD83D\uDD25", snap.streak.best, tr("best run")], ["\uD83C\uDFC5", earnedN + "/" + Object.keys(snap.allBadges).length, tr("badges")],
      ["\uD83C\uDFAF", gDone + "/" + gAll.length, tr("goals done")], ["\uD83C\uDF31", hCheck, tr("habit ticks")],
      ["\uD83E\uDD1D", shared, tr("shared goals")], ["\uD83E\uDDE0", s.rewards.captured || 0, tr("captured")]
    ];
    var at = el("section", "pg-card pg-alltime", null, { "aria-label": tr("All time") });
    at.appendChild(el("h3", null, "\uD83D\uDCCA " + tr("All time")));
    var gr = el("div", "pg-stats");
    items.forEach(function (it) { var c = el("div", "pg-stat"); c.appendChild(el("span", "pg-stat-e", it[0])); c.appendChild(el("b", null, String(it[1]))); c.appendChild(el("span", "pg-stat-l", it[2])); gr.appendChild(c); });
    at.appendChild(gr); wrap.appendChild(at);
  })();

  /* 2. The last 7 days: a win, a rest, or just a day */
  var days = el("section", "pg-card pg-days", null, { "aria-label": tr("Last 7 days") });
  var ws = winDaySet(s), nm = [];
  for (var i = 6; i >= 0; i--) {
    var k = L.addDays(td, -i), d = L.parseKey(k), isWin = !!ws[k], isRest = !!(s.rewards.rest && s.rewards.rest[k]);
    var col = el("div", "pg-day" + (isWin ? " is-win" : "") + (isRest && !isWin ? " is-rest" : "") + (k === td ? " is-today" : ""), null, { "data-d": k });
    col.appendChild(el("span", "pg-dot", isWin ? "\u2713" : isRest ? "\u263e" : ""));
    col.appendChild(el("span", "pg-dn", d.toLocaleDateString(undefined, { weekday: "narrow" })));
    days.appendChild(col);
  }
  wrap.appendChild(days);
  var st = snap.streak, shown14 = 0; for (var j = 0; j < 14; j++) if (ws[L.addDays(td, -j)]) shown14++;
  var idn = el("p", "pg-ident", shown14 ? tr("You showed up on {n} of the last 14 days. That is who you are becoming.", { n: shown14 }) : tr("Every day you show up counts. Today can be day one."));
  wrap.appendChild(idn);

  /* 3. Level: sparks to the next level */
  var lv = el("section", "pg-card pg-level");
  lv.appendChild(el("div", "pg-lv-name", snap.level.name + " \u00b7 " + s.rewards.xp + " " + tr("sparks")));
  lv.appendChild(el("div", "pg-lv-line", tr(snap.level.line)));
  var bar = el("div", "pt-cap"); var f = el("div", "pt-cap-fill"); f.style.width = Math.max(4, snap.level.pct) + "%"; bar.appendChild(f); lv.appendChild(bar);
  lv.appendChild(el("div", "hint", snap.level.next ? tr("{n} sparks to the next level", { n: snap.level.toNext }) : tr("You reached the top. Keep shining.")));
  wrap.appendChild(lv);
  var jm = el("section", "pg-card pg-journey", null, { id: "pgJourney" });
  jm.appendChild(el("h3", null, "\uD83D\uDDFA\uFE0F " + tr("Your journey")));
  var jwrap = el("div", "jm-wrap"); jwrap.innerHTML = journeySvg(snap.level.index, R.LEVELS); jm.appendChild(jwrap);
  wrap.appendChild(jm);

  /* 4. Streak, gently */
  var sk = el("section", "pg-card pg-streak");
  sk.appendChild(el("div", "pg-sk-n", "\uD83D\uDD25 " + (st.current ? tr("{n} days with a win in a row", { n: st.current }) : tr("A fresh start is always allowed."))));
  sk.appendChild(el("div", "hint", tr("Best run") + ": " + st.best + (st.graceUsed ? " \u00b7 " + tr("a rest day was forgiven") : " \u00b7 " + tr("one gap day is forgiven"))));
  var rest = el("button", "soft-btn", tr("Take a rest day (keeps my streak)"), { type: "button", id: "rwRest" });
  rest.addEventListener("click", function () { R.markRest(s, today()); C.save(); renderRewards(); C.toast(tr("Rest day saved. Your streak is safe.")); });
  sk.appendChild(rest); wrap.appendChild(sk);

  var hl = s.habits || [];
  if (hl.length) {
    var hs2 = el("section", "pg-card pg-habits", null, { id: "pgHabits" }); hs2.appendChild(el("h3", null, "\uD83C\uDF31 " + tr("Habits")));
    hl.forEach(function (h) {
      var st2 = G.habitStats(h.days, td), row = el("div", "pg-habit");
      row.appendChild(el("span", "pg-habit-n", h.name));
      var dots = el("span", "pg-habit-dots");
      for (var q = 6; q >= 0; q--) dots.appendChild(el("i", (h.days || {})[L.addDays(td, -q)] ? "is-on" : ""));
      row.appendChild(dots);
      row.appendChild(el("span", "pg-habit-s", "\uD83D\uDD25 " + (st2.current != null ? st2.current : st2.cur || 0)));
      hs2.appendChild(row);
    });
    wrap.appendChild(hs2);
  }

  /* 5. Goals: each one with its own bar, so many goals stay visible */
  var goals = (s.goals || []);
  var gs = el("section", "pg-card pg-goals", null, { id: "pgGoals" }); gs.appendChild(el("h3", null, "\uD83C\uDFAF " + tr("Your goals")));
  if (!goals.length) {
    gs.appendChild(el("p", "hint", tr("Add a goal 🌱")));
    var gb = el("button", "soft-btn", tr("Add a goal"), { type: "button", id: "pgAddGoal" }); gb.addEventListener("click", function () { C.showPanel("goals"); C.setBottomTab && C.setBottomTab("goals"); }); gs.appendChild(gb);
  } else goals.forEach(function (g) {
    var m = R.goalMomentum(g, s.tasks, td, s.rewards.log);
    var row = el("div", "pg-goal" + (m.complete ? " is-complete" : ""));
    row.appendChild(el("div", "pg-goal-t", (g.icon || "\uD83C\uDFAF") + " " + g.title + (g.sharedGoalId ? " \uD83E\uDD1D" : "")));
    var gbar = el("div", "pt-cap"); var gf = el("div", "pt-cap-fill"); gf.style.width = Math.max(m.pct ? m.pct : 3, 3) + "%"; gbar.appendChild(gf); row.appendChild(gbar);
    var line = m.complete ? tr("Finished. You did this.") : m.pct >= 75 ? tr("{n}% there. The finish line is close.", { n: m.pct }) : m.pct >= 50 ? tr("{n}% there. Past halfway.", { n: m.pct }) : m.done ? tr("{a} of {b} steps done.", { a: m.done, b: m.total }) : tr("Ready when you are. {n} small steps.", { n: m.total });
    row.appendChild(el("div", "hint", line));
    if (m.next && !m.complete) row.appendChild(el("div", "pg-goal-next", tr("Next") + ": " + m.next.title));
    gs.appendChild(row);
  });
  wrap.appendChild(gs);

  /* 6. Almost there: the next one or two badges, with real counts */
  var near = [], earned = s.rewards.badges || {};
  Object.keys(snap.allBadges).forEach(function (id) { if (!earned[id]) near.push(id); });
  near.sort(function (a, b) { var pa = BADGE_PROGRESS[a] ? 0 : 1, pb = BADGE_PROGRESS[b] ? 0 : 1; return pa - pb; });
  var nb = el("section", "pg-card pg-near"); nb.appendChild(el("h3", null, "\uD83C\uDF81 " + tr("Almost there")));
  near.slice(0, 2).forEach(function (id) {
    var b = snap.allBadges[id], need = BADGE_PROGRESS[id], r = el("div", "pg-near-row");
    r.appendChild(el("b", null, tr(b.name)));
    r.appendChild(el("span", "hint", need ? tr("{a} of {b}", { a: Math.min(need, snap.total), b: need }) + " \u00b7 " + tr(b.desc) : tr(b.desc)));
    if (need) { var nbar = el("div", "pt-cap"); var nf = el("div", "pt-cap-fill"); nf.style.width = Math.max(3, Math.min(100, Math.round(snap.total * 100 / need))) + "%"; nbar.appendChild(nf); r.appendChild(nbar); }
    nb.appendChild(r);
  });
  if (!near.length) nb.appendChild(el("p", "hint", tr("You earned every badge. Wow.")));
  wrap.appendChild(nb);

  /* 7. Recent wins: proof that you are doing it */
  var recent = (s.rewards.log || []).slice(-5).reverse();
  var rw = el("section", "pg-card pg-recent"); rw.appendChild(el("h3", null, "\uD83C\uDF89 " + tr("Recent wins")));
  if (!recent.length) rw.appendChild(el("p", "hint", tr("Your wins will show up here.")));
  recent.forEach(function (e) {
    var t = s.tasks.filter(function (x) { return x.id === e.taskId; })[0];
    var li = el("div", "pg-win"); li.appendChild(el("span", "pg-win-t", "\u2713 " + (t ? t.title : tr("A step you finished"))));
    li.appendChild(el("span", "hint", e.key === td ? tr("Today") : e.key)); rw.appendChild(li);
  });
  wrap.appendChild(rw);

  /* 8. Badges: earned ones glow, the rest wait with a lock */
  var all = el("section", "pg-card pg-all"); all.appendChild(el("h3", null, "\uD83C\uDFC5 " + tr("Badges") + " " + Object.keys(earned).length + "/" + Object.keys(snap.allBadges).length));
  var grid = el("div", "rw-badges pg-badges");
  Object.keys(snap.allBadges).sort(function (a, b) { return (earned[b] ? 1 : 0) - (earned[a] ? 1 : 0); }).forEach(function (id) {
    var on = !!earned[id], b = snap.allBadges[id];
    var d = el("div", "rw-badge" + (on ? " is-on" : ""), null, { title: tr(b.desc), "data-b": id });
    d.appendChild(el("span", "rw-b-e", on ? (BADGE_EMO[id] || "\u2B50") : "\uD83D\uDD12")); d.appendChild(el("b", null, tr(b.name)));
    grid.appendChild(d);
  });
  all.appendChild(grid); wrap.appendChild(all);
  var why = el("details", "pg-card pg-why"); why.appendChild(el("summary", null, "\u2139\uFE0F " + tr("How it works")));
  [["\u2705", "Finish a task = a win"], ["\u2728", "Wins give sparks"], ["\uD83D\uDDFA\uFE0F", "Sparks move you along the trail"], ["\uD83C\uDFC5", "New things you do unlock badges"], ["\uD83C\uDF19", "Rest days never break your streak"]].forEach(function (r) { why.appendChild(el("p", "pg-why-row", r[0] + " " + tr(r[1]))); });
  wrap.appendChild(why);
  root.appendChild(wrap);
}

/* The settings page is already a one-at-a-time accordion (app.js). A jump chip now also opens its card. */
function wireJumpOpen() {
  [].forEach.call(document.querySelectorAll("#panel-settings [data-jump]"), function (b) {
    b.addEventListener("click", function () { var g = $(b.getAttribute("data-jump")); if (g && g.classList.contains("sg-fold") && !g.classList.contains("is-open")) { var h = g.querySelector(":scope > h3"); if (h) h.click(); } });
  });
}
/* ============ settings ============ */
function wireSettings() {
  try { wireJumpOpen(); } catch (e) { console.error("jump", e); }
  var s = ensure(), p = s.settings.plan;
  var rf0 = $("pcReflect"); if (rf0) { rf0.checked = !!p.reflect; rf0.addEventListener("change", function () { p.reflect = rf0.checked; C.save(); C.refreshAll(); }); }
  var q = $("pcQuiet"), a = $("pcStart"), b = $("pcEnd"), o = $("pcOpen"), l = $("pcLearn"), rp = $("pcReplay");
  if (!q) return;
  q.checked = !!s.settings.quiet; a.value = p.workStart || "09:00"; b.value = p.workEnd || "17:30"; o.value = String(p.open || 28); l.checked = !!p.learn;
  document.body.classList.toggle("pace-quiet", !!s.settings.quiet);
  q.addEventListener("change", function () { s.settings.quiet = q.checked; document.body.classList.toggle("pace-quiet", q.checked); C.save(); C.refreshAll(); });
  a.addEventListener("change", function () { p.workStart = a.value || "09:00"; C.save(); C.refreshAll(); });
  b.addEventListener("change", function () { p.workEnd = b.value || "17:30"; C.save(); C.refreshAll(); });
  o.addEventListener("change", function () { p.open = +o.value; C.save(); C.refreshAll(); });
  l.addEventListener("change", function () { p.learn = l.checked; C.save(); C.refreshAll(); });
  if (rp) rp.addEventListener("click", function () { var g = $("guideAgain"); if (g) g.click(); });
}

function markFullDays() {
  var tasks = S().tasks.filter(function (t) { return !t.repeat; });
  document.querySelectorAll("#ticker .tick[data-date]").forEach(function (b) {
    var k = b.getAttribute("data-date"); var dayT = tasks.filter(function (t) { return t.date === k; });
    var cap = P.capacity(dayT, C.levelFor(k), planSettings()), mins = P.planDay ? dayT.filter(function (t) { return t.status !== "done"; }).reduce(function (a, t) { return a + P.minutesOf(t, calib()); }, 0) : 0;
    var full = mins > cap.usableMin && mins > 0;
    b.classList.toggle("is-full", full); if (full) b.setAttribute("title", tr("This day is full")); else b.removeAttribute("title");
  });
}
function render() {
  try { markFullDays(); } catch (e) { console.error("PaceUI ticker", e); }
  try { document.body.classList.toggle("pace-quiet", quiet()); renderToday(); renderChip(); renderRewards(); renderCaptured(); renderGoalPaths(); } catch (e) { console.error("PaceUI", e); }
}

function processing(label) { var s = ensure(); var e = { id: C.uid(), text: label, at: Date.now(), fp: "p" + Date.now(), status: "processing", taskIds: [], notes: [], counts: {} }; s.captured.unshift(e); renderCaptured(); return e.id; }
function processingDone(id) { var s = ensure(); s.captured = s.captured.filter(function (c) { return c.id !== id; }); renderCaptured(); }
/* ============ Build 50: natural gestures ============
   Swipe a sheet down to close it. Swipe right from the left edge to go back one step:
   wizard step, then sheet, then the panel you are on. Tap outside a sheet to close it. */
(function () {
  var NO = { welcome: 1, guideSheet: 1, authSheet: 1, focusScreen: 1 };
  function topSheet() { var t = null; document.querySelectorAll(".sheet:not([hidden])").forEach(function (x) { if (!NO[x.id]) t = x; }); return t; }
  function closeSheet(sh) {
    var b = sh.querySelector("#dClose, #addCancel, #plusClose, #plansClose, #importClose, #deleteCancel, #shareClose, [id$='Close'], [id$='Cancel']");
    if (b && b.offsetParent !== null) b.click(); else sh.hidden = true;
  }
  function goBack() {
    var sh = topSheet();
    if (sh) {
      var ab = sh.querySelector("#awBack"); if (ab && !ab.hidden && ab.offsetParent !== null) { ab.click(); return true; }
      closeSheet(sh); return true;
    }
    var gb = document.querySelector(".goal-form .pstep-back:not([hidden])"); if (gb && gb.offsetParent !== null) { gb.click(); return true; }
    var act = document.querySelector(".panel.is-active");
    if (act && act.id !== "panel-calendar") { var tab = document.querySelector('#bottomTabs [data-tab="calendar"]'); if (tab) { tab.click(); return true; } }
    return false;
  }
  var drag = null, edge = null;
  document.addEventListener("touchstart", function (e) {
    drag = null; edge = null;
    if (e.touches.length !== 1) return;
    var t = e.touches[0], sh = topSheet();
    if (t.clientX < 36) { edge = { x: t.clientX, y: t.clientY, at: Date.now() }; return; }
    var inCal = e.target.closest && e.target.closest("#panel-calendar");
    if (!inCal && !(e.target.closest && e.target.closest("input, textarea, select, [contenteditable], .no-swipe-back, .time-chips, .gf-icons"))) edge = { x: t.clientX, y: t.clientY, at: Date.now(), any: true };
    var card = e.target.closest && e.target.closest(".sheet-card");
    if (sh && card && sh.contains(card) && card.scrollTop <= 0 && !(e.target.closest("input, textarea, select, [contenteditable]"))) drag = { sh: sh, card: card, y: t.clientY, x: t.clientX, dy: 0, at: Date.now(), on: false };
  }, { passive: true });
  document.addEventListener("touchmove", function (e) {
    if (!drag) return;
    var t = e.touches[0], dy = t.clientY - drag.y, dx = t.clientX - drag.x;
    if (!drag.on) { if (dy > 8 && dy > Math.abs(dx)) drag.on = true; else if (dy < -4 || Math.abs(dx) > 12) { drag = null; return; } else return; }
    drag.dy = Math.max(0, dy);
    drag.card.style.transition = "none"; drag.card.style.transform = "translateY(" + drag.dy + "px)";
    if (e.cancelable) e.preventDefault();
  }, { passive: false });
  document.addEventListener("touchend", function (e) {
    var t = (e.changedTouches && e.changedTouches[0]) || null;
    if (edge && t) {
      var dx = t.clientX - edge.x, dy = t.clientY - edge.y;
      if (dx > (edge.any ? 90 : 70) && Math.abs(dy) < (edge.any ? 45 : 60) && Math.abs(dx) > Math.abs(dy) * 2 && Date.now() - edge.at < 800) { goBack(); drag = null; }
      edge = null;
    }
    if (!drag) return;
    var d = drag; drag = null;
    if (!d.on) return;
    var fast = d.dy / Math.max(1, Date.now() - d.at) > 0.6;
    d.card.style.transition = "transform .18s ease";
    if (d.dy > 110 || (fast && d.dy > 50)) { d.card.style.transform = "translateY(100%)"; setTimeout(function () { d.card.style.transform = ""; d.card.style.transition = ""; closeSheet(d.sh); }, 160); }
    else { d.card.style.transform = ""; setTimeout(function () { d.card.style.transition = ""; }, 200); }
  }, { passive: true });
  document.addEventListener("click", function (e) {
    var sh = e.target;
    if (sh && sh.classList && sh.classList.contains("sheet") && !NO[sh.id] && sh.id !== "addSheet" && !sh.classList.contains("door-page")) closeSheet(sh);
  });
  window.PaceBack = goBack;
})();

/* ============ Build 50: every settings line gets a small picture ============ */
(function () {
  var MAP = [
    [/sign out|log out/i, "\uD83D\uDEAA"], [/download|export/i, "\uD83D\uDCE5"], [/delete.*account|delete my/i, "\uD83D\uDDD1\uFE0F"],
    [/your name|name/i, "\uD83C\uDFF7\uFE0F"], [/bad day/i, "\uD83D\uDE1F"], [/ok day/i, "\uD83D\uDE42"], [/great day/i, "\uD83D\uDE04"],
    [/evening|look back/i, "\uD83C\uDF06"], [/real task|task lengths/i, "\u23F1\uFE0F"], [/block apps/i, "\uD83D\uDED1"], [/offer focus|focus/i, "\uD83C\uDFAF"],
    [/leave this much|time open/i, "\uD83D\uDD4A\uFE0F"], [/quiet/i, "\uD83D\uDD07"], [/remind|notif/i, "\uD83D\uDD14"], [/replay|tour/i, "\uD83C\uDFAC"],
    [/plan and rewards|rewards/i, "\uD83C\uDFC6"], [/privacy/i, "\uD83D\uDD12"], [/help|support/i, "\uD83D\uDC9B"], [/import|bring/i, "\uD83D\uDCC5"],
    [/language/i, "\uD83C\uDF10"], [/sound/i, "\uD83D\uDD0A"], [/background|photo/i, "\uD83D\uDDBC\uFE0F"], [/plus|upgrade|billing/i, "\uD83D\uDC8E"],
    [/account|sign in/i, "\uD83D\uDC64"], [/data|storage|device/i, "\uD83D\uDCBE"], [/round-up|digest/i, "\uD83E\uDDFE"], [/nudge/i, "\uD83D\uDE80"],
    [/look|colour|color|theme/i, "\uD83C\uDFA8"], [/check-in|morning/i, "\uD83C\uDF24\uFE0F"], [/share|shared/i, "\uD83E\uDD1D"], [/habit/i, "\uD83C\uDF31"], [/goal/i, "\uD83C\uDFAF"]
  ];
  var HAS = /[\u2190-\u2BFF\uD83C-\uDBFF]/;
  function pick(t) { for (var i = 0; i < MAP.length; i++) if (MAP[i][0].test(t)) return MAP[i][1]; return ""; }
  function tag(node, target) {
    if (!node || node.querySelector(":scope > .ic-e")) return;
    var t = (node.textContent || "").trim(); if (!t || HAS.test(t.slice(0, 3))) return;
    var e = pick(t); if (!e) return;
    var sp = document.createElement("span"); sp.className = "ic-e"; sp.setAttribute("aria-hidden", "true"); sp.textContent = e;
    (target || node).insertBefore(sp, (target || node).firstChild);
  }
  var busy = false;
  function run() {
    var root = document.getElementById("panel-settings"); if (!root || busy) return; busy = true;
    try {
      root.querySelectorAll(".settings-group .row").forEach(function (r) {
        var pc = getComputedStyle(r, "::before").content;
        if (pc && pc !== "none" && pc !== "normal") return;
        tag(r);
      });
      root.querySelectorAll(".settings-group > summary, .settings-group > h3").forEach(function (h) { var pc = getComputedStyle(h, "::before").content; if (pc && pc !== "none" && pc !== "normal") return; tag(h); });
      root.querySelectorAll(".settings-group button.soft-btn, .settings-group button.primary-btn, #accountGroup button").forEach(function (b) { tag(b); });
    } catch (e) {}
    busy = false;
  }
  var timer = null;
  function later() { clearTimeout(timer); timer = setTimeout(run, 80); }
  var root = document.getElementById("panel-settings");
  if (root) { new MutationObserver(later).observe(root, { childList: true, subtree: true, characterData: true }); }
  document.addEventListener("click", later);
  later();
})();

var API = { processing: processing, processingDone: processingDone, render: render, capture: capture, onToggle: onToggle, planFor: planFor, previewMoves: previewMoves, createGoal: createGoal, celebrate: celebrate, get review() { return cur; } };
window.PaceUI = API;
wireLevelButtons(); wireSettings();
(function settingsTimes() {
  [["wakeTime", ["06:00", "06:30", "07:00", "07:30", "08:00", "09:00"]], ["windTime", ["21:00", "21:30", "22:00", "22:30", "23:00", "23:30"]], ["checkinTime", ["07:00", "08:00", "09:00", "10:00", "12:00"]], ["pcStart", ["08:00", "08:30", "09:00", "09:30", "10:00"]], ["pcEnd", ["16:00", "17:00", "17:30", "18:00", "19:00"]], ["nDoneTime", ["18:00", "19:00", "20:00", "21:00", "22:00"]]].forEach(function (x) {
    var inp = $(x[0]); if (!inp) return;
    var lab = inp.closest("label");
    /* the label is a <label>: put the chips after it so tapping a chip never re-clicks the input */
    var row = timeChips(inp, x[1]); if (row && lab) { lab.classList.add("row-time"); lab.parentNode.insertBefore(row, lab.nextSibling); }
  });
})();

var gr = $("goalsRoot");
if (gr && window.MutationObserver) new MutationObserver(function () { if (!$("paceGoalPath") && (S().goals || []).length) renderGoalPaths(); }).observe(gr, { childList: true });
var dt = $("dumpText"); if (dt) dt.addEventListener("input", function () { var m = $("captureMsg"); if (m && /safe here/.test(m.textContent)) m.textContent = ""; });
render();
})();
