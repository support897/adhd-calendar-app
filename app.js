/* Calm Calendar app. Self contained: data lives on this device only.
   The calendar grid shows the whole truth. The list under it is the day,
   adapted to how you feel. Parked means parked, never dropped. */
(function () {
"use strict";
var L = window.CalmLogic;
var STORE = "calmcal-v1";
var state = load();
var selected = L.todayKey();
var currentView = "dayGridMonth";
var calendar = null;
var currentTaskId = null;
var currentInstanceDate = null;
var drafts = [];

function uid() { return "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function $(id) { return document.getElementById(id); }

function defaultSettings() {
  return {
    checkinTime: "08:00",
    names: { low: "Low", steady: "Steady", full: "Full" },
    notif: { perm: "off", checkin: true, start: true, setup: 5, digest: true, digestTimes: ["12:30", "16:30"], done: false, doneTime: "20:00" },
    pausedDate: null,
    appearance: { theme: "white", cute: false },
    sidebarCollapsed: false
  };
}
function isObj(x) { return !!x && typeof x === "object" && !Array.isArray(x); }
/* A clock time as HH:MM if it is a real time of day, else null. */
function validClock(x) {
  var m = /^(\d{1,2}):(\d{2})$/.exec(String(x == null ? "" : x).trim());
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  return L.pad(+m[1]) + ":" + m[2];
}
function load() {
  try {
    var raw = localStorage.getItem(STORE);
    if (!raw) return null;
    var s = JSON.parse(raw);
    if (!isObj(s)) return null;
    /* Normalise every field the app leans on. All of a user's data lives in
       this one key; a wrong-shaped field must recover, never brick the app. */
    if (!Array.isArray(s.tasks)) s.tasks = [];
    s.tasks = s.tasks.filter(function (t) { return isObj(t) && typeof t.title === "string"; });
    s.tasks.forEach(function (t) {
      if (!t.id) t.id = uid();
      if (typeof t.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) t.date = L.todayKey();
      if (!Array.isArray(t.skipDates)) t.skipDates = [];
      if (!Array.isArray(t.doneDates)) t.doneDates = [];
      if (!Array.isArray(t.steps)) t.steps = [];
      if (typeof t.durationMin !== "number" || !(t.durationMin > 0)) t.durationMin = 25;
      if (typeof t.status !== "string") t.status = "todo";
    });
    if (!isObj(s.feelings)) s.feelings = {};
    if (!isObj(s.sent)) s.sent = {};
    s.settings = Object.assign(defaultSettings(), isObj(s.settings) ? s.settings : {});
    s.settings.notif = Object.assign(defaultSettings().notif, isObj(s.settings.notif) ? s.settings.notif : {});
    if (!isObj(s.settings.names)) s.settings.names = defaultSettings().names;
    ["low", "steady", "full"].forEach(function (k) {
      if (typeof s.settings.names[k] !== "string" || !s.settings.names[k].trim()) s.settings.names[k] = defaultSettings().names[k];
    });
    s.settings.appearance = Object.assign(defaultSettings().appearance, isObj(s.settings.appearance) ? s.settings.appearance : {});
    if (typeof s.settings.sidebarCollapsed !== "boolean") s.settings.sidebarCollapsed = !!s.settings.sidebarCollapsed;
    var times = (Array.isArray(s.settings.notif.digestTimes) ? s.settings.notif.digestTimes : []).map(validClock).filter(Boolean);
    s.settings.notif.digestTimes = times.length ? times : ["12:30"];
    s.welcomed = !!s.welcomed;
    return s;
  } catch (e) {}
  return null;
}
function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} }

function seed() {
  var today = L.todayKey(), tomorrow = L.addDays(today, 1);
  function mk(title, date, time, dur, extra) {
    var cat = L.categoryFor(title);
    return Object.assign({ id: uid(), title: title, date: date, time: time, durationMin: dur, priority: 0, repeat: null, category: cat.id, color: cat.color, essential: false, status: "todo", steps: L.decompose(title, dur, false), minVersion: "", fullVersion: "", source: "sample", originalText: "", skipDates: [], doneDates: [] }, extra || {});
  }
  var tasks = [
    mk("Doctor appointment", today, "10:00", 45, { essential: true, minVersion: "Ring the doctor to rebook" }),
    mk("Pay the electricity bill", today, null, 15, { essential: true, priority: 3 }),
    mk("Clean the kitchen", today, "16:00", 30, {}),
    mk("Reply to one email", today, null, 10, {}),
    mk("Walk around the block", today, "17:30", 15, {}),
    mk("Plan the weekend", today, null, 45, {}),
    mk("Buy groceries for the week", tomorrow, null, 45, {}),
    mk("Call mum", tomorrow, "17:00", 15, {})
  ];
  return { tasks: tasks, feelings: {}, settings: defaultSettings(), welcomed: false, sent: {} };
}
if (!state) { state = seed(); save(); }

/* ---------- instances (recurrence expansion) ---------- */
function repeatMatches(task, key) {
  if (!task.repeat) return key === task.date;
  if (key < task.date) return false;
  var d = L.parseKey(key), wd = d.getDay();
  var r = task.repeat;
  if (r === "every day") return true;
  if (r === "every weekday") return wd >= 1 && wd <= 5;
  if (r === "every weekend") return wd === 0 || wd === 6;
  if (r === "every week") return wd === L.parseKey(task.date).getDay();
  var names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  if (r === "every " + names[wd]) return true;
  return false;
}
function instanceOf(task, key) {
  var copy = {}; for (var k in task) copy[k] = task[k];
  copy.date = key;
  copy.instanceDate = key;
  if (task.repeat && (task.doneDates || []).indexOf(key) !== -1) copy.status = "done";
  return copy;
}
function tasksOn(key) {
  var out = [];
  state.tasks.forEach(function (t) {
    if ((t.skipDates || []).indexOf(key) !== -1) return;
    if (repeatMatches(t, key)) out.push(instanceOf(t, key));
  });
  return out;
}
function instancesInRange(a, b) {
  var out = [], key = a;
  while (key <= b) { out = out.concat(tasksOn(key)); key = L.addDays(key, 1); }
  return out;
}
function baseTask(id) { return state.tasks.filter(function (t) { return t.id === id; })[0]; }
function levelFor(key) { return state.feelings[key] || "steady"; }
function adaptedFor(key) {
  return L.adaptDay(tasksOn(key), levelFor(key), tasksOn(L.addDays(key, 1)));
}

/* ---------- appearance + sidebar ---------- */
var THEME_COLORS = { white: "#ffffff", dark: "#161618", blush: "#fff8fa", sky: "#f7fbff", mint: "#f6fcf8", lavender: "#faf8ff" };
function applyAppearance() {
  var a = state.settings.appearance;
  var root = document.documentElement;
  root.setAttribute("data-theme", a.theme || "white");
  if (a.cute) root.setAttribute("data-cute", "1"); else root.removeAttribute("data-cute");
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLORS[a.theme] || "#ffffff");
  document.querySelectorAll(".swatch").forEach(function (b) { b.classList.toggle("is-active", b.getAttribute("data-theme-set") === a.theme); });
  $("cuteToggle").checked = !!a.cute;
}
function applySidebar() {
  var root = document.documentElement;
  if (state.settings.sidebarCollapsed) root.setAttribute("data-sb", "collapsed"); else root.removeAttribute("data-sb");
  $("sbToggle").checked = !state.settings.sidebarCollapsed;
}
document.querySelectorAll(".swatch").forEach(function (b) {
  b.addEventListener("click", function () { state.settings.appearance.theme = b.getAttribute("data-theme-set"); save(); applyAppearance(); });
});
$("cuteToggle").addEventListener("change", function () { state.settings.appearance.cute = $("cuteToggle").checked; save(); applyAppearance(); });
$("sbCollapse").addEventListener("click", function () { state.settings.sidebarCollapsed = true; save(); applySidebar(); });
$("sbExpand").addEventListener("click", function () { state.settings.sidebarCollapsed = false; save(); applySidebar(); });
$("sbToggle").addEventListener("change", function () { state.settings.sidebarCollapsed = !$("sbToggle").checked; save(); applySidebar(); });
function renderRing() {
  var score = L.dayScore(adaptedFor(L.todayKey()));
  var fg = $("ringFg");
  if (fg) fg.style.strokeDashoffset = String(113 * (1 - score.pct / 100));
  var pct = $("ringPct");
  if (pct) pct.textContent = score.pct + "%";
}

