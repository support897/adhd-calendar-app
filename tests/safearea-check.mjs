// Safe-area battery (18 Oct, Ilse's phone report on build 3): the packaged
// app draws full-bleed under the status bar, and the fixed boat menu
// button at top:14px sat half under the clock — untappable, menu
// unreachable. The fix routes the top/bottom edges through
// env(safe-area-inset-*) vars. Headless Chromium reports a 0 inset, so
// the render legs drive the SAME var the device fills via env() and
// measure the button's real position both ways.
import pw from "/home/hatch/node_modules/playwright-core/index.mjs";
const { chromium } = pw;
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
const ROOT = "/home/hatch/workspace/adhd-calendar-app";
let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS", n); } else { fail++; console.log("FAIL", n); } };

const css = readFileSync(ROOT + "/styles.css", "utf8");
const html = readFileSync(ROOT + "/index.html", "utf8");
check("css: --sat/--sab defined from env(safe-area-inset-*)", /--sat:\s*env\(safe-area-inset-top/.test(css) && /--sab:\s*env\(safe-area-inset-bottom/.test(css));
check("css: the menu button's top adds the inset", /\.expand-btn\s*\{[^}]*top:\s*calc\(14px \+ var\(--sat\)\)/.test(css));
check("css: the phone-width override also adds the inset (a bare top:10px stood here and won at phone widths — the battery's first run caught it)", /\.expand-btn\s*\{\s*top:\s*calc\(10px \+ var\(--sat\)\)/.test(css));
check("css: #main top padding adds the inset", /#main\s*\{[^}]*padding:\s*calc\(26px \+ var\(--sat\)\)/.test(css));
check("css: the sidebar's top padding adds the inset", /#sidebar\s*\{[^}]*padding:\s*calc\(22px \+ var\(--sat\)\)/.test(css));
check("css: the phone-width sidebar override adds the inset too (Quality's finding — a bare 18px won the cascade there)", /#sidebar\s*\{\s*width:\s*min\(84vw, 340px\);\s*padding:\s*calc\(18px \+ var\(--sat\)\)/.test(css));
check("css: the phone-width #main override adds the inset too (the same trap, third instance)", /#main\s*\{\s*padding:\s*calc\(16px \+ var\(--sat\)\)\s*16px/.test(css));
check("css: the sticky ticker pins below the inset, not at the viewport top", /#ticker\s*\{[^}]*position:\s*sticky;\s*top:\s*var\(--sat\)/.test(css));
check("html: viewport-fit=cover set (so env() is live on device)", /viewport-fit=cover/.test(html));

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".ttf": "font/ttf", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => { let f = req.url.split("?")[0]; if (f === "/") f = "/index.html"; const fp = path.join(ROOT, f); if (!existsSync(fp)) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": types[path.extname(fp)] || "application/octet-stream" }); res.end(readFileSync(fp)); });
await new Promise(r => server.listen(8949, r));
const b = await chromium.launch({ executablePath: "/home/hatch/.cache/ms-playwright/chromium-1187/chrome-linux/chrome", args: ["--no-sandbox"] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto("http://localhost:8949/", { waitUntil: "networkidle" });
await p.evaluate(() => {
  const st = { tasks: [], feelings: {}, settings: { appearance: { theme: "white", cute: false }, guideDone: true, sidebarCollapsed: true, notif: { digestTimes: ["12:30"] } }, welcomed: true, sent: {}, todos: [], habits: [], imports: [] };
  localStorage.setItem("calmcal-v1:guest", JSON.stringify(st));
});
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(500);
const top0 = await p.locator("#sbExpand").evaluate((el) => el.getBoundingClientRect().top);
check("render: at phone width with a 0 inset the button sits at its 10px home (got " + top0 + ")", Math.abs(top0 - 10) < 1.5);
await p.evaluate(() => document.documentElement.style.setProperty("--sat", "47px"));
await p.waitForTimeout(120);
const r = await p.locator("#sbExpand").evaluate((el) => { const b = el.getBoundingClientRect(); return { top: b.top, bottom: b.bottom }; });
check("render: with a 47px inset (a notched phone) the button sits fully below it — top " + r.top + ", bottom " + r.bottom, Math.abs(r.top - 57) < 1.5 && r.top >= 47);
// The OPEN state (Quality's finding): a fresh page with the menu open
// from load, inset driven — the drawer's brand head must clear it too.
const p2 = await b.newPage({ viewport: { width: 390, height: 844 } });
await p2.goto("http://localhost:8949/", { waitUntil: "networkidle" });
await p2.evaluate(() => {
  const st = { tasks: [], feelings: {}, settings: { appearance: { theme: "white", cute: false }, guideDone: true, sidebarCollapsed: false, notif: { digestTimes: ["12:30"] } }, welcomed: true, sent: {}, todos: [], habits: [], imports: [] };
  localStorage.setItem("calmcal-v1:guest", JSON.stringify(st));
});
await p2.reload({ waitUntil: "networkidle" });
await p2.waitForTimeout(500);
// The menu is hidden on every load by law — open it the user's way,
// by tapping the boat button, with the inset already driven.
await p2.evaluate(() => document.documentElement.style.setProperty("--sat", "47px"));
await p2.click("#sbExpand");
await p2.waitForTimeout(400);
const headTop = await p2.locator("#sidebar .brand").evaluate((el) => el.getBoundingClientRect().top);
check("render: drawer OPEN at 47px inset — the brand head clears the bar (top " + headTop + ", want 65 = 18 + 47)", Math.abs(headTop - 65) < 2 && headTop >= 47);
// The SCROLL state (the ticker ruling): scroll until the sticky ticker
// pins; it must pin below the inset, not under the clock.
await p.evaluate(() => window.scrollTo(0, 900));
await p.waitForTimeout(200);
const tick = await p.locator("#ticker").evaluate((el) => { const b = el.getBoundingClientRect(); return { top: b.top, h: b.height }; }).catch(() => null);
check("render: scrolled — the ticker pins at the inset (top " + (tick && tick.top) + ", want ~47)", !!tick && Math.abs(tick.top - 47) < 2);
// PACE-005: at phone width all five views sit inside the switcher pill
// (Agenda used to hide off the right edge of a sideways scroll).
const seg = await p.locator(".segmented").evaluate((el) => { const box = el.getBoundingClientRect(); const btns = [...el.querySelectorAll("button")]; return { overflow: el.scrollWidth - el.clientWidth, allIn: btns.every((b2) => { const r = b2.getBoundingClientRect(); return r.left >= box.left - 1 && r.right <= box.right + 1; }), n: btns.length }; });
check("render: PACE-005 — phone view switcher shows all five views, nothing off the edge", seg.overflow === 0 && seg.allIn && seg.n === 5);
await b.close(); server.close();
console.log("RESULT pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
