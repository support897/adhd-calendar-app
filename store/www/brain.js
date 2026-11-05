/* Pace Brain: the free, offline "Talk to it" understanding engine.
   No AI service, no network, no key. Pure rules, so it behaves the same
   every time and works for every user at zero cost.
   Capture -> Understand -> Review -> Create. Never creates anything itself.
   Exposes window.PaceBrain / module.exports. Needs logic.js (CalmLogic). */
(function (root) {
"use strict";
var L = (typeof require !== "undefined" && typeof module !== "undefined" && module.exports) ? require("./logic.js") : root.CalmLogic;

var NUM = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50 };
var NUMW = "zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty";
var VOCAB = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "tomorrow", "tonight", "today", "morning", "afternoon", "evening", "weekend", "january", "february", "march", "april", "june", "july", "august", "september", "october", "november", "december", "appointment", "meeting", "dentist", "doctor", "groceries", "homework"];
var VERBS = "knock|tackle|handle|deal|crack|rehearse|wrap|practise|go|call|phone|text|email|message|write|send|reply|answer|book|schedule|buy|get|pick|order|pay|clean|tidy|wash|fold|cook|make|prepare|plan|finish|complete|start|begin|build|create|design|fix|repair|check|review|read|study|learn|practice|practise|walk|run|exercise|workout|stretch|meditate|cancel|renew|return|submit|file|print|sign|upload|download|update|organi[sz]e|sort|pack|drive|visit|see|meet|ask|tell|remind|water|feed|take|bring|drop|collect|apply|register|research|find|look|set|renew|attend|go|do|put|clear|empty|wrap|post|publish|launch|record|edit|draw|paint|practice|brush|shower|sleep|rest|eat|drink|sell|invoice|confirm|follow|contact|speak|talk|discuss|prep|finalise|finalize|unpack|vacuum|mop|dust|iron|mow|declutter|back up|backup|cancel|reschedule|renew|donate|recycle|tidy|water|shop|stock|deliver|install|assemble|measure|test|try|compare|decide|choose|list|brainstorm|outline|draft|proofread|rehearse|memori[sz]e|revise|pitch|present|negotiate|hire|interview|train|teach|help|join|enrol|enroll|subscribe|unsubscribe|log|track|weigh|stop|quit|limit|save|budget|transfer|withdraw|deposit|claim|reach|chase|nudge|ping|dm|whatsapp|facetime|zoom".split("|");
var VERB_RE = new RegExp("^(?:" + VERBS.join("|") + ")\\b", "i");
var COMMIT_RE = /\b(?:i(?:'m| am) (?:going|gonna|planning|trying|hoping|aiming) to|i(?:'ll| will| better|'d better| should probably| probably need to| really need to| really have to| just need to| just have to)(?: to)?|i (?:need|have|got|ve got|must|should|ought|gotta|want|will|am going|m going|plan) ?(?:to)?|want to|wanna|gonna|trying to|planning to|hoping to|aiming to|i've got to|need to|have to|has to|got to|gotta|must|should|supposed to|going to|remember to|don'?t forget(?: to)?|make sure(?: to| i| we)?|remind me to|i also have to|i also need to)\b/i;
var FEEL_RE = /\b(?:i(?:'m| am| feel|'ve been| have been| was)|feeling|feel|so|really|very|totally|completely|a bit|kind of|sort of)\s+(?:so |really |very |totally |completely |a bit |kind of |sort of )?(stressed|stressing|overwhelmed|overwhelming|anxious|anxiety|tired|exhausted|sad|burnt out|burned out|burnt|behind|worried|scared|nervous|angry|stuck|lost|drained|swamped|frazzled|panick\w*|low|flat|unmotivated|hopeless|lonely|fine|happy|good|great|excited|proud|calm|relieved|bored|frustrated|upset|sick|unwell|ill)\b/i;
var FEEL_LOW = /stress|overwhelm|anxi|tired|exhaust|sad|burn|behind|worr|scar|nervous|angry|stuck|lost|drain|swamp|frazzl|panic|low|flat|unmotiv|hopeless|lonely|frustrat|upset|sick|unwell|ill\b/i;
var TOO_MUCH_RE = /\b(?:so much|too much|too many|can'?t cope|cannot cope|can'?t keep up|don'?t know where to start|don'?t know what to do|no idea what to do|drowning|falling behind|so behind|never enough time)\b/i;
var IDEA_RE = /^\s*(?:idea\s*[:\-]|maybe\b|what if\b|it would be (?:nice|cool|great|good)\b|someday\b|some day\b|one day\b|i (?:could|might|may) (?:also )?\b|how about\b|wouldn'?t it be\b|thinking (?:about|of)\b)/i;
var GOAL_RE = /\b(?:my goal is|goal\s*[:\-]|i want to|i'd like to|i would like to|i wish|i hope to|i'm trying to|i am trying to|i'm working (?:on|towards)|i am working (?:on|towards)|dream of|aiming to|i want|i'd love to)\b/i;
var BIG_GOAL_RE = /\b(?:start|launch|build|grow|write (?:a|my) (?:book|novel|thesis)|learn (?:to|how|a|an|\w+ ?language|spanish|french|german|japanese|piano|guitar|coding|code)|lose \d+|read \d+ (?:books|pages|chapters)|save (?:up|\$\d*|£\d*|€\d*|\d+)|run a (?:5k|10k|marathon|half)|get (?:fit|healthy|healthier|stronger|fitter|organi[sz]ed|better|in shape|promoted|a job|my)|become|improve|finish (?:my|the) (?:degree|course|thesis|book)|pass|move (?:to|house|out)|change careers?|learn)\b/i;
var VAGUE_GOAL_RE = /\b(?:healthier|healthy|fit|fitter|in shape|organi[sz]ed|productive|happier|calmer|better|more (?:active|organi[sz]ed|confident|focused|disciplined)|less stressed|stronger|successful|rich|wealthy|consistent|disciplined|balanced|focused)\b/i;
var MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];
var GOAL_HORIZON_RE = /\b(?:this year|next year|by (?:january|february|march|april|may|june|july|august|september|october|november|december)|in \d+ (?:months?|years?)|by the end of (?:the )?year|\d+ (?:books|kg|lbs|pounds|dollars|km|miles|clients|customers))\b/i;
var URGENT_RE = /\b(?:urgent|urgently|asap|as soon as possible|immediately|critical|right away|top priority|very important|really important|important|must|deadline|due)\b/i;
var OPTIONAL_RE = /\b(?:if i have time|if there'?s time|if i can|when i can|when i get a chance|sometime|some time|eventually|whenever|no rush|at some point|maybe|optional|nice to have)\b/i;
var ESSENTIAL_RE = /\b(?:appointment|doctor|dentist|flight|interview|exam|surgery|court|deadline|due|pick up the kids|school run|funeral|wedding|rent|taxes|tax return|passport|visa|medication|medicine|prescription|hospital|therapy|physio|vet)\b/i;
var FILLER_RE = /\b(?:so like|um+|uh+|er+|erm|hmm+|like,|you know,?|basically|literally|actually|honestly|okay so|ok so|alright|so yeah|yeah|well,|i mean,?|kind of|sort of|i guess|i think|i suppose|please|pretty much)\b[,]?/gi;

function lc(s) { return String(s || "").toLowerCase(); }
function cap(s) { s = String(s || "").trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function stem(w) { return String(w).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5); }
var STOP = { the: 1, a: 1, an: 1, to: 1, and: 1, of: 1, for: 1, my: 1, me: 1, on: 1, in: 1, at: 1, with: 1, about: 1, up: 1, it: 1, i: 1, some: 1, all: 1, that: 1, this: 1, your: 1, our: 1, be: 1, is: 1 };
function sig(text) { return String(text || "").toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w && !STOP[w]; }).map(stem); }

function lev(a, b) {
  if (a === b) return 0;
  var al = a.length, bl = b.length; if (Math.abs(al - bl) > 2) return 9;
  var prev = [], cur = [], i, j;
  for (j = 0; j <= bl; j++) prev[j] = j;
  for (i = 1; i <= al; i++) {
    cur = [i];
    for (j = 1; j <= bl; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
    prev = cur;
  }
  return prev[bl];
}
/* Speech and thumbs misspell. Fix near-misses of the words that carry dates. */
function fixTypos(text) {
  return String(text).replace(/[A-Za-z']+/g, function (w) {
    var l = w.toLowerCase();
    if (l.length < 5) return w;
    var best = null, bd = 9;
    for (var i = 0; i < VOCAB.length; i++) {
      if (VOCAB[i] === l) return w;
      var d = lev(l, VOCAB[i]);
      if (d < bd) { bd = d; best = VOCAB[i]; }
    }
    var limit = l.length >= 9 ? 2 : 1;
    return (best && bd <= limit && bd > 0 && best.charAt(0) === l.charAt(0)) ? best : w;
  });
}

/* "twenty five" -> 25, "three thirty pm" -> "3:30 pm", "half past two" -> "2:30" ... */
function numberWords(s) {
  s = s.replace(new RegExp("\\b(" + "twenty|thirty|forty|fifty" + ")[\\s-](one|two|three|four|five|six|seven|eight|nine)\\b", "gi"), function (m, a, b) { return String(NUM[a.toLowerCase()] + NUM[b.toLowerCase()]); });
  s = s.replace(/\ba couple of\b/gi, "2").replace(/\ba few\b/gi, "3").replace(/\bhalf an hour\b/gi, "30 minutes").replace(/\ban hour and a half\b/gi, "90 minutes").replace(/\b(an|one) hour\b/gi, "1 hour").replace(/\ba quarter of an hour\b/gi, "15 minutes");
  s = s.replace(/\b(?:at )?half past (\w+)/gi, function (m, h) { var n = /^\d+$/.test(h) ? +h : NUM[h.toLowerCase()]; return n == null ? m : "at " + n + ":30"; });
  s = s.replace(/\b(?:at )?quarter past (\w+)/gi, function (m, h) { var n = /^\d+$/.test(h) ? +h : NUM[h.toLowerCase()]; return n == null ? m : "at " + n + ":15"; });
  s = s.replace(/\b(?:at )?quarter to (\w+)/gi, function (m, h) { var n = /^\d+$/.test(h) ? +h : NUM[h.toLowerCase()]; return n == null ? m : "at " + (((n + 10) % 12) + 1) + ":45"; });
  s = s.replace(new RegExp("\\bat (" + NUMW + ") (thirty|fifteen|forty[- ]five|forty|twenty|ten|five|oh[- ]five|\\d{2}) ?(am|pm)?\\b", "gi"), function (m, h, mm, ap) { var hh = NUM[h.toLowerCase()]; var mw = mm.toLowerCase().replace(/[- ]/g, ""); var mi = /^\d+$/.test(mw) ? +mw : mw === "fortyfive" ? 45 : mw === "ohfive" ? 5 : NUM[mw]; if (mi == null || mi > 59) return m; return "at " + hh + ":" + (mi < 10 ? "0" + mi : mi) + (ap ? " " + ap : ""); });
  s = s.replace(new RegExp("\\bat (" + NUMW + ")\\s*(?:o'?clock)?\\b", "gi"), function (m, h) { return "at " + NUM[h.toLowerCase()]; });
  s = s.replace(/\bat (\d{1,2}) o'?clock\b/gi, "at $1");
  s = s.replace(/\bat (\d{1,2}) (\d{2})\b(?!\s*(?:min|hour|hr))/gi, "at $1:$2");
  /* number words before a noun: "three emails" -> "3 emails" */
  s = s.replace(new RegExp("\\b(" + NUMW + ")\\b(?=\\s+(?:emails?|calls?|texts?|messages?|tasks?|things?|pages?|chapters?|bills?|letters?|forms?|rooms?|loads?|items?|minutes?|mins?|hours?|hrs?|days?|weeks?|people|clients?|invoices?|reports?|videos?|posts?|lessons?|exercises?|problems?|questions?))", "gi"), function (m) { return String(NUM[m.toLowerCase()]); });
  return s;
}
/* "at 3" with no am/pm: speech and typing mean the afternoon for 1-7, morning for 8-11. */
function clockSense(s) {
  var assumed = false;
  s = s.replace(/\bat (\d{1,2})(?::(\d{2}))?(?!\s*(?:am|pm|a\.m|p\.m|:|\d|\s*(?:min|hour|hr)))\b/gi, function (m, h, mi) {
    h = +h; if (h < 1 || h > 12) return m;
    assumed = true;
    var ap = (h >= 1 && h <= 7) || h === 12 ? "pm" : "am";
    return "at " + h + (mi ? ":" + mi : "") + " " + ap;
  });
  return { text: s, assumed: assumed };
}
function dayParts(s) {
  s = s.replace(/\b(?:around|about|roughly|approximately)\s+(?=\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b)/gi, "at ").replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:'s)? (morning|afternoon|evening)\b/gi, "$1 in the $2").replace(/\bfor (monday|tuesday|wednesday|thursday|friday|saturday|sunday)'s (\w+)/gi, "for the $2 by $1");
  s = s.replace(/\bthis morning\b/gi, "today in the morning").replace(/\bthis afternoon\b/gi, "today in the afternoon").replace(/\bthis evening\b/gi, "today in the evening")
    .replace(/\btomorrow (morning|afternoon|evening)\b/gi, "tomorrow in the $1").replace(/\bfirst thing\b/gi, "at 8:00 am").replace(/\bafter work\b/gi, "at 5:30 pm").replace(/\bbefore lunch\b/gi, "at 11:30 am").replace(/\bafter lunch\b/gi, "at 1:30 pm").replace(/\bat midnight\b/gi, "at 11:59 pm").replace(/\bend of (?:the )?day\b/gi, "at 5 pm").replace(/\blunch ?time\b/gi, "at 12:30 pm");
  return s;
}
function weekDate(base, wd) { var d = L.parseKey(base), cur = d.getDay(); var add = (wd - cur + 7) % 7; return L.addDays(base, add); }
function lastDayOfMonth(base) { var d = L.parseKey(base); return L.toKey(new Date(d.getFullYear(), d.getMonth() + 1, 0)); }
/* Phrases parseItem does not know. Each becomes a plain ISO date it does. */
function wideDates(s, base) {
  var deadline = false, m, monthOnly = false;
  function sub(re, fn) { var mm = s.match(re); if (mm) { var r = fn(mm); if (r) { s = s.replace(mm[0], " " + r + " "); return true; } } return false; }
  var d0 = L.parseKey(base).getDay();
  var mo1 = s.match(/\b(?:in|for|during|by|before|until|next)\s+(january|february|march|april|june|july|august|september|october|november|december)\b(?!\s*\d)/i);
  if (mo1 && !/\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:january|february|march|april|june|july|august|september|october|november|december)\b/i.test(s)) { var mi1 = MONTHS.indexOf(mo1[1].toLowerCase()), y1 = L.parseKey(base).getFullYear(); var k1 = L.toKey(new Date(y1, mi1, 1)); if (k1 < base) k1 = L.toKey(new Date(y1 + 1, mi1, 1)); s = s.replace(mo1[0], " " + k1 + " "); monthOnly = true; if (/^(?:by|before|until)$/i.test(mo1[0].split(" ")[0])) deadline = true; }
  if (sub(/\b(?:by |before |until |due |on )?(?:the )?end of (?:the )?week\b/i, function () { return weekDate(base, 5); })) deadline = true;
  if (sub(/\b(?:by |before |until |due )?(?:the )?end of (?:the )?month\b/i, function () { return lastDayOfMonth(base); })) deadline = true;
  sub(/\b(?:this|over the|on the) weekend\b/i, function () { return weekDate(base, 6); });
  sub(/\bnext week\b/i, function () { return L.addDays(weekDate(base, 1), d0 === 1 ? 7 : 0); });
  sub(/\bin (\d+) weeks?\b/i, function (x) { return L.addDays(base, 7 * +x[1]); });
  sub(/\bnext month\b/i, function () { var d = L.parseKey(base); return L.toKey(new Date(d.getFullYear(), d.getMonth() + 1, 1)); });
  sub(/\b(?:on )?the (\d{1,2})(?:st|nd|rd|th)\b/i, function (x) {
    var day = +x[1]; if (day < 1 || day > 31) return null;
    var d = L.parseKey(base), y = d.getFullYear(), mo = d.getMonth();
    var key = function (yy, mm) { var dim = new Date(yy, mm + 1, 0).getDate(); return L.toKey(new Date(yy, mm, Math.min(day, dim))); };
    var k = key(y, mo); if (k < base) k = key(mo === 11 ? y + 1 : y, (mo + 1) % 12); return k;
  });
  if (/\b(?:by|before|until|due(?: on| by)?)\s+(?=(?:\d{4}-\d{2}-\d{2}|tomorrow|today|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next|the end|\d{1,2}[\/ ]))/i.test(s)) {
    deadline = true;
    s = s.replace(/\b(?:by|before|until|due(?: on| by)?)\s+(?=(?:\d{4}-\d{2}-\d{2}|tomorrow|today|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next|\d{1,2}[\/ ]))/i, " ");
  }
  if (/\b(?:due|deadline)\b/i.test(s)) deadline = true;
  return { text: s, deadline: deadline, monthOnly: monthOnly };
}

/* The smallest honest version of a task, tied to the task itself. */
var SMALLEST = [
  [/\b(website|web site|landing page|homepage|site)\b/, "Open the editor and write the homepage headline", "Open the website editor"],
  [/\b(presentation|slides|deck|pitch)\b/, "Open the slides and write the title", "Open the slides"],
  [/\b(email|e-mail|reply|inbox)\b/, "Open a new email and write the first line", "Open a new email"],
  [/\b(call|phone|ring|dial)\b/, "Find the number and press call", "Find the number"],
  [/\b(text|message|whatsapp|dm)\b/, "Write the first sentence of the message", "Open the chat"],
  [/\b(clean|tidy|declutter|vacuum|mop|dust|kitchen|bedroom|bathroom|house|room|garage|desk)\b/, "Clear one small surface", "Pick up five things"],
  [/\b(laundry|clothes|wash|iron|fold)\b/, "Put one load in", "Gather the clothes in one pile"],
  [/\b(study|read|chapter|revise|homework|learn|course|lesson|exam)\b/, "Read one paragraph and write one key point", "Open the book or course"],
  [/\b(exercise|gym|workout|run|jog|walk|yoga|stretch|swim)\b/, "Put on your shoes and walk for five minutes", "Put on your workout clothes"],
  [/\b(write|essay|report|article|blog|book|thesis|draft|proposal)\b/, "Open the document and write the title", "Open the document"],
  [/\b(pay|bill|invoice|rent|tax|taxes|bank)\b/, "Open the bill and check the amount", "Find the bill"],
  [/\b(buy|shop|shopping|groceries|order|purchase)\b/, "Add the first item to a list on your phone", "Open your shopping list"],
  [/\b(book|schedule|reserve|appointment|booking)\b/, "Open the booking page or find the number", "Open the booking page"],
  [/\b(plan|organi[sz]e|sort|budget|research)\b/, "Write down the next three things", "Write down the very next action"],
  [/\b(cook|meal|dinner|lunch|breakfast|prep)\b/, "Decide what you will eat and take out one ingredient", "Pick a meal"],
  [/\b(pack|trip|travel|holiday|flight)\b/, "Put the passport and charger in a bag", "Open a packing list"],
  [/\b(fix|repair|install|assemble)\b/, "Get the tool or the parts out and look at it", "Look at the problem for two minutes"],
  [/\b(meditate|breathe|rest|sleep|relax)\b/, "Sit down and take five slow breaths", "Take three slow breaths"]
];
function smallestVersion(title) {
  var l = lc(title);
  for (var i = 0; i < SMALLEST.length; i++) if (SMALLEST[i][0].test(l)) return { small: SMALLEST[i][1], first: SMALLEST[i][2] };
  return { small: "Just 5 minutes: " + String(title).replace(/\.$/, ""), first: "Open what you need for it" };
}

function stripFeel(t) { return t.replace(/\s*,?\s*(?:it'?s|its|this is|that'?s) (?:so |really |very |super )?(?:stressful|scary|annoying|overwhelming|hard|boring|exhausting)\b.*$/i, ""); }
function cleanTitle(t) {
  t = stripFeel(t);
  t = String(t || "").replace(/\s+for\s+\d+(?:\.\d+)?\s*(?:h|hr|hrs|hours?|m|min|mins|minutes?)\b/i, "");
  t = t.replace(COMMIT_RE, " ").replace(/^\s*(?:and|then|also|plus|oh and|and also|and then|but|so|to)\b[\s,]*/i, "").replace(/\bi also\b/i, " ");
  t = t.replace(/^\s*(?:to\s+)/i, "").replace(/\s+/g, " ").replace(/^[\s,.\-:;]+|[\s,.\-:;]+$/g, "");
  t = t.replace(/,?\s*\b(?:all|both|everything)\s*$/i, "").replace(/\b(?:my|the)\s*$/i, "").replace(/^\s*(?:like|so|just)\s+/i, "").trim();
  t = t.replace(/^\s*i\s+(?:really\s+|just\s+|also\s+|still\s+|definitely\s+|absolutely\s+|probably\s+|actually\s+)*/i, "").replace(/^\s*(?:really|probably|definitely|just|still)\s+/i, "").replace(/^(?:a|an)\s+(?=[a-z]+ (?:appointment|meeting|session|call|class)\b)/i, "");
  t = t.replace(/\bi\b/g, "I").replace(/\s+'s\b/g, "").replace(/\s+(?:morning|afternoon|evening)$/i, "");
  return cap(t);
}

function splitSentences(text) {
  var out = [];
  String(text || "").replace(/\r/g, "").split(/\n+/).forEach(function (line) {
    line = line.replace(/^\s*(?:[-*•\u2022]|\d+[.)]|\[[ x]?\])\s*/, "");
    /* keep abbreviations and times like 3.30 together */
    var parts = line.split(/(?<=[a-z0-9)"'])[.!?]+(?:\s+|$)(?=[A-Za-z"'])|;\s*/);
    parts.forEach(function (p) { p = p.trim(); if (p) out.push(p); });
  });
  return out;
}
/* A conjunction splits a sentence only when the next piece is its own action,
   so "buy milk, eggs and bread" stays one list and "email Sam and call Bo" splits. */
function splitClauses(sentence) {
  var s = sentence.trim();
  var pieces = s.split(/\s*(?:,\s*(?:and\s+|then\s+)?|\s+and then\s+|\s+and also\s+|\s+then\s+|\s+and\s+(?=i\b)|\s+after that\s+|\s+and\s+(?=(?:remember|don'?t forget|make sure)\b)|\s+and\s+)\s*/i);
  if (pieces.length < 2) return [s];
  var out = [], cur = pieces[0];
  for (var i = 1; i < pieces.length; i++) {
    var p = pieces[i];
    p = p.replace(/^\s*(?:maybe|perhaps|probably|also|then|just)\s+/i, "");
    var sched = /\b(?:every|daily|weekly|at \d\w*|tomorrow|tonight|today|on (?:mon|tue|wed|thu|fri|sat|sun)\w*)\b/i;
    var schedSplit = sched.test(p) && sched.test(cur) && p.trim().split(/\s+/).length >= 2;
    var FEELRE = /^(?:feeling|i(?:'m| am| feel| felt)|it(?:'s| is)|this is|that(?:'s| is)|so |honestly|ugh|stressed|anxious|worried|overwhelmed|tired|exhausted)\b/i;
    var feelStart = /^(?:feeling|i(?:'m| am| feel| felt)|it(?:'s| is)|this is|that(?:'s| is)|so |honestly|ugh|stressed|anxious|worried|overwhelmed|tired|exhausted)\b/i.test(p.trim());
    var startsAction = feelStart || schedSplit || VERB_RE.test(p.trim()) || COMMIT_RE.test(p.slice(0, 40)) || /^(?:i\b|we\b)/i.test(p.trim()) || /^(?:remember|don'?t forget|make sure)/i.test(p.trim());
    var curHasAction = VERB_RE.test(cur.trim().replace(COMMIT_RE, "").trim()) || COMMIT_RE.test(cur) || /\b(?:meeting|appointment|lunch|dinner|class|call|flight|party|session|interview|gym|workout|yoga|swim|swimming|therapy|haircut|practice|training|shift|lesson|church|rehearsal)\b/i.test(cur) || /\b(?:at\s+\d{1,2}(?::\d\d)?\s*(?:am|pm)?|\d{1,2}(?::\d\d)?\s*(?:am|pm))\b/i.test(cur);
    var curFeel = FEELRE.test(cur.trim()) && !/\b(?:need|have|got|must|should|want|going) to\b/i.test(cur);
    if (feelStart && cur.trim()) { out.push(cur); cur = p; }
    else if (curFeel && (VERB_RE.test(p.trim()) || COMMIT_RE.test(p.slice(0, 40)))) { out.push(cur); cur = p; }
    else if (startsAction && curHasAction) { out.push(cur); cur = p; }
    else cur = cur + ", " + p;
  }
  out.push(cur);
  return out;
}

function overlap(a, b) {
  var A = sig(a), B = sig(b); if (!A.length || !B.length) return 0;
  var common = A.filter(function (w) { return B.indexOf(w) !== -1; }).length;
  return common / Math.max(A.length, B.length);
}
var GENERIC = { build: 1, make: 1, finish: 1, start: 1, learn: 1, get: 1, complete: 1, work: 1, plan: 1, create: 1, launch: 1, write: 1, prepare: 1, review: 1, update: 1, send: 1, check: 1, do: 1, doing: 1 };
function findGoal(text, goals) {
  var best = null, bs = 0, ts = sig(text);
  (goals || []).forEach(function (g) {
    var words = String(g.title || g.name || "").toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w.length > 2 && !STOP[w] && !GENERIC[w]; }).map(stem);
    if (!words.length) return;
    var hit = words.filter(function (w) { return ts.indexOf(w) !== -1; }).length;
    var score = hit / words.length;
    if (hit && score > bs && score >= 0.5) { bs = score; best = g; }
  });
  return best;
}
function findDuplicate(item, tasks) {
  for (var i = 0; i < (tasks || []).length; i++) {
    var t = tasks[i]; if (!t || t.status === "done") continue;
    if (overlap(item.title, t.title) >= 0.8 && (t.date === item.date || !!t.repeat)) return t;
  }
  return null;
}
function hash(s) { var h = 5381; s = String(s); for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return "h" + (h >>> 0).toString(36); }
function fingerprint(text) { return hash(lc(text).replace(/[^a-z0-9]+/g, " ").trim()); }

function goalEnd(l, base) {
  var m = l.match(/\bby (january|february|march|april|may|june|july|august|september|october|november|december)\b/), d = L.parseKey(base);
  if (m) { var mi = MONTHS.indexOf(m[1]); var y = d.getFullYear(); var k = L.toKey(new Date(y, mi + 1, 0)); if (k < base) k = L.toKey(new Date(y + 1, mi + 1, 0)); return k; }
  if (/\bthis year\b|end of (?:the )?year/.test(l)) return d.getFullYear() + "-12-31";
  if (/\bnext year\b/.test(l)) return (d.getFullYear() + 1) + "-12-31";
  m = l.match(/\bin (\d+) (months?|years?)\b/); if (m) { var n = +m[1] * (/year/.test(m[2]) ? 12 : 1); return L.toKey(new Date(d.getFullYear(), d.getMonth() + n, d.getDate())); }
  return null;
}
function goalQuestions(clause) {
  var l = lc(clause);
  if (/health|fit|shape|strong|weight|active/.test(l)) return { q: "What would getting healthier look like for you?", options: ["Walk more regularly", "Eat better", "Sleep better", "Go to the gym"] };
  if (/organi|tidy|clutter/.test(l)) return { q: "What would feel organised to you?", options: ["A clear desk", "A tidy home", "A weekly plan", "Papers sorted"] };
  if (/money|rich|wealth|save|budget/.test(l)) return { q: "What would feel like progress with money?", options: ["Save a set amount", "Pay down a debt", "Track spending", "Earn more"] };
  if (/product|focus|discipline|consist/.test(l)) return { q: "What would a more focused day look like?", options: ["One main task a day", "A fixed start time", "Phone away for 25 minutes", "A daily plan"] };
  if (/happ|calm|stress|balance/.test(l)) return { q: "What would make you feel calmer?", options: ["A daily walk", "Ten quiet minutes", "Fewer commitments", "Time with friends"] };
  return { q: "What would success look like, in one sentence?", options: [] };
}

function inferLevel(clauses) { return clauses.some(function (c) { return c.kind === "feeling" && c.mood === "low"; }) ? "low" : null; }

/* Main entry. ctx: { goals, tasks, processed:[fingerprints], nowMin } */
function understand(text, baseKey, ctx) {
  ctx = ctx || {};
  baseKey = baseKey || L.todayKey();
  var raw = String(text || "");
  var out = { items: [], notes: [], feelings: [], goals: [], questions: [], suggestLevel: null, fingerprint: fingerprint(raw), alreadyProcessed: false, heard: 0, original: raw };
  if (!raw.trim()) return out;
  if ((ctx.processed || []).indexOf(out.fingerprint) !== -1) out.alreadyProcessed = true;
  var sentences = splitSentences(fixTypos(raw));
  var seen = [];
  var listMode = raw.split(/\n+/).filter(function (x) { return x.trim(); }).length >= 3;
  sentences.forEach(function (sentence) {
    var cleaned = sentence.replace(FILLER_RE, " ").replace(/\s+/g, " ").trim();
    if (!cleaned) return;
    var prepared = dayParts(numberWords(cleaned));
    var clauses = splitClauses(prepared);
    /* a closing "by Friday" on a multi-task sentence belongs to every task in it */
    var tail = clauses.length > 1 ? prepared.match(/\b(?:all |both |everything )?(?:by|before|due|on) ((?:next )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)|the end of (?:the )?(?:week|month))\s*[.!]?\s*$/i) : null;
    clauses.forEach(function (clause, ci) {
      clause = clause.trim(); if (!clause) return;
      if (tail && ci < clauses.length - 1 && !/\b(?:by|before|due|on|tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(clause) && /\b(?:all|both|everything)\b/i.test(prepared)) clause += " by " + tail[1];
      var l = lc(clause);
      var hasAction = VERB_RE.test(clause.replace(COMMIT_RE, "").replace(/^(?:and|then|also|to)\s+/i, "").trim()) || COMMIT_RE.test(clause) || /\b(?:meeting|appointment|lunch|dinner|class|flight|party|interview|exam|deadline|due|gym|workout|yoga|swim|swimming|therapy|haircut|practice|training|lesson|rehearsal)\b/i.test(clause) || ESSENTIAL_RE.test(clause) || (/\b(?:at \d|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|next month|this weekend|in \d+ (?:days|weeks))\b/i.test(clause) && clause.split(/\s+/).length <= 8 && !/\b(?:feel|felt|think)\b/i.test(clause));
      var fm = clause.match(FEEL_RE);
      /* Feelings and "too much" are journal entries, never tasks. */
      if ((fm && !/\b(?:need|have|must|should|going) to\b/i.test(clause) && !(VERB_RE.test(clause) && !/^(?:i|i'm|i am|feeling|so)\b/i.test(clause))) || (TOO_MUCH_RE.test(l) && !hasAction)) {
        var low = fm ? FEEL_LOW.test(fm[1]) : true;
        if (TOO_MUCH_RE.test(l)) low = true;
        out.feelings.push({ kind: "feeling", text: cap(clause.replace(/[.!]+$/, "")), mood: low ? "low" : "good", mention: fm ? fm[1].toLowerCase() : "overwhelmed" });
        return;
      }
      if (IDEA_RE.test(clause) && !/\bby\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow)\b/i.test(clause)) {
        out.notes.push({ kind: "idea", text: cap(clause.replace(/^\s*idea\s*[:\-]\s*/i, "").replace(/[.!]+$/, "")) });
        return;
      }
      var gm = GOAL_RE.test(l) || (BIG_GOAL_RE.test(l) && GOAL_HORIZON_RE.test(l) && !/\b(?:tomorrow|today|tonight|at \d)/i.test(l)) || /^\s*(?:get|become|be)\s+(?:more |much |a lot )?(?:healthier|healthy|fit|fitter|organi[sz]ed|productive|stronger|happier|calmer|better)\b/i.test(clause);
      if (gm && (BIG_GOAL_RE.test(l) || VAGUE_GOAL_RE.test(l) || /\bi (?:want|wish|hope|dream)\b/i.test(clause)) && !/\b(?:tomorrow|today|tonight|at \d)/i.test(l)) {
        var gtitle = cleanTitle(clause.replace(GOAL_RE, " ").replace(/^\s*(?:to|get)\s+/i, function (m) { return /^\s*get/i.test(m) ? "Get " : ""; }));
        var vague = VAGUE_GOAL_RE.test(l) && !/\d/.test(l);
        var gend = goalEnd(l, baseKey);
        var g = { end: gend, kind: "goal", title: gtitle || cap(clause), needsClarify: vague, question: vague ? goalQuestions(clause) : null, text: cap(clause) };
        out.goals.push(g);
        if (vague) out.questions.push({ about: g.title, q: g.question.q, options: g.question.options });
        return;
      }
      if (!hasAction && listMode && clause.split(/\s+/).length <= 8 && !fm) { var wk = buildTask(clause, baseKey, ctx, seen, "list"); if (wk) out.items.push(wk); return; }
      if (!hasAction) {
        /* No action in it: keep it as a note rather than inventing a task. */
        if (clause.split(/\s+/).length >= 4) out.notes.push({ kind: "note", text: cap(clause.replace(/[.!]+$/, "")) });
        else if (/[a-z]/i.test(clause)) out.items.push(buildTask(clause, baseKey, ctx, seen, true));
        return;
      }
      var task = buildTask(clause, baseKey, ctx, seen, false);
      if (task) out.items.push(task);
    });
  });
  out.items = out.items.filter(Boolean);
  out.suggestLevel = (out.feelings.some(function (f) { return f.mood === "low"; }) || out.items.length >= 8) ? "low" : null;
  out.heard = out.items.length + out.notes.length + out.feelings.length + out.goals.length;
  out.summary = summarize(out);
  return out;
}

function buildTask(clause, baseKey, ctx, seen, weak) {
  var work = clause, doneLater = false;
  var assumedClock = false;
  var cs = clockSense(work); work = cs.text; assumedClock = cs.assumed;
  var wd = wideDates(work, baseKey); work = wd.text;
  var priorityBoost = URGENT_RE.test(clause) ? 3 : 0;
  var optional = OPTIONAL_RE.test(clause);
  var qty = null, qm = work.match(/\b(\d{1,2}) (emails?|calls?|texts?|messages?|bills?|letters?|forms?|invoices?|reports?|chapters?|pages?|posts?|videos?|lessons?|loads?)\b/i);
  if (qm) qty = { n: +qm[1], noun: qm[2] };
  work = work.replace(OPTIONAL_RE, " ").replace(/\b(?:asap|urgent(?:ly)?|immediately|right away|as soon as possible)\b/gi, function () { return " "; }).replace(/\bvery important\b|\breally important\b/gi, " ");
  var item = L.parseItem(work, baseKey);
  if (!item) return null;
  item.title = cleanTitle(item.title) || item.title;
  if (!item.title || item.title.length < 2) return null;
  if (wd.deadline) item.deadline = item.date;
  if (priorityBoost) item.priority = Math.max(item.priority, priorityBoost);
  if (item.priority >= 3 || ESSENTIAL_RE.test(clause)) item.essential = true;
  if (priorityBoost && /\b(?:important|urgent|asap|critical)\b/i.test(clause)) item.essential = item.essential || item.priority >= 3;
  item.optional = !!optional;
  if (qty && qty.n > 1) {
    var verb = /^(email|send|reply|write|call|text|message)/i.test(item.title) ? item.title.split(/\s+/)[0] : "Do";
    if (!/\d/.test(item.title)) item.title = cap(verb) + " " + qty.n + " " + qty.noun.toLowerCase().replace(/s?$/, "s");
    var perItem = /call/i.test(qty.noun) ? 10 : /email|message|text|reply/i.test(qty.noun) ? 8 : 15;
    if (!/(?:for \d|minutes|hour)/i.test(clause)) item.durationMin = Math.min(120, Math.max(10, perItem * qty.n));
  }
  var sv = smallestVersion(item.title);
  item.minVersion = sv.small; item.firstStep = sv.first;
  item.kind = "task";
  item.deadlineFlag = !!wd.deadline;
  item.confidence = 0.9;
  item.unsure = [];
  if (wd.monthOnly) { item.unsure.push("No exact day given. I used the 1st of the month."); item.confidence = 0.75; }
  if (weak === "list") { item.confidence = 0.78; }
  else if (weak) { item.confidence = 0.5; item.unsure.push("No clear action word. Check this is a task."); }
  if (assumedClock) { item.confidence = Math.min(item.confidence, 0.8); item.assumed = "time"; }
  if (item.title.split(/\s+/).length === 1 && !VERB_RE.test(item.title) && !item.time && !ESSENTIAL_RE.test(item.title) && item.date === baseKey && weak !== "list") { item.confidence = Math.min(item.confidence, 0.55); item.unsure.push("Very short. Is this a task?"); }
  if (/\b(?:sometime|someday|eventually)\b/i.test(clause)) { item.confidence = Math.min(item.confidence, 0.6); item.unsure.push("No clear date. I used today; change it if needed."); }
  if (item.time && item.date === baseKey && ctx.nowMin != null && L.toMin(item.time) < ctx.nowMin - 5 && /\bat\b/i.test(clause) && !/\btoday\b|\btomorrow\b/i.test(clause)) { item.confidence = Math.min(item.confidence, 0.7); item.unsure.push("That time has already passed today."); }
  item.confident = item.confidence >= 0.75;
  var g = findGoal(item.title + " " + clause, ctx.goals);
  if (g) { item.goalId = g.id; item.goalTitle = g.title || g.name; }
  var dup = findDuplicate(item, ctx.tasks);
  var batchDup = seen.filter(function (s) { return overlap(s.title, item.title) >= 0.85 && s.date === item.date; })[0];
  if (dup || batchDup) { item.duplicate = true; item.duplicateOf = dup ? dup.id : null; item.unsure.push("Looks like something already on your list."); }
  seen.push(item);
  item.source = "capture";
  item.sourceText = clause;
  return item;
}

function summarize(o) {
  var parts = [];
  if (o.items.length) parts.push(o.items.length + (o.items.length === 1 ? " task" : " tasks"));
  if (o.goals.length) parts.push(o.goals.length + (o.goals.length === 1 ? " goal" : " goals"));
  if (o.notes.length) parts.push(o.notes.length + (o.notes.length === 1 ? " note" : " notes"));
  if (o.feelings.length) parts.push("how you feel");
  return parts.length ? "I found " + parts.join(", ") + "." : "I did not find anything to sort. Your words are safe.";
}

var api = { understand: understand, smallestVersion: smallestVersion, fingerprint: fingerprint, splitClauses: splitClauses, splitSentences: splitSentences, fixTypos: fixTypos, numberWords: numberWords, overlap: overlap, findGoal: findGoal, goalQuestions: goalQuestions, cleanTitle: cleanTitle };
if (typeof module !== "undefined" && module.exports) module.exports = api;
root.PaceBrain = api;
})(typeof window !== "undefined" ? window : globalThis);