/* ---------- toast ---------- */
var toastTimer = null;
function toast(msg) {
  var t = $("toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 3400);
}

/* ---------- ticker ---------- */
function renderTicker() {
  var el = $("ticker"); el.innerHTML = "";
  var start = L.addDays(selected, -15);
  var names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (var i = 0; i < 31; i++) {
    (function (key) {
      var d = L.parseKey(key);
      var btn = document.createElement("button");
      btn.className = "tick" + (key === L.todayKey() ? " is-today" : "") + (key === selected ? " is-selected" : "");
      btn.setAttribute("data-date", key);
      var dayTasks = tasksOn(key).filter(function (t) { return t.status !== "done"; });
      var pills = "", seen = {};
      dayTasks.slice(0, 12).forEach(function (t) { if (!seen[t.color]) { seen[t.color] = 1; pills += '<span class="tick-pill" style="background:' + t.color + '"></span>'; } });
      btn.innerHTML = '<span class="tick-wd">' + names[d.getDay()] + '</span><span class="tick-num">' + d.getDate() + '</span><span class="tick-pills">' + pills + "</span>";
      btn.addEventListener("click", function () { selectDate(key, true); });
      el.appendChild(btn);
    })(L.addDays(start, i));
  }
  var sel = el.querySelector('[data-date="' + selected + '"]');
  if (sel) el.scrollTo({ left: sel.offsetLeft - el.clientWidth / 2 + 26, behavior: tickerBooted ? "smooth" : "auto" });
  tickerBooted = true;
}
var tickerBooted = false;

/* ---------- day list (the adapted plan) ---------- */
function renderDayList() {
  var key = selected;
  var ad = adaptedFor(key);
  var score = L.dayScore(ad);
  var d = L.parseKey(key);
  var level = levelFor(key);
  var names = state.settings.names;
  var html = "<h3>" + d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" }) +
    '<span class="dl-score">' + score.done + " of " + score.total + " done at your " + esc(names[level]) + " pace</span></h3>";
  html += '<div class="dl-progress"><i style="width:' + score.pct + '%"></i></div>';
  if (!ad.visible.length && !ad.done.length) html += '<p class="empty-note">Nothing showing for this day. Add one small thing, or leave it empty. Empty is allowed.</p>';
  ad.visible.forEach(function (t) { html += rowHtml(t, false); });
  ad.done.forEach(function (t) { html += rowHtml(t, true); });
  if (ad.stretch) html += '<div class="stretch-note">Feeling full. One more from tomorrow, only if you want it: <strong>' + esc(ad.stretch.title) + '</strong><button data-act="stretch" data-id="' + ad.stretch.id + '">Bring it to today</button></div>';
  if (ad.parked.length) html += '<p class="parked-note">' + ad.parked.length + (ad.parked.length === 1 ? " thing is" : " things are") + " parked for this pace. Parked, not dropped. Raise the day’s level and they come back.</p>";
  $("dayList").innerHTML = html;
  bindRows($("dayList"));
}
function rowHtml(t, done) {
  var meta = [];
  if (t.time) meta.push(t.time);
  meta.push("about " + t.durationMin + " min");
  if (t.steps && t.steps.length) meta.push(t.steps.filter(function (s) { return s.done; }).length + " of " + t.steps.length + " steps");
  if (t.shrunk) meta.push("small version");
  if (t.repeat) meta.push(t.repeat);
  return '<div draggable="true" class="task-row' + (done ? " is-done" : "") + '" data-id="' + t.id + '" data-date="' + t.instanceDate + '">' +
    '<span class="tr-dot" style="background:' + t.color + '"></span>' +
    '<span class="tr-main"><span class="tr-title">' + esc(t.displayTitle || t.title) + '</span><span class="tr-meta">' + esc(meta.join(" · ")) + "</span></span>" +
    '<button class="tr-check" data-check="' + t.id + '" aria-label="Mark done">' + (done ? "✓" : "") + "</button></div>";
}
function bindRows(root) {
  root.querySelectorAll(".task-row").forEach(function (row) {
    row.addEventListener("click", function (e) {
      if (e.target.hasAttribute("data-check")) return;
      openTask(row.getAttribute("data-id"), row.getAttribute("data-date"));
    });
  });
  root.querySelectorAll("[data-check]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var row = btn.closest(".task-row");
      toggleDone(row.getAttribute("data-id"), row.getAttribute("data-date"));
    });
  });
  var st = root.querySelector('[data-act="stretch"]');
  if (st) st.addEventListener("click", function () {
    var t = baseTask(st.getAttribute("data-id"));
    if (t) { moveInstance(t, L.addDays(selected, 1), selected); toast("Brought to today. Only because you asked."); refreshAll(); }
  });
}
function toggleDone(id, dateKey) {
  var t = baseTask(id); if (!t) return;
  if (t.repeat) {
    t.doneDates = t.doneDates || [];
    var i = t.doneDates.indexOf(dateKey);
    if (i === -1) t.doneDates.push(dateKey); else t.doneDates.splice(i, 1);
  } else {
    t.status = t.status === "done" ? "todo" : "done";
    if (t.status === "done") toast("Done. That counts.");
  }
  save(); refreshAll();
}
/* Move one occurrence of a (possibly repeating) task to another date. */
function moveInstance(t, fromKey, toKey) {
  if (t.repeat || fromKey !== t.date) {
    t.skipDates = t.skipDates || [];
    if (t.skipDates.indexOf(fromKey) === -1) t.skipDates.push(fromKey);
    var copy = {}; for (var k in t) copy[k] = t[k];
    copy.id = uid(); copy.date = toKey; copy.repeat = null; copy.skipDates = []; copy.doneDates = [];
    copy.steps = (t.steps || []).map(function (s) { return { text: s.text, done: s.done }; });
    state.tasks.push(copy);
    return copy;
  }
  t.date = toKey;
  return t;
}

