/* PaceSteps: turn a long form into small steps, one question at a time,
   with progress dots, Back and Next. Same look as the Add-task sheet. */
(function () {
  "use strict";
  var tr = window.t || function (s) { return s; };
  function el(tag, cls, text, attrs) {
    var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text;
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  /* groups: [{ h: "Heading", nodes: [DOM...], check: fn()->message, skippable: bool }]
     opts:   { actions: DOM (shown on the last step), err: DOM (error line), onStep: fn(i) } */
  function make(form, groups, opts) {
    opts = opts || {};
    var holder = el("div", "pstep-wrap");
    var dots = el("div", "aw-dots pstep-dots", null, { "aria-hidden": "true" });
    var steps = [], cur = 0;
    var live = el("p", "pstep-count hint", "", { role: "status", "aria-live": "polite" });
    groups.forEach(function (g, i) {
      dots.appendChild(el("i"));
      var sec = el("section", "pstep", null, { "data-pstep": String(i + 1) });
      if (g.h) sec.appendChild(el("h3", "pstep-h", g.h));
      if (g.sub) sec.appendChild(el("p", "pstep-sub hint", g.sub));
      g.nodes.forEach(function (n) { if (n) sec.appendChild(n); });
      steps.push(sec);
    });
    var nav = el("div", "pstep-nav");
    var back = el("button", "soft-btn pstep-back", tr("Back"), { type: "button" });
    var next = el("button", "primary-btn pstep-next", tr("Next"), { type: "button" });
    nav.appendChild(back); nav.appendChild(next);
    var finish = opts.actions || null; if (finish) finish.classList.add("pstep-finish");
    holder.appendChild(dots); holder.appendChild(live);
    steps.forEach(function (s) { holder.appendChild(s); });
    if (opts.err) holder.appendChild(opts.err);
    holder.appendChild(nav); if (finish) holder.appendChild(finish);
    form.appendChild(holder);
    function show(i) {
      cur = Math.max(0, Math.min(steps.length - 1, i));
      steps.forEach(function (s, k) { s.hidden = k !== cur; });
      [].forEach.call(dots.children, function (d, k) { d.classList.toggle("is-on", k <= cur); });
      var last = cur === steps.length - 1;
      back.hidden = cur === 0; next.hidden = last; if (finish) finish.hidden = !last;
      next.textContent = groups[cur].skippable && !groups[cur].filled ? tr("Skip") : tr("Next");
      live.textContent = tr("Step {a} of {b}", { a: cur + 1, b: steps.length });
      if (opts.err) opts.err.textContent = "";
      if (opts.onStep) opts.onStep(cur);
      var f = steps[cur].querySelector("input:not([type=hidden]):not([type=file]), textarea, select");
      if (f && !(window.matchMedia && matchMedia("(pointer:coarse)").matches && cur > 0)) { try { f.focus({ preventScroll: true }); } catch (e) { } }
    }
    function go(d) {
      if (d > 0 && groups[cur].check) { var m = groups[cur].check(); if (m) { if (opts.err) opts.err.textContent = m; return; } }
      show(cur + d);
    }
    next.addEventListener("click", function () { go(1); });
    back.addEventListener("click", function () { go(-1); });
    holder.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target && e.target.tagName === "INPUT" && e.target.type !== "date" && cur < steps.length - 1) { e.preventDefault(); go(1); }
    });
    show(0);
    return { show: show, go: go, next: next, back: back, steps: steps, current: function () { return cur; }, groups: groups, refresh: function () { show(cur); } };
  }
  window.PaceSteps = { make: make };
})();
