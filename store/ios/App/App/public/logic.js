/* ADHD Calendar logic. Pure functions, shared by the app and the node tests.
   No shame rules live here: nothing in this file ever labels a task late,
   failed or missed. Parked means parked, never dropped. */
(function (root) {
"use strict";
var tr = window.t; /* the language layer (i18n.js) */

function pad(n) { return (n < 10 ? "0" : "") + n; }
function toKey(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function parseKey(key) { var p = String(key).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
function addDays(key, n) { var d = parseKey(key); d.setDate(d.getDate() + n); return toKey(d); }
function todayKey(now) { return toKey(now || new Date()); }
function toMin(hhmm) { if (!hhmm) return null; var p = String(hhmm).split(":"); return (+p[0]) * 60 + (+p[1] || 0); }
function toHHMM(mins) { mins = ((mins % 1440) + 1440) % 1440; return pad(Math.floor(mins / 60)) + ":" + pad(mins % 60); }

/* Start nudge time: the task block begins at its time, so the nudge lands a
   short setup lead-in before it (default 5 minutes, user changeable). */
function nudgeTime(task, setupMin) {
  if (!task.time) return null;
  return toHHMM(toMin(task.time) - (setupMin == null ? 5 : setupMin));
}

var CATEGORIES = [
  { id: "money",   label: "Finance",  words: ["pay", "bill", "invoice", "bank", "tax", "rent", "budget", "quote", "price", "refund", "insurance", "savings", "loan", "salary", "mortgage", "super", "invest", "stocks", "credit card", "expenses", "receipt", "payroll"], color: "#C9920E" },
  { id: "business",label: "Business", words: ["client", "clients", "customer", "customers", "sales", "marketing", "supplier", "stock take", "inventory", "proposal", "pitch", "quote for", "newsletter", "website", "launch", "my business", "orders", "shipping", "ads ", "instagram", "social media", "brand", "wholesale", "vendor", "booking clients"], color: "#B8602E" },
  { id: "pets",    label: "Pets",     words: ["dog", "cat ", "cats", "pet ", "pets", "puppy", "kitten", "litter", "groomer", "walk the dog", "feed the", "vet"], color: "#A0764B" },
  { id: "fitness", label: "Fitness",  words: ["gym", "workout", "work out", "run", "jog", "yoga", "swim", "stretch", "exercise", "training", "pilates", "cycling", "bike ride", "hike", "walk", "lift", "cardio", "steps today"], color: "#F25F3A" },
  { id: "health",  label: "Health",   words: ["doctor", "dentist", "medicine", "tablet", "pills", "therapist", "therapy", "physio", "appointment", "checkup", "check-up", "scan", "blood test", "prescription", "optometrist", "gp ", "vaccine", "mental health", "counsel"], color: "#E85D75" },
  { id: "family",  label: "Family",   words: ["family", "kids", "kid ", "son ", "daughter", "mum", "mom", "dad", "grandma", "grandpa", "nan ", "baby", "parent", "sister", "brother", "school run", "bedtime story", "husband", "wife", "partner", "cousin", "aunt", "uncle", "in-laws", "nephew", "niece", "playdate"], color: "#D96AA7" },
  { id: "school",  label: "School",   words: ["study", "exam", "homework", "assignment", "lecture", "essay", "revise", "revision", "uni ", "semester", "tutorial", "quiz", "course", "thesis", "school", "class ", "flashcards", "textbook", "campus"], color: "#2F80ED" },
  { id: "learning",label: "Learning", words: ["learn", "language", "spanish", "french", "duolingo", "podcast", "audiobook", "practise", "practice", "skill", "certificate", "workshop", "webinar", "read chapter", "book club"], color: "#3B9C9C" },
  { id: "career",  label: "Career",   words: ["resume", "cv ", "linkedin", "job application", "job search", "promotion", "networking", "portfolio", "cover letter", "salary review", "performance review", "apply for the job"], color: "#2B6CB0" },
  { id: "work",    label: "Work",     words: ["work", "meeting", "email", "report", "boss", "presentation", "spreadsheet", "call the office", "deadline", "project", "interview", "shift", "standup", "stand-up", "slides", "timesheet", "team"], color: "#5B6BD5" },
  { id: "food",    label: "Food",     words: ["cook", "meal prep", "meal plan", "dinner", "lunch", "breakfast", "recipe", "bake", "baking", "snack", "lunchbox", "defrost", "marinate", "barbecue", "bbq"], color: "#8BB32F" },
  { id: "home",    label: "Home",     words: ["clean", "tidy", "wash", "laundry", "kitchen", "bedroom", "bins", "garden", "dishes", "vacuum", "mop", "repair", "fix the", "declutter", "organise", "organize", "plumber", "electrician", "mow", "furniture", "sheets", "windows"], color: "#35704E" },
  { id: "car",     label: "Car",      words: ["car ", "rego", "registration", "tyres", "tires", "mechanic", "oil change", "car wash", "service the car", "petrol", "fuel", "parking", "roadworthy", "driving lesson"], color: "#4A5568" },
  { id: "travel",  label: "Travel",   words: ["flight", "hotel", "passport", "pack ", "packing", "trip", "holiday", "visa", "train", "airport", "booking", "itinerary", "luggage", "airbnb", "road trip", "vacation"], color: "#00A3C4" },
  { id: "admin",   label: "Admin",    words: ["paperwork", "forms", "form ", "renew", "licence", "license", "council", "lawyer", "contract", "apply for", "application", "certificate", "centrelink", "notary", "legal", "will ", "id card", "post office", "mail", "file the"], color: "#5F6F52" },
  { id: "faith",   label: "Faith",    words: ["church", "pray", "prayer", "mass", "mosque", "temple", "bible", "devotion", "service at church", "worship", "synagogue"], color: "#C7A24A" },
  { id: "selfcare",label: "Self-care",words: ["skincare", "haircut", "hair appointment", "massage", "spa", "nails", "self-care", "self care", "facial", "shave", "shower", "manicure", "pedicure", "bath"], color: "#B58DB6" },
  { id: "tech",    label: "Tech",     words: ["backup", "password", "wifi", "laptop", "update the", "install", "software", "phone plan", "back up", "delete photos", "storage", "app update", "subscription"], color: "#2C7A7B" },
  { id: "people",  label: "Friends",  words: ["call", "visit", "birthday", "friend", "pick up", "pickup", "message", "text", "party", "dinner with", "coffee with", "catch up", "date night", "wedding", "gift", "drinks with", "reply to"], color: "#F2994A" },
  { id: "errands", label: "Errands",  words: ["shop", "groceries", "buy", "pharmacy", "drop off", "collect", "return the", "dry cleaning", "pick up the parcel", "chemist", "hardware"], color: "#20A39E" },
  { id: "creative",label: "Creative", words: ["paint", "draw", "guitar", "piano", "craft", "photo", "design", "sketch", "journal", "compose", "write a song", "knit", "sew", "film", "edit video", "blog"], color: "#C158DC" },
  { id: "rest",    label: "Rest",     words: ["rest", "nap", "read", "breathe", "meditate", "break", "sit outside", "relax", "movie", "game night", "early night", "sleep"], color: "#8E7CC3" }
];
var CATEGORY_ICON = { money: "\ud83d\udcb0", business: "\ud83d\udcc8", pets: "\ud83d\udc3e", fitness: "\ud83c\udfc3", health: "\ud83e\ude7a", family: "\ud83d\udc68\u200d\ud83d\udc69\u200d\ud83d\udc67", school: "\ud83c\udf93", learning: "\ud83d\udcda", career: "\ud83e\udded", work: "\ud83d\udcbc", food: "\ud83c\udf7d\ufe0f", home: "\ud83c\udfe0", car: "\ud83d\ude97", travel: "\u2708\ufe0f", admin: "\ud83d\uddc2\ufe0f", faith: "\ud83d\ude4f", selfcare: "\ud83e\uddf4", tech: "\ud83d\udcbb", people: "\ud83d\udc4b", errands: "\ud83d\uded2", creative: "\ud83c\udfa8", rest: "\ud83d\udecb\ufe0f", goal: "\ud83c\udfaf", general: "\ud83d\udccc" };
var DEFAULT_COLOR = "#7A8699";
/* Prefix-on-a-word match: "run" finds "running" but not "prune"; a trailing
   space in a word means "that whole word" ("cat " is not "category"). */
function wordHit(t, w) {
  var exact = /\s$/.test(w), core = w.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("(^|[^a-z])" + core + (exact ? "([^a-z]|$)" : "")).test(t);
}
function categoryMatch(title) {
  var t = String(title).toLowerCase();
  for (var i = 0; i < CATEGORIES.length; i++) {
    for (var j = 0; j < CATEGORIES[i].words.length; j++) {
      if (wordHit(t, CATEGORIES[i].words[j])) return { cat: CATEGORIES[i], word: CATEGORIES[i].words[j].trim() };
    }
  }
  return null;
}
function categoryFor(title) {
  var m = categoryMatch(title);
  if (m) return { id: m.cat.id, color: m.cat.color, label: m.cat.label };
  return { id: "general", color: DEFAULT_COLOR, label: "Other" };
}
var GOAL_COLOR = "#9B5DE5";
var CATEGORY_LIST = CATEGORIES.map(function (c) { return { id: c.id, label: c.label, color: c.color }; }).concat([{ id: "goal", label: "Goal", color: GOAL_COLOR }, { id: "general", label: "Other", color: DEFAULT_COLOR }]);

/* ---- the smart read of a task name (add-task wizard) ----
   Returns what the words say: a category (with the word that decided it, so the
   tag can show WHY), an icon (best keyword match in the icon library, else the
   category's own), the user's goal it belongs to (word overlap), and whether the
   words sound like a whole goal rather than one task. */
var GOAL_STOP = /^(the|and|for|with|from|that|this|have|your|into|about|some|task|todo|today|tomorrow|week|time|work|goal|more|make|take|keep|start|finish|then|when|just)$/;
function stem(w) { return w.slice(0, 5); }
function sigWords(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(function (w) { return w.length >= 4 && !GOAL_STOP.test(w); }).map(stem);
}
function matchGoal(title, goals) {
  var tw = sigWords(title), best = null, bestN = 0;
  if (!tw.length) return null;
  (goals || []).forEach(function (g) {
    if (!g || !g.title) return;
    var gw = sigWords(g.title + " " + (g.notes || "").slice(0, 200)), n = 0;
    tw.forEach(function (w) { if (gw.indexOf(w) !== -1) n++; });
    if (n > bestN) { bestN = n; best = g; }
  });
  return best;
}
var GOAL_VERB = /^\s*(learn|master|lose|gain|save|pay off|get (?:fit|fitter|healthy|stronger|promoted|a job)|write (?:a|my) (?:book|novel|thesis)|build|launch|start (?:a|my)|quit|become|prepare for|train for|run (?:a|my) (?:marathon|5k|10k)|read \d+|finish (?:my|the) (?:degree|thesis|book|novel)|pass (?:my|the)|declutter (?:my|the) (?:whole|entire)|renovate|move to)\b/i;
function looksLikeGoal(text) {
  var t = String(text || "");
  if (/\b(today|tomorrow|tonight|at \d|\d(?:am|pm)|on (?:mon|tue|wed|thu|fri|sat|sun))/i.test(t)) return false;
  return GOAL_VERB.test(t) || /\b(by (?:the end of |next )?(?:year|month|summer|december|june|march)|every day for a (?:month|year|week)|\d+\s?(?:kg|lbs|pounds|books|chapters)\b)/i.test(t);
}
function iconCandidates(title, icons) {
  var t = String(title).toLowerCase(), scored = [];
  (icons || []).forEach(function (it) {
    if (!it.icon) return;
    var kws = String(it.keywords || "").toLowerCase().split(/\s+/).filter(function (k) { return k.length >= 3; }), sc = 0;
    kws.forEach(function (k) { if (wordHit(t, k + " ") || wordHit(t, k)) sc += k.length; });
    if (sc) scored.push({ icon: it.icon, name: it.name, sc: sc });
  });
  scored.sort(function (a, b) { return b.sc - a.sc; });
  return scored.slice(0, 8).map(function (x) { return x.icon; });
}
function analyzeTask(text, goals, icons) {
  var m = categoryMatch(text), goal = matchGoal(text, goals);
  var cat = m ? { id: m.cat.id, label: m.cat.label, color: m.cat.color } : { id: "general", label: "Other", color: DEFAULT_COLOR };
  var why = m ? m.word : "";
  var cands = iconCandidates(text, icons);
  var icon = cands[0] || CATEGORY_ICON[cat.id] || CATEGORY_ICON.general;
  return { category: cat, why: why, icon: icon, icons: cands, goal: goal ? { id: goal.id, title: goal.title, category: goal.category } : null, looksLikeGoal: !goal && looksLikeGoal(text) };
}

function estimateDuration(title) {
  var t = String(title).toLowerCase();
  if (/\b(email|message|text|reply|call|phone)\b/.test(t)) return 10;
  if (/\b(clean|tidy|organise|organize|declutter|laundry|garden)\b/.test(t)) return 30;
  if (/\b(shop|groceries|appointment|doctor|dentist|meeting)\b/.test(t)) return 45;
  if (/\b(write|report|plan|study|pack|prep)\b/.test(t)) return 45;
  return 25;
}

var UMBRELLA = /\b(clean|tidy|organise|organize|declutter|sort out|sort|plan|fix|write|study|pack|prep|prepare|build|set up|deal with)\b/i;
function isBig(title, durationMin) {
  /* A fixed appointment is never a "big task", however long it runs. */
  if (/\b(appointment|meeting|flight|lesson|class|shift|interview)\b/i.test(title)) return false;
  return durationMin >= 90 || UMBRELLA.test(title) || (/\band\b/i.test(title) && title.split(/\s+/).length >= 6);
}
/* Starter steps: small, physical, verb first. Always editable in the app. */
function decompose(title, durationMin, force) {
  if (!force && !isBig(title, durationMin)) return [];
  var short = String(title).replace(/\s+/g, " ").trim();
  if (short.length > 42) short = short.slice(0, 42) + "…";
  return [
    { text: tr("Get out what you need for: {title}", { title: short }), done: false },
    { text: tr("Do the first small part for 10 minutes"), done: false },
    { text: tr("Put things away, then write the next step"), done: false }
  ];
}

var WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
var MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
function nextWeekday(baseKey, wd, strictlyAfter) {
  var d = parseKey(baseKey);
  var diff = (wd - d.getDay() + 7) % 7;
  if (diff === 0 && strictlyAfter) diff = 7;
  d.setDate(d.getDate() + diff);
  return toKey(d);
}

/* An impossible date key (2027-02-29, 2027-04-31) matches no real
   day in any view — the task would exist nowhere. Normalise at the
   parser's choke point: Feb 29 rolls forward to the next leap year;
   any other overflow clamps to the month's real last day (PACE-009). */
function realDate(key) {
  var p = String(key).split("-"); var y = +p[0], m = +p[1], d = +p[2];
  if (!y || m < 1 || m > 12 || !d) return key;
  var dim = new Date(y, m, 0).getDate();
  if (d <= dim) return key;
  if (m === 2 && d === 29) { do { y++; dim = new Date(y, 2, 0).getDate(); } while (dim < 29); return y + "-02-29"; }
  return y + "-" + pad(m) + "-" + pad(dim);
}

function parseItem(raw, baseKey) {
  var s = " " + String(raw).trim().replace(/\s+/g, " ") + " ";
  if (s.trim().length < 1) return null;
  var priority = 0;
  var bang = s.match(/(!+)\s*$/);
  if (bang) { priority = Math.min(3, bang[1].length); s = s.replace(/!+\s*$/, " "); }
  s = s.replace(/^\s*(task|todo|reminder)\s*[:\-]\s*/i, " ");
  s = s.replace(/\b(remind me to|i need to|need to|remember to)\b/i, " ");
  var repeat = null;
  var rm = s.match(/\bevery (day|weekday|week|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|evening|night)\b/i);
  if (rm) { var rw = rm[1].toLowerCase(); repeat = (rw === "morning" || rw === "evening" || rw === "night") ? "every day" : "every " + rw; s = s.replace(rm[0], " "); }
  else if (/\bdaily\b/i.test(s)) { repeat = "every day"; s = s.replace(/\bdaily\b/i, " "); }
  else if (/\bweekly\b/i.test(s)) { repeat = "every week"; s = s.replace(/\bweekly\b/i, " "); }

  var date = baseKey, dm;
  if (/\bday after tomorrow\b/i.test(s)) { date = addDays(baseKey, 2); s = s.replace(/\bday after tomorrow\b/i, " "); }
  else if (/\btomorrow\b/i.test(s)) { date = addDays(baseKey, 1); s = s.replace(/\btomorrow\b/i, " "); }
  else if (/\btonight\b/i.test(s)) { s = s.replace(/\btonight\b/i, " at 7pm "); }
  else if (/\btoday\b/i.test(s)) { s = s.replace(/\btoday\b/i, " "); }
  else if ((dm = s.match(/\bin (\d+) days?\b/i))) { date = addDays(baseKey, +dm[1]); s = s.replace(dm[0], " "); }
  else if ((dm = s.match(/\b(?:on\s+)?next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i))) { date = nextWeekday(baseKey, WEEKDAYS.indexOf(dm[1].toLowerCase()), true); if ((parseKey(date) - parseKey(baseKey)) / 86400000 < 7) date = addDays(date, 7); s = s.replace(dm[0], " "); }
  else if ((dm = s.match(/\b(?:on\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i))) { date = nextWeekday(baseKey, WEEKDAYS.indexOf(dm[1].toLowerCase().slice(0, 3) === "mon" ? "monday" : dm[1].toLowerCase()), false); if (date === baseKey) { /* same weekday means today */ } s = s.replace(dm[0], " "); }
  else if ((dm = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/))) { date = dm[1] + "-" + dm[2] + "-" + dm[3]; s = s.replace(dm[0], " "); }
  else if ((dm = s.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) { var yr = dm[3] ? (+dm[3] < 100 ? 2000 + (+dm[3]) : +dm[3]) : parseKey(baseKey).getFullYear(); date = yr + "-" + pad(+dm[2]) + "-" + pad(+dm[1]); s = s.replace(dm[0], " "); }
  else if ((dm = s.match(/\b(?:on\s+)?(\d{1,2}) (january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)(?:\s+(\d{4}))?\b/i))) { var monWord = dm[2].toLowerCase(); var mo = MONTHS.indexOf(monWord.length > 3 ? monWord : ({ jan: "january", feb: "february", mar: "march", apr: "april", jun: "june", jul: "july", aug: "august", sep: "september", oct: "october", nov: "november", dec: "december" }[monWord] || monWord)); var y2 = dm[3] ? +dm[3] : parseKey(baseKey).getFullYear(); var cand = y2 + "-" + pad(mo + 1) + "-" + pad(+dm[1]); if (!dm[3] && cand < baseKey) cand = (y2 + 1) + "-" + pad(mo + 1) + "-" + pad(+dm[1]); date = cand; s = s.replace(dm[0], " "); }

  var time = null, tm;
  if ((tm = s.match(/\bat (\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i)) || (tm = s.match(/\b(\d{1,2})(?::(\d{2}))\s*(am|pm)\b/i)) || (tm = s.match(/\b(\d{1,2})(am|pm)\b/i)) || (tm = s.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/))) {
    var h = +tm[1], mi = +(tm[2] || 0), ap = (tm[3] || "").toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    /* An impossible clock time (25:99) is consumed but never stored —
       the task keeps its words and simply has no time (PACE-010). */
    time = (h <= 23 && mi <= 59) ? pad(h) + ":" + pad(mi) : null;
    s = s.replace(tm[0], " ");
  } else if (/\bnoon\b/i.test(s)) { time = "12:00"; s = s.replace(/\b(?:at\s+)?noon\b/i, " "); }
  else if (/\bin the morning\b/i.test(s)) { time = "09:00"; s = s.replace(/\bin the morning\b/i, " "); }
  else if (/\bin the afternoon\b/i.test(s)) { time = "14:00"; s = s.replace(/\bin the afternoon\b/i, " "); }
  else if (/\bin the evening\b/i.test(s)) { time = "19:00"; s = s.replace(/\bin the evening\b/i, " "); }

  var durationMin = null, um;
  if ((um = s.match(/\bfor (\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)\b/i))) {
    durationMin = /h/i.test(um[2]) ? Math.round(parseFloat(um[1]) * 60) : Math.round(parseFloat(um[1]));
    s = s.replace(um[0], " ");
  }
  var title = s.replace(/\s+/g, " ").trim().replace(/^[\s,.\-]+|[\s,.\-]+$/g, "");
  /* A one-letter title is a real title ("X at 9am") — only wordless
     debris is refused, never a letter or a digit (PACE-015). */
  if (!/[a-z0-9]/i.test(title)) return null;
  title = title.charAt(0).toUpperCase() + title.slice(1);
  if (!durationMin) durationMin = estimateDuration(title);
  var cat = categoryFor(title);
  var essential = priority >= 3 || /\b(must|deadline|due|appointment|pick up|pickup|flight|doctor|dentist)\b/i.test(title);
  date = realDate(date);
  return {
    title: title, date: date, time: time, durationMin: durationMin,
    priority: priority, repeat: repeat, category: cat.id, color: cat.color,
    essential: essential, steps: decompose(title, durationMin, false)
  };
}

function parseDump(text, baseKey) {
  var out = [];
  var chunks = [];
  String(text || "").split(/\n+/).forEach(function (line) {
    line.split(/\s+and then\s+/i).forEach(function (part) {
      part.split(/;\s*/).forEach(function (p) { if (p.trim()) chunks.push(p); });
    });
  });
  /* A single long line with sentences becomes one task per sentence. */
  if (chunks.length === 1 && chunks[0].length > 90 && /\.\s+[A-Z]/.test(chunks[0])) {
    chunks = chunks[0].split(/\.\s+/).map(function (x) { return x.replace(/\.$/, ""); });
  }
  chunks.forEach(function (c) { var item = parseItem(c, baseKey); if (item) out.push(item); });
  return out;
}

function sortDay(tasks) {
  return tasks.slice().sort(function (a, b) {
    if (a.time && b.time) return a.time < b.time ? -1 : a.time > b.time ? 1 : (b.priority - a.priority);
    if (a.time) return -1;
    if (b.time) return 1;
    return (b.priority - a.priority) || (a.durationMin - b.durationMin);
  });
}

/* Build 37: the day adapts on its own. A task with no taught smaller version still gets a
   light (Bad day) and a medium (Ok day) version, found from the words in its title. */
var AUTO_VERBS = [
  [/\b(write|draft|compose|essay|article|report|blog|post|thesis|proposal)\b/i, "3 lines only", "half of it", 10],
  [/\b(read|study|revise|review|learn|course|chapter)\b/i, "1 page only", "10 minutes", 10],
  [/\b(clean|tidy|laundry|dishes|vacuum|declutter|organi[sz]e|sort|pack)\b/i, "5 min tidy", "one area", 5],
  [/\b(email|emails|reply|respond|message|inbox|text)\b/i, "one quick reply", "top 3 only", 5],
  [/\b(call|phone|ring)\b/i, "short call or text", "keep it brief", 5],
  [/\b(gym|workout|exercise|run|jog|walk|yoga|train|training|swim|stretch)\b/i, "5 min easy move", "short session", 10],
  [/\b(cook|meal|dinner|lunch|breakfast|prep)\b/i, "something simple", "quick version", 15],
  [/\b(pay|bill|bills|invoice|tax|taxes|budget|admin|paperwork|form)\b/i, "first line only", "the main part", 10],
  [/\b(plan|planning|schedule|roadmap|outline|brainstorm)\b/i, "list 3 things", "first part only", 10],
  [/\b(code|build|design|develop|fix|debug|ship)\b/i, "one small piece", "half the work", 10],
  [/\b(shop|shopping|buy|errand|errands|groceries)\b/i, "just the must-haves", "the short list", 15]
];
function roundFive(n) { return Math.max(5, Math.round(n / 5) * 5); }
function autoVersion(task, level) {
  var dur = task.durationMin || 15, title = task.title || "", row = null, i;
  for (i = 0; i < AUTO_VERBS.length; i++) if (AUTO_VERBS[i][0].test(title)) { row = AUTO_VERBS[i]; break; }
  if (level === "low") {
    if (dur <= 10) return null;
    var lm = row ? row[3] : 5;
    return { title: title + " (" + (row ? row[1] : "5 minutes only") + ")", durationMin: Math.min(dur, lm), kind: "light" };
  }
  if (level === "steady") {
    if (dur < 30) return null;
    return { title: title + " (" + (row ? row[2] : "short version") + ")", durationMin: roundFive(dur / 2), kind: "medium" };
  }
  return null;
}

/* The feeling adaptation. Returns the day as it should be SHOWN at a level.
   Nothing is deleted: parked tasks are simply resting out of sight. */
function adaptDay(tasks, level, tomorrowTasks) {
  var sorted = sortDay(tasks.filter(function (t) { return t.status !== "done"; }));
  var done = tasks.filter(function (t) { return t.status === "done"; });
  var visible = [], parked = [], stretch = null, i, t;
  if (level === "low") {
    var ess = sorted.filter(function (x) { return x.essential; });
    /* A task the user taught a smallest version for is part of their bare
       minimum by definition: it stays, shrunk, instead of vanishing. */
    var taught = sorted.filter(function (x) { return !x.essential && x.minVersion; });
    var rest = sorted.filter(function (x) { return !x.essential && !x.minVersion; });
    visible = ess.slice(0, 4).concat(taught.slice(0, 3)).slice(0, 6);
    if (!taught.length && visible.length < 4 && rest.length) {
      var tinies = rest.slice().sort(function (a, b) { return a.durationMin - b.durationMin; }).slice(0, 4 - visible.length);
      tinies.forEach(function (tn) { visible.push(tn); });
      rest = rest.filter(function (x) { return tinies.indexOf(x) === -1; });
    }
    parked = sorted.filter(function (x) { return visible.indexOf(x) === -1; });
  } else if (level === "full") {
    visible = sorted;
    if (tomorrowTasks && tomorrowTasks.length) {
      var tt = sortDay(tomorrowTasks.filter(function (x) { return x.status !== "done" && !x.essential; }));
      stretch = tt[0] || null;
    }
  } else { /* steady */
    visible = sorted.slice(0, 6);
    parked = sorted.slice(6);
  }
  visible = visible.map(function (x) {
    var copy = {}; for (var k in x) copy[k] = x[k];
    copy.displayTitle = x.title;
    copy.shrunk = false;
    if (level === "low" && x.minVersion) { copy.displayTitle = /^Just 5 minutes/.test(x.minVersion) ? "Just 5 minutes: " + x.title : x.minVersion; copy.shrunk = true; }
    if (!copy.shrunk && !x.minVersion && (level === "low" || level === "steady")) {
      var av = autoVersion(x, level);
      if (av) { copy.displayTitle = av.title; copy.durationMin = av.durationMin; copy.autoVersion = av.kind; copy.shrunk = av.kind === "light"; }
    }
    if (level === "full" && x.fullVersion) { copy.displayTitle = x.fullVersion; }
    return copy;
  });
  return { visible: visible, parked: parked, done: done, stretch: stretch };
}

/* Progress is scored against the ADAPTED plan, never the full list. */
function dayScore(adapted) {
  var total = adapted.visible.length + adapted.done.length;
  var doneCount = adapted.done.length;
  return { done: doneCount, total: total, pct: total ? Math.round((doneCount / total) * 100) : 100 };
}

function nextStepText(task) {
  if (task.steps && task.steps.length) {
    for (var i = 0; i < task.steps.length; i++) if (!task.steps[i].done) return task.steps[i].text;
  }
  return task.title;
}

function digestText(visible) {
  if (!visible.length) return tr("Nothing left showing today. The rest is parked, safe.");
  var quickest = visible.slice().sort(function (a, b) { return a.durationMin - b.durationMin; })[0];
  return tr(visible.length === 1 ? "{n} small thing left today. Quickest: {title} ({min} min)." : "{n} small things left today. Quickest: {title} ({min} min).", { n: visible.length, title: quickest.title, min: quickest.durationMin });
}

/* The habit icons a user can pick from (keys into the app's SVG sprite). */
var HABIT_ICONS = ["drop", "sun", "moon", "heart", "book", "coffee", "music", "star", "zap", "smile", "wind", "activity"];

/* Streak maths for Habits. days maps "YYYY-MM-DD" -> true. The current streak
   counts back from today, or from yesterday if today is not ticked yet (the
   day is not over, so the run is still alive). last7 is oldest first. */
function streakInfo(days, today) {
  days = days || {};
  var last7 = [];
  for (var i = 6; i >= 0; i--) { var k = addDays(today, -i); last7.push({ key: k, done: !!days[k] }); }
  var cur = 0;
  var k2 = days[today] ? today : addDays(today, -1);
  while (days[k2]) { cur++; k2 = addDays(k2, -1); }
  return { current: cur, last7: last7 };
}

var api = {
  pad: pad, toKey: toKey, parseKey: parseKey, addDays: addDays, todayKey: todayKey,
  toMin: toMin, toHHMM: toHHMM, nudgeTime: nudgeTime,
  categoryFor: categoryFor, CATEGORY_LIST: CATEGORY_LIST, estimateDuration: estimateDuration,
  isBig: isBig, decompose: decompose, parseItem: parseItem, parseDump: parseDump,
  sortDay: sortDay, adaptDay: adaptDay, dayScore: dayScore,
  nextStepText: nextStepText, analyzeTask: analyzeTask, categoryMatch: categoryMatch, looksLikeGoal: looksLikeGoal, CATEGORY_ICON: CATEGORY_ICON, GOAL_COLOR: GOAL_COLOR, digestText: digestText, CATEGORIES: CATEGORIES,
  HABIT_ICONS: HABIT_ICONS, streakInfo: streakInfo
};
if (typeof module !== "undefined" && module.exports) module.exports = api;
root.CalmLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