/* ---------- up next ---------- */
function renderUpNext() {
  var el = $("upNext");
  var today = L.todayKey();
  if (selected !== today) { el.hidden = true; return; }
  var ad = adaptedFor(today);
  var now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
  var timed = ad.visible.filter(function (t) { return t.time && L.toMin(t.time) >= nowMin; });
  var next = timed[0] || ad.visible[0];
  if (!next) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = '<span class="un-label">Up next</span><strong>' + esc(next.displayTitle || next.title) + "</strong> · about " + next.durationMin + " min" +
    (next.time ? " · " + next.time : "") + "<br><span style='color:var(--ink-3)'>First step: " + esc(L.nextStepText(next)) + '</span><button data-un="' + next.id + '">Start</button>';
  el.querySelector("[data-un]").addEventListener("click", function () {
    var t = baseTask(next.id); if (t) { t.status = "doing"; save(); refreshAll(); toast("Started. One step at a time."); }
  });
}

/* ---------- check-in ---------- */
function renderCheckin() {
  var level = state.feelings[selected];
  document.querySelectorAll(".level-btn").forEach(function (b) {
    b.classList.toggle("is-active", b.getAttribute("data-level") === level);
  });
  var names = state.settings.names;
  document.querySelectorAll("[data-level-name]").forEach(function (s) { s.textContent = names[s.getAttribute("data-level-name")]; });
  var sl = $("sideLevel");
  var todayLevel = state.feelings[L.todayKey()];
  sl.innerHTML = todayLevel ? "Today: <strong>" + esc(names[todayLevel]) + "</strong>" : "No check-in yet today";
  $("checkinQ").textContent = selected === L.todayKey() ? "How are you feeling today?" : "How does this day feel?";
}
document.querySelectorAll(".level-btn").forEach(function (b) {
  b.addEventListener("click", function () {
    var level = b.getAttribute("data-level");
    state.feelings[selected] = level; save();
    if (level === "low") toast("Small day. The rest is parked, safe.");
    else if (level === "full") toast("Full day. Everything is on the table.");
    else toast("Steady day. A small, capped list.");
    refreshAll();
  });
});

