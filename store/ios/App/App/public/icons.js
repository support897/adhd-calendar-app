/* Pace icons: swaps every emoji for a gentle line icon (Lucide, ISC). The emoji stays inside the span, so text and data never change. */
(function () {
  "use strict";
  var MAP = {"→": "arrow-right", "←": "arrow-left", "↑": "arrow-up", "↓": "arrow-down", "✓": "check", "✔": "check", "✕": "x", "✖": "x", "🌱": "sprout", "🌿": "sprout", "🪴": "sprout", "✅": "circle-check", "⏰": "alarm-clock", "🎯": "target", "🖼": "image", "🏠": "house", "🗑": "trash-2", "❤": "heart", "💜": "heart", "💛": "heart", "💞": "heart", "🎓": "graduation-cap", "🏫": "graduation-cap", "💼": "briefcase", "💰": "wallet", "💳": "wallet", "🚪": "door-open", "🏆": "trophy", "💬": "message-circle", "🔔": "bell", "👋": "hand", "🙏": "hand", "✋": "hand", "☁": "cloud", "👥": "users", "👯": "users", "📌": "pin", "📍": "pin", "🛏": "bed", "🛌": "bed", "😴": "bed", "🧹": "brush-cleaning", "🧺": "shirt", "👕": "shirt", "🚿": "shower-head", "🛁": "shower-head", "🍽": "utensils", "🍴": "utensils", "🔪": "utensils", "🛒": "shopping-cart", "🥕": "carrot", "☕": "coffee", "🍵": "coffee", "🫖": "coffee", "💧": "droplet", "💊": "pill", "🩺": "heart-pulse", "😊": "smile", "🥳": "smile", "🏃": "footprints", "🚶": "footprints", "🧘": "flower-2", "🌷": "flower-2", "💐": "flower-2", "🌻": "flower-2", "✿": "flower-2", "🌙": "moon", "🌃": "moon", "📚": "book-open", "📖": "book-open", "💻": "laptop", "📧": "mail", "✉": "mail", "📮": "mail", "💌": "mail", "📞": "phone", "📱": "phone", "📅": "calendar", "🗓": "calendar", "✍": "pen-line", "✏": "pen-line", "📝": "pen-line", "🧾": "receipt", "🛍": "shopping-bag", "🎒": "shopping-bag", "👜": "shopping-bag", "🎁": "gift", "👶": "baby", "🍼": "baby", "🧒": "baby", "🐕": "dog", "🐶": "dog", "🦮": "dog", "🐈": "cat", "🐱": "cat", "🚗": "car", "🚕": "car", "🚌": "bus", "🚆": "bus", "✈": "plane", "🗺": "map", "🌍": "map", "☀": "sun", "🌅": "sun", "🌇": "sun", "☔": "cloud-rain", "📦": "package", "🔧": "wrench", "🛠": "wrench", "🔩": "wrench", "🧰": "toolbox", "🏦": "landmark", "🏛": "landmark", "📑": "file-text", "📄": "file-text", "📋": "file-text", "🔑": "key-round", "🧠": "brain", "💡": "lightbulb", "🎵": "music", "🎨": "palette", "🖍": "palette", "📷": "camera", "🧴": "droplets", "🌊": "droplets", "🚰": "droplets", "🤝": "handshake", "🧭": "compass", "🔥": "flame", "🕯": "flame", "🧼": "spray-can", "🧽": "spray-can", "🍎": "apple", "🥗": "salad", "🥦": "salad", "🍳": "egg-fried", "🥪": "sandwich", "🍕": "pizza", "🍝": "pizza", "🍔": "beef", "🍰": "cake", "🎂": "cake", "🍷": "wine", "🍻": "wine", "🥤": "cup-soda", "🧃": "cup-soda", "🥛": "cup-soda", "🧊": "snowflake", "🛋": "sofa", "🪟": "app-window", "🪞": "square", "🚽": "toilet", "🪥": "sparkle", "🧻": "scroll", "🪣": "paint-bucket", "🔌": "plug", "🔋": "battery-charging", "⌚": "watch", "⏳": "hourglass", "🕒": "clock", "📎": "paperclip", "🖨": "printer", "📊": "chart-column", "📈": "trending-up", "📉": "trending-down", "🥇": "medal", "🏅": "medal", "🎉": "party-popper", "🎄": "tree-pine", "🧖": "flower", "💆": "flower", "💇": "scissors", "✂": "scissors", "💅": "scissors", "🧦": "footprints", "👓": "glasses", "🕶": "glasses", "🧳": "luggage", "☂": "umbrella", "🌡": "thermometer", "🩹": "bandage", "💉": "syringe", "🧬": "dna", "🏥": "hospital", "🚑": "ambulance", "👂": "ear", "🚴": "bike", "🚲": "bike", "🏊": "waves", "🏋": "dumbbell", "⚽": "volleyball", "🏀": "volleyball", "🎾": "volleyball", "⛳": "flag", "🥾": "mountain", "🏔": "mountain", "⛰": "mountain", "⛺": "tent", "🏖": "palmtree", "🎮": "gamepad-2", "🧩": "puzzle", "♟": "crown", "🎬": "clapperboard", "📺": "tv", "🎧": "headphones", "🎤": "mic", "🎸": "guitar", "🎹": "piano", "🥁": "drum", "🎭": "drama", "🎟": "ticket", "🧵": "spool", "🧶": "spool", "📐": "ruler", "🔬": "microscope", "🧪": "flask-conical", "🗣": "megaphone", "📣": "megaphone", "🏢": "building-2", "🏪": "store", "🏨": "store", "⚖": "scale", "🔒": "lock", "🛡": "shield", "🪙": "coins", "🪜": "wrench", "🪚": "hammer", "🌳": "trees", "🍂": "leaf", "🍀": "leaf", "🐟": "fish", "🐦": "bird", "🐇": "rabbit", "🐴": "paw-print", "🐾": "paw-print", "🧸": "baby", "👵": "user", "🧑‍🏫": "user", "🧑‍⚕️": "user", "🤱": "user", "👤": "user", "👨‍👩‍👧": "user", "💍": "gem", "🚢": "ship", "⛽": "fuel", "🛞": "circle", "🧯": "flame-kindling", "🧿": "eye", "⭐": "star", "🌟": "star", "🌈": "rainbow", "🪁": "wind", "🖥": "monitor", "🛂": "id-card", "🔇": "volume-x", "🍌": "banana", "✨": "sparkles", "🎊": "sparkles", "🖐": "hand", "🔟": "circle-dot", "💯": "percent", "🌤": "cloud-sun", "🛟": "life-buoy", "📂": "folder", "🐣": "footprints", "🫶": "hand-heart", "☘": "clover", "⚡": "gauge", "🔄": "rotate-ccw", "❗": "circle-alert", "⚠": "circle-alert", "➕": "plus", "➖": "minus", "🤹": "sparkles", "🏷": "badge-check", "⏱": "timer", "☎": "phone", "☾": "moon", "⛵": "sailboat", "🌆": "building", "🌐": "globe", "🌰": "leaf", "🌲": "tree-pine", "🌸": "flower", "🎈": "circle", "🎙": "mic", "🎻": "music", "🐷": "piggy-bank", "👀": "eye", "👗": "shirt", "🧥": "shirt", "👟": "footprints", "👧": "user", "👨": "user", "👩": "user", "🧑‍⚕": "user", "🧘‍♀": "user", "💎": "gem", "💾": "save", "📥": "download", "📿": "circle-dot", "🔊": "volume-2", "🕊": "bird", "🗂": "folders", "🗼": "landmark", "😄": "smile", "🙂": "smile", "😟": "frown", "🚀": "rocket", "🚩": "flag", "🛑": "octagon-x", "🦷": "smile", "🧢": "hat-glasses"};
  var RX = /(?:[\u{1F1E6}-\u{1F1FF}]{2}|[\u{1F300}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}])\uFE0F?(?:\u200D[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\uFE0F?)*/gu;
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, TITLE: 1, NOSCRIPT: 1, OPTION: 1, CODE: 1 };
  function keyOf(e) { return e.replace(/\uFE0F/g, ""); }
  function ok(node) {
    var p = node.parentNode; if (!p || p.nodeType !== 1) return false;
    if (SKIP[p.nodeName] || p.namespaceURI !== "http://www.w3.org/1999/xhtml") return false;
    if (p.closest && (p.closest(".pi") || p.closest("[contenteditable=true]") || p.closest("[data-keep-emoji]"))) return false;
    return true;
  }
  function svgWrap(t) {
    var tx = t.parentNode; if (!tx || tx.nodeName !== "text") return;
    var s = (t.nodeValue || "").trim(); RX.lastIndex = 0; var m = RX.exec(s); if (!m) return;
    var name = MAP[keyOf(m[0])]; if (!name) return;
    var cs = getComputedStyle(tx), fs = parseFloat(cs.fontSize) || 20, x = parseFloat(tx.getAttribute("x")) || 0, y = parseFloat(tx.getAttribute("y")) || 0;
    var fo = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    fo.setAttribute("x", x - fs * 0.6); fo.setAttribute("y", y - fs * 0.95); fo.setAttribute("width", fs * 1.2); fo.setAttribute("height", fs * 1.2);
    fo.setAttribute("class", tx.getAttribute("class") || "");
    var i = document.createElement("i"); i.className = "pi"; i.setAttribute("aria-hidden", "true"); i.setAttribute("data-k", name);
    i.style.setProperty("--pm", "var(--i-" + name + ")"); i.style.fontSize = fs + "px"; i.style.color = cs.fill && cs.fill !== "none" ? cs.fill : "currentColor"; i.textContent = m[0];
    fo.appendChild(i); tx.parentNode.replaceChild(fo, tx);
  }
  function wrap(t) {
    if (t.parentNode && t.parentNode.namespaceURI === "http://www.w3.org/2000/svg") { svgWrap(t); return; }
    var s = t.nodeValue; if (!s || s.length > 4000) return;
    RX.lastIndex = 0; if (!RX.test(s)) return;
    if (t.parentNode && t.parentNode.nodeName === "OPTION") { t.nodeValue = s.replace(RX, "").replace(/^\s+/, ""); return; }
    if (!ok(t)) return;
    RX.lastIndex = 0;
    var frag = document.createDocumentFragment(), last = 0, m, any = false;
    while ((m = RX.exec(s))) {
      var name = MAP[keyOf(m[0])]; if (!name) continue;
      if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
      var i = document.createElement("i"); i.className = "pi"; i.setAttribute("aria-hidden", "true");
      i.setAttribute("data-k", name); i.style.setProperty("--pm", "var(--i-" + name + ")"); i.textContent = m[0];
      frag.appendChild(i); last = m.index + m[0].length; any = true;
    }
    if (!any) return;
    if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
    t.parentNode.replaceChild(frag, t);
  }
  function scan(root) {
    if (!root) return;
    if (root.nodeType === 3) { wrap(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1 && (SKIP[root.nodeName] || (root.classList && root.classList.contains("pi")))) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), list = [], n;
    while ((n = w.nextNode())) list.push(n);
    for (var k = 0; k < list.length; k++) wrap(list[k]);
    if (root.querySelectorAll) {
      var at = root.querySelectorAll("[placeholder],[title]");
      for (var j = 0; j < at.length; j++) {
        ["placeholder", "title"].forEach(function (a) { var v = at[j].getAttribute(a); if (v && RX.test(v)) { RX.lastIndex = 0; at[j].setAttribute(a, v.replace(RX, "").replace(/\s{2,}/g, " ").trim()); } RX.lastIndex = 0; });
      }
    }
  }
  var busy = false;
  var mo = new MutationObserver(function (list) {
    if (busy) return; busy = true;
    try {
      for (var i = 0; i < list.length; i++) {
        var r = list[i];
        if (r.type === "characterData") scan(r.target);
        else for (var j = 0; j < r.addedNodes.length; j++) scan(r.addedNodes[j]);
      }
    } finally { busy = false; }
  });
  function start() { scan(document.body); mo.observe(document.body, { childList: true, subtree: true, characterData: true }); if (document.title) document.title = document.title.replace(RX, "").trim(); RX.lastIndex = 0; }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
  window.PaceIcons = { scan: scan, map: MAP };
})();