/* ---------- calendar ---------- */
function fcEvents() {
  var a = L.addDays(selected, -45), b = L.addDays(selected, 80);
  return instancesInRange(a, b).map(function (t) {
    var ev = { id: t.id + "@" + t.instanceDate, taskId: t.id, instanceDate: t.instanceDate, title: t.title, allDay: !t.time, backgroundColor: t.color, borderColor: t.color, extendedProps: { taskId: t.id, instanceDate: t.instanceDate } };
    if (t.time) {
      var startMin = L.toMin(t.time);
      ev.start = t.instanceDate + "T" + t.time + ":00";
      ev.end = t.instanceDate + "T" + L.toHHMM(startMin + t.durationMin) + ":00";
      if (startMin + t.durationMin >= 1440) { ev.end = L.addDays(t.instanceDate, 1) + "T" + L.toHHMM(startMin + t.durationMin) + ":00"; }
    } else { ev.start = t.instanceDate; }
    if (t.status === "done") ev.classNames = ["ev-done"];
    return ev;
  });
}
function initCalendar() {
  calendar = new FullCalendar.Calendar($("calendar"), {
    initialView: "dayGridMonth",
    height: "auto",
    firstDay: 1,
    headerToolbar: false,
    editable: true,
    eventDurationEditable: true,
    longPressDelay: 250,
    events: fcEvents(),
    dateClick: function (info) { selectDate(info.dateStr.slice(0, 10), false); },
    eventClick: function (info) { openTask(info.event.extendedProps.taskId, info.event.extendedProps.instanceDate); },
    eventDrop: function (info) {
      var t = baseTask(info.event.extendedProps.taskId); if (!t) return;
      var fromKey = info.event.extendedProps.instanceDate;
      var newStart = info.event.start;
      var newKey = L.toKey(newStart);
      if (t.repeat || fromKey !== t.date) {
        var copy = moveInstance(t, fromKey, newKey);
        if (info.event.allDay === false && newStart.getHours() !== undefined) copy.time = L.pad(newStart.getHours()) + ":" + L.pad(newStart.getMinutes());
      } else {
        t.date = newKey;
        if (!info.event.allDay) t.time = L.pad(newStart.getHours()) + ":" + L.pad(newStart.getMinutes());
      }
      save(); refreshAll(); toast("Moved. The day re-shaped itself.");
    },
    eventResize: function (info) {
      var t = baseTask(info.event.extendedProps.taskId); if (!t) return;
      var mins = Math.max(5, Math.round((info.event.end - info.event.start) / 60000));
      t.durationMin = mins; save(); refreshAll();
    },
    datesSet: function () { renderTitle(); }
  });
  calendar.render();
  var style = document.createElement("style");
  style.textContent = ".ev-done{opacity:.45} .ev-done .fc-event-title{text-decoration:line-through}";
  document.head.appendChild(style);
}
function renderTitle() {
  var d = calendar ? calendar.getDate() : L.parseKey(selected);
  $("monthTitle").textContent = d.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}
function refreshCalendar() {
  if (!calendar) return;
  calendar.removeAllEvents();
  fcEvents().forEach(function (e) { calendar.addEvent(e); });
}
function selectDate(key, jumpCalendar) {
  selected = key;
  if (calendar && jumpCalendar) calendar.gotoDate(key);
  renderTicker(); renderDayList(); renderUpNext(); renderCheckin(); renderYear();
}
$("monthTitle").addEventListener("click", function () { selectDate(L.todayKey(), true); });
document.querySelectorAll(".segmented button").forEach(function (b) {
  b.addEventListener("click", function () {
    document.querySelectorAll(".segmented button").forEach(function (x) { x.classList.remove("is-active"); });
    b.classList.add("is-active");
    var v = b.getAttribute("data-view");
    currentView = v;
    if (v === "year") { $("calendar").hidden = true; $("yearView").hidden = false; renderYear(); }
    else { $("calendar").hidden = false; $("yearView").hidden = true; calendar.changeView(v, selected); }
  });
});
function renderYear() {
  if (currentView !== "year") return;
  var year = L.parseKey(selected).getFullYear();
  var html = '<div class="year-grid">';
  var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  for (var m = 0; m < 12; m++) {
    var first = new Date(year, m, 1);
    var daysIn = new Date(year, m + 1, 0).getDate();
    var lead = (first.getDay() + 6) % 7;
    html += '<div class="mini-month"><h4>' + monthNames[m] + '</h4><div class="mm-grid">';
    for (var i = 0; i < lead; i++) html += '<span class="mm-day mm-blank"></span>';
    for (var dnum = 1; dnum <= daysIn; dnum++) {
      var key = year + "-" + L.pad(m + 1) + "-" + L.pad(dnum);
      var count = tasksOn(key).filter(function (t) { return t.status !== "done"; }).length;
      var cls = "mm-day" + (count === 1 ? " has-1" : count === 2 ? " has-2" : count >= 3 ? " has-3" : "") + (key === L.todayKey() ? " is-today" : "");
      html += '<button class="' + cls + '" data-ydate="' + key + '">' + dnum + "</button>";
    }
    html += "</div></div>";
  }
  $("yearView").innerHTML = html + "</div>";
  $("yearView").querySelectorAll("[data-ydate]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelector('.segmented button[data-view="timeGridDay"]').click();
      selectDate(btn.getAttribute("data-ydate"), true);
    });
  });
}

/* ---------- panels ---------- */
document.querySelectorAll(".side-item").forEach(function (b) {
  b.addEventListener("click", function () {
    document.querySelectorAll(".side-item").forEach(function (x) { x.classList.remove("is-active"); });
    document.querySelectorAll(".panel").forEach(function (x) { x.classList.remove("is-active"); });
    b.classList.add("is-active");
    $("panel-" + b.getAttribute("data-panel")).classList.add("is-active");
    if (b.getAttribute("data-panel") === "progress") renderProgress();
  });
});
function showPanel(name) { document.querySelector('.side-item[data-panel="' + name + '"]').click(); }

/* ---------- quick add ---------- */
$("addBtn").addEventListener("click", function () {
  $("quickText").value = ""; $("fTitle").value = "";
  $("fDate").value = selected; $("fTime").value = ""; $("fDur").value = 25;
  $("fMin").value = ""; $("fFull").value = ""; $("fEssential").checked = false;
  $("quickPreview").hidden = true;
  $("addSheet").hidden = false;
  setTimeout(function () { $("quickText").focus(); }, 50);
});
$("addCancel").addEventListener("click", function () { $("addSheet").hidden = true; });
$("quickText").addEventListener("input", function () {
  var v = $("quickText").value.trim();
  if (!v) { $("quickPreview").hidden = true; return; }
  var item = L.parseItem(v, selected);
  if (!item) { $("quickPreview").hidden = true; return; }
  $("quickPreview").hidden = false;
  $("quickPreview").innerHTML = "<strong>" + esc(item.title) + "</strong><br>" +
    esc(L.parseKey(item.date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })) +
    (item.time ? " at " + item.time : " · no time yet") + " · about " + item.durationMin + " min" +
    (item.repeat ? " · " + esc(item.repeat) : "") + (item.essential ? " · must not slip" : "");
});
$("addSave").addEventListener("click", function () {
  var task = null;
  var manualTitle = $("fTitle").value.trim();
  if (manualTitle) {
    var cat = L.categoryFor(manualTitle);
    task = { title: manualTitle, date: $("fDate").value || selected, time: $("fTime").value || null, durationMin: Math.max(5, +$("fDur").value || 25), priority: 0, repeat: null, category: cat.id, color: cat.color, essential: $("fEssential").checked, steps: L.decompose(manualTitle, +$("fDur").value || 25, false), minVersion: $("fMin").value.trim(), fullVersion: $("fFull").value.trim() };
  } else if ($("quickText").value.trim()) {
    var item = L.parseItem($("quickText").value.trim(), selected);
    if (item) task = { title: item.title, date: item.date, time: item.time, durationMin: item.durationMin, priority: item.priority, repeat: item.repeat, category: item.category, color: item.color, essential: item.essential, steps: item.steps, minVersion: $("fMin").value.trim(), fullVersion: $("fFull").value.trim() };
  }
  if (!task) { toast("Give it a title first, even a messy one."); return; }
  task.id = uid(); task.status = "todo"; task.source = "manual"; task.originalText = $("quickText").value.trim(); task.skipDates = []; task.doneDates = [];
  state.tasks.push(task); save();
  $("addSheet").hidden = true;
  selectDate(task.date, true); refreshAll();
  toast("Added. Small and clear.");
});

/* ---------- task sheet ---------- */
function openTask(id, instanceDate) {
  var t = baseTask(id); if (!t) return;
  currentTaskId = id; currentInstanceDate = instanceDate || t.date;
  var inst = instanceOf(t, currentInstanceDate);
  $("dTitle").textContent = inst.title;
  var meta = [];
  meta.push(L.parseKey(currentInstanceDate).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" }));
  if (inst.time) meta.push(inst.time);
  meta.push("about " + inst.durationMin + " min");
  if (inst.repeat) meta.push("repeats " + inst.repeat + " · changes to date or done apply to this day only");
  if (inst.source === "sample") meta.push("sample task");
  $("dMeta").textContent = meta.join(" · ");
  renderSteps(t);
  $("dMin").value = t.minVersion || "";
  $("dFull").value = t.fullVersion || "";
  $("dDate").value = currentInstanceDate;
  $("dTime").value = t.time || "";
  $("dDur").value = t.durationMin;
  $("dEssential").checked = !!t.essential;
  if (t.originalText) { $("dOriginalWrap").hidden = false; $("dOriginal").textContent = t.originalText; }
  else $("dOriginalWrap").hidden = true;
  $("taskSheet").hidden = false;
}
function renderSteps(t) {
  var box = $("dSteps");
  if (!t.steps || !t.steps.length) { box.innerHTML = '<p class="hint">No steps yet. This one is small enough to be a single step.</p>'; return; }
  box.innerHTML = t.steps.map(function (s, i) {
    return '<label class="step-row' + (s.done ? " is-done" : "") + '"><input type="checkbox" data-step="' + i + '"' + (s.done ? " checked" : "") + "><span>" + esc(s.text) + "</span></label>";
  }).join("");
  box.querySelectorAll("[data-step]").forEach(function (cb) {
    cb.addEventListener("change", function () {
      t.steps[+cb.getAttribute("data-step")].done = cb.checked;
      save(); renderSteps(t); refreshAll();
    });
  });
}
$("dBreak").addEventListener("click", function () {
  var t = baseTask(currentTaskId); if (!t) return;
  if (!t.steps || !t.steps.length) t.steps = L.decompose(t.title, t.durationMin, true);
  else t.steps = t.steps.concat(L.decompose(t.title, t.durationMin, true));
  save(); renderSteps(t); refreshAll(); toast("Broken down. Only the first step matters right now.");
});
function persistSheetFields() {
  var t = baseTask(currentTaskId); if (!t) return;
  t.minVersion = $("dMin").value.trim();
  t.fullVersion = $("dFull").value.trim();
  t.time = $("dTime").value || null;
  t.durationMin = Math.max(5, +$("dDur").value || t.durationMin);
  t.essential = $("dEssential").checked;
  var newDate = $("dDate").value;
  if (newDate && newDate !== currentInstanceDate) {
    moveInstance(t, currentInstanceDate, newDate);
    currentInstanceDate = newDate;
  }
  save();
}
["dMin", "dFull", "dTime", "dDur", "dEssential", "dDate"].forEach(function (id) {
  $(id).addEventListener("change", function () { persistSheetFields(); refreshAll(); });
});
$("dClose").addEventListener("click", function () { persistSheetFields(); $("taskSheet").hidden = true; refreshAll(); });
$("dDone").addEventListener("click", function () { persistSheetFields(); toggleDone(currentTaskId, currentInstanceDate); $("taskSheet").hidden = true; });
$("dDoing").addEventListener("click", function () {
  var t = baseTask(currentTaskId); if (!t) return;
  persistSheetFields();
  if (t.repeat) { t.doneDates = (t.doneDates || []).filter(function (d) { return d !== currentInstanceDate; }); }
  t.status = "doing"; save(); $("taskSheet").hidden = true; refreshAll(); toast("Doing. One step at a time.");
});
$("dNotToday").addEventListener("click", function () {
  var t = baseTask(currentTaskId); if (!t) return;
  persistSheetFields();
  moveInstance(t, currentInstanceDate, L.addDays(currentInstanceDate, 1));
  save(); $("taskSheet").hidden = true; refreshAll();
  toast("Moved to tomorrow. That counts as handling it.");
});
$("dDelete").addEventListener("click", function () {
  var t = baseTask(currentTaskId); if (!t) return;
  if (t.repeat) {
    t.skipDates = t.skipDates || [];
    if (t.skipDates.indexOf(currentInstanceDate) === -1) t.skipDates.push(currentInstanceDate);
    toast("Removed for this day. The rest of the series stays.");
  } else {
    state.tasks = state.tasks.filter(function (x) { return x.id !== currentTaskId; });
    toast("Deleted.");
  }
  save(); $("taskSheet").hidden = true; refreshAll();
});

/* ---------- capture ---------- */
$("parseBtn").addEventListener("click", function () {
  var text = $("dumpText").value;
  drafts = L.parseDump(text, L.todayKey());
  if (!drafts.length) { $("captureMsg").textContent = "Nothing I could sort yet. Try one thing per line, like: call the dentist tomorrow at 3pm."; return; }
  $("captureMsg").textContent = "";
  renderDrafts(text);
});
function renderDrafts(original) {
  $("draftArea").hidden = false;
  $("originalText").textContent = original;
  var box = $("draftList"); box.innerHTML = "";
  drafts.forEach(function (d, i) {
    var card = document.createElement("div");
    card.className = "draft-card";
    card.innerHTML = '<span class="tr-dot" style="background:' + d.color + '"></span><div style="flex:1">' +
      '<input type="text" data-f="title" value="' + esc(d.title) + '">' +
      '<div class="dc-meta"><input type="date" data-f="date" value="' + d.date + '"><input type="time" data-f="time" value="' + (d.time || "") + '"><input type="number" data-f="durationMin" value="' + d.durationMin + '" min="5" step="5" style="width:76px"><span class="hint">min</span>' +
      (d.repeat ? '<span class="hint">' + esc(d.repeat) + "</span>" : "") + (d.essential ? '<span class="hint">must not slip</span>' : "") + "</div>" +
      (d.steps && d.steps.length ? '<ol class="dc-steps">' + d.steps.map(function (s) { return "<li>" + esc(s.text) + "</li>"; }).join("") + "</ol>" : "") +
      '</div><button class="dc-del" data-del="' + i + '">Remove</button>';
    card.querySelectorAll("[data-f]").forEach(function (inp) {
      inp.addEventListener("change", function () {
        var f = inp.getAttribute("data-f");
        if (f === "durationMin") drafts[i].durationMin = Math.max(5, +inp.value || 25);
        else if (f === "time") drafts[i].time = inp.value || null;
        else drafts[i][f] = inp.value;
      });
    });
    card.querySelector("[data-del]").addEventListener("click", function () { drafts.splice(i, 1); renderDrafts(original); });
    box.appendChild(card);
  });
}
$("draftClear").addEventListener("click", function () { drafts = []; $("draftArea").hidden = true; $("dumpText").value = ""; });
$("draftAddAll").addEventListener("click", function () {
  var original = $("dumpText").value;
  drafts.forEach(function (d) {
    state.tasks.push({ id: uid(), title: d.title, date: d.date, time: d.time, durationMin: d.durationMin, priority: d.priority, repeat: d.repeat, category: d.category, color: d.color, essential: d.essential, status: "todo", steps: d.steps || [], minVersion: "", fullVersion: "", source: "capture", originalText: original, skipDates: [], doneDates: [] });
  });
  save();
  var n = drafts.length;
  drafts = []; $("draftArea").hidden = true; $("dumpText").value = "";
  showPanel("calendar"); selectDate(L.todayKey(), true); refreshAll();
  toast(n + (n === 1 ? " thing" : " things") + " sorted onto your calendar.");
});
$("journalFile").addEventListener("change", function (e) {
  var f = e.target.files[0]; if (!f) return;
  var r = new FileReader();
  r.onload = function () { $("dumpText").value = String(r.result || ""); $("captureMsg").textContent = "Journal loaded. Tap Make my list when you are ready."; };
  r.readAsText(f);
});
/* Voice: browser speech recognition where the browser offers it. Typing always works. */
var recog = null;
$("voiceBtn").addEventListener("click", function () {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { $("captureMsg").textContent = "Voice is not offered by this browser. Typing in the box works exactly the same."; return; }
  if (recog) { recog.stop(); recog = null; $("voiceBtn").querySelector("span").textContent = "Speak"; return; }
  recog = new SR(); recog.lang = "en-AU"; recog.interimResults = false;
  recog.onresult = function (ev) {
    var said = "";
    for (var i = 0; i < ev.results.length; i++) said += ev.results[i][0].transcript + "\n";
    $("dumpText").value = ($("dumpText").value ? $("dumpText").value + "\n" : "") + said.trim();
    $("captureMsg").textContent = "Got it. Check the words, then tap Make my list.";
  };
  recog.onend = function () { recog = null; $("voiceBtn").querySelector("span").textContent = "Speak"; };
  recog.onerror = function () { $("captureMsg").textContent = "Voice did not come through. Typing works the same."; };
  recog.start(); $("voiceBtn").querySelector("span").textContent = "Stop";
});
/* Handwriting photo: OCR runs from a free on-device library loaded only when asked. */
$("photoFile").addEventListener("change", function (e) {
  var f = e.target.files[0]; if (!f) return;
  $("captureMsg").textContent = "Reading your photo. This can take a little while the first time.";
  function run() {
    window.Tesseract.recognize(f, "eng").then(function (res) {
      var text = (res && res.data && res.data.text || "").trim();
      if (text) { $("dumpText").value = ($("dumpText").value ? $("dumpText").value + "\n" : "") + text; $("captureMsg").textContent = "Here is what I could read. Fix any words, then tap Make my list."; }
      else $("captureMsg").textContent = "I could not read words in that photo. Typing or speaking works the same.";
    }).catch(function () { $("captureMsg").textContent = "Reading the photo did not work this time. Typing or speaking works the same."; });
  }
  if (window.Tesseract) run();
  else {
    var sc = document.createElement("script");
    sc.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.0.5/dist/tesseract.min.js";
    sc.onload = run;
    sc.onerror = function () { $("captureMsg").textContent = "The reading tool needs internet the first time. Typing or speaking works the same."; };
    document.head.appendChild(sc);
  }
});

/* ---------- progress board ---------- */
function renderProgress() {
  var all = state.tasks;
  var doneCount = all.filter(function (t) { return t.status === "done" || (t.doneDates || []).length; }).length;
  var todayAd = adaptedFor(L.todayKey());
  var ts = L.dayScore(todayAd);
  $("progressSummary").innerHTML =
    "<div><strong>" + ts.done + " of " + ts.total + "</strong>done today, at your pace</div>" +
    "<div><strong>" + all.filter(function (t) { return t.status === "doing"; }).length + "</strong>in progress</div>" +
    "<div><strong>" + all.filter(function (t) { return t.status !== "done"; }).length + "</strong>still on the list, all safe</div>" +
    "<div><strong>" + doneCount + "</strong>things finished, counted forever</div>";
  ["todo", "doing", "done"].forEach(function (status) {
    var col = $("col-" + status); col.innerHTML = "";
    var list = all.filter(function (t) { return t.status === status; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    if (!list.length) col.innerHTML = '<p class="hint">Nothing here right now.</p>';
    list.forEach(function (t) {
      var card = document.createElement("div");
      card.className = "p-card"; card.draggable = true; card.setAttribute("data-pid", t.id);
      card.innerHTML = '<span class="pc-title">' + esc(t.title) + '</span><span class="pc-meta"><span class="tr-dot" style="background:' + t.color + '"></span>' +
        esc(L.parseKey(t.date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })) + (t.time ? " · " + t.time : "") + " · " + t.durationMin + " min" + (t.repeat ? " · " + esc(t.repeat) : "") + "</span>";
      card.addEventListener("click", function () { openTask(t.id, t.date); });
      card.addEventListener("dragstart", function (e) { e.dataTransfer.setData("text/plain", t.id); });
      col.appendChild(card);
    });
  });
}
document.querySelectorAll(".board-col").forEach(function (col) {
  col.addEventListener("dragover", function (e) { e.preventDefault(); col.classList.add("drag-over"); });
  col.addEventListener("dragleave", function () { col.classList.remove("drag-over"); });
  col.addEventListener("drop", function (e) {
    e.preventDefault(); col.classList.remove("drag-over");
    var t = baseTask(e.dataTransfer.getData("text/plain")); if (!t) return;
    t.status = col.getAttribute("data-status");
    if (t.status === "done") toast("Done. That counts.");
    save(); renderProgress(); refreshAll();
  });
});
/* Dragging a day-list row onto a DayTicker day moves the task to that day.
   Both live in the Calendar panel, so the drag never crosses panels. */
$("dayList").addEventListener("dragstart", function (e) {
  var row = e.target.closest ? e.target.closest(".task-row") : null;
  if (!row) return;
  row.classList.add("dragging");
  e.dataTransfer.setData("text/plain", JSON.stringify({ id: row.getAttribute("data-id"), date: row.getAttribute("data-date") }));
});
$("dayList").addEventListener("dragend", function () {
  $("dayList").querySelectorAll(".dragging").forEach(function (r) { r.classList.remove("dragging"); });
});
$("ticker").addEventListener("dragover", function (e) { e.preventDefault(); });
$("ticker").addEventListener("drop", function (e) {
  var raw = e.dataTransfer.getData("text/plain");
  if (!raw) return;
  var info; try { info = JSON.parse(raw); } catch (err) { return; }
  var cell = e.target.closest ? e.target.closest("[data-date]") : null;
  if (!cell || !info.id) return;
  var t = baseTask(info.id); if (!t) return;
  e.preventDefault();
  moveInstance(t, info.date, cell.getAttribute("data-date"));
  save(); refreshAll(); toast("Moved. The day re-shaped itself.");
});

/* ---------- settings ---------- */
function bindSettings() {
  var s = state.settings;
  $("checkinTime").value = s.checkinTime;
  $("nameLow").value = s.names.low; $("nameSteady").value = s.names.steady; $("nameFull").value = s.names.full;
  $("nCheckin").checked = s.notif.checkin; $("nStart").checked = s.notif.start;
  $("nSetup").value = s.notif.setup; $("nDigest").checked = s.notif.digest;
  $("nDigestTimes").value = s.notif.digestTimes.join(", ");
  $("nDone").checked = s.notif.done; $("nDoneTime").value = s.notif.doneTime;
  renderNotifStatus();
}
function readSettings() {
  var s = state.settings;
  s.checkinTime = $("checkinTime").value || "08:00";
  s.names.low = $("nameLow").value.trim() || "Low";
  s.names.steady = $("nameSteady").value.trim() || "Steady";
  s.names.full = $("nameFull").value.trim() || "Full";
  s.notif.checkin = $("nCheckin").checked; s.notif.start = $("nStart").checked;
  s.notif.setup = Math.max(0, Math.min(60, +$("nSetup").value || 5));
  s.notif.digest = $("nDigest").checked;
  s.notif.digestTimes = $("nDigestTimes").value.split(",").map(validClock).filter(Boolean);
  if (!s.notif.digestTimes.length) s.notif.digestTimes = ["12:30"];
  s.notif.done = $("nDone").checked; s.notif.doneTime = $("nDoneTime").value || "20:00";
  /* Show what was actually kept, so a fixed time is never a silent change. */
  $("nDigestTimes").value = s.notif.digestTimes.join(", ");
  save(); renderCheckin();
}
["checkinTime", "nameLow", "nameSteady", "nameFull", "nCheckin", "nStart", "nSetup", "nDigest", "nDigestTimes", "nDone", "nDoneTime"].forEach(function (id) {
  $(id).addEventListener("change", readSettings);
});
$("clearSamples").addEventListener("click", function () {
  state.tasks = state.tasks.filter(function (t) { return t.source !== "sample"; });
  save(); refreshAll(); toast("Sample tasks removed. This is fully yours now.");
});

/* ---------- notifications ---------- */
function renderNotifStatus() {
  var n = state.settings.notif;
  $("notifStatus").textContent = !("Notification" in window) ? "This browser does not offer notifications." :
    n.perm === "granted" ? "Notifications are on. You choose what they say and when." :
    n.perm === "denied" ? "Notifications are blocked in the browser. You can allow them in the browser site settings." :
    "Notifications are off.";
}
function notify(title, body, key) {
  if (state.sent[key]) return;
  state.sent[key] = 1; save();
  function fire() {
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(function (reg) { if (reg.showNotification) reg.showNotification(title, { body: body, icon: "icon.svg" }); else new Notification(title, { body: body, icon: "icon.svg" }); }).catch(function () { new Notification(title, { body: body }); });
      } else new Notification(title, { body: body });
    } catch (e) {}
  }
  fire();
}
function requestNotif() {
  if (!("Notification" in window)) { toast("This browser does not offer notifications."); return; }
  Notification.requestPermission().then(function (p) {
    state.settings.notif.perm = p; save(); renderNotifStatus();
    if (p === "granted") toast("Notifications on. Gentle ones, chosen by you.");
    else toast("No problem. The app still works fully without them.");
  });
}
$("notifEnable").addEventListener("click", requestNotif);
$("notifTest").addEventListener("click", function () {
  if (!("Notification" in window)) { toast("This browser does not offer notifications."); return; }
  if (Notification.permission !== "granted") { toast("Turn notifications on first, then the test can arrive."); return; }
  try { new Notification("Pace", { body: "This is your test. Gentle, like the real ones." }); } catch (e) {}
});
$("notifPause").addEventListener("click", function () {
  state.settings.pausedDate = L.todayKey(); save(); toast("Paused for today. Silence is a fine choice.");
});
function checkNotifications() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  var s = state.settings, today = L.todayKey();
  if (s.pausedDate === today) return;
  var now = new Date(), hhmm = L.pad(now.getHours()) + ":" + L.pad(now.getMinutes());
  var n = s.notif;
  if (n.checkin && hhmm === s.checkinTime && !state.feelings[today]) {
    notify("How are you feeling today?", "One tap sets the shape of your day.", "checkin-" + today);
  }
  var ad = adaptedFor(today);
  if (n.start) {
    ad.visible.forEach(function (t) {
      if (!t.time) return;
      if (L.nudgeTime(t, n.setup) === hhmm) {
        notify("Time to start: " + (t.displayTitle || t.title), "First step: " + L.nextStepText(t) + " · about " + t.durationMin + " min.", "start-" + t.id + "-" + today);
      }
    });
  }
  if (n.digest && n.digestTimes.indexOf(hhmm) !== -1) {
    notify("Your day, gently", L.digestText(ad.visible), "digest-" + today + "-" + hhmm);
  }
  if (n.done && hhmm === n.doneTime && ad.done.length) {
    notify("Today, done", ad.done.length + (ad.done.length === 1 ? " thing" : " things") + " done today. The rest is parked for tomorrow.", "done-" + today);
  }
}
setInterval(checkNotifications, 30000);

/* ---------- welcome ---------- */
if (!state.welcomed) $("welcome").hidden = false;
$("welcomeSkip").addEventListener("click", function () { state.welcomed = true; save(); $("welcome").hidden = true; });
$("welcomeNotif").addEventListener("click", function () { state.welcomed = true; save(); $("welcome").hidden = true; requestNotif(); });

/* ---------- boot ---------- */
function refreshAll() { renderTicker(); renderDayList(); renderUpNext(); renderCheckin(); renderRing(); refreshCalendar(); renderYear(); if ($("panel-progress").classList.contains("is-active")) renderProgress(); }
initCalendar();
applyAppearance();
applySidebar();
bindSettings();
renderTitle();
selectDate(L.todayKey(), false);
checkNotifications();
if ("serviceWorker" in navigator) { navigator.serviceWorker.register("service-worker.js").catch(function () {}); }
})();
