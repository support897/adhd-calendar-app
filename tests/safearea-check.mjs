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
await b.close(); server.close();
console.log("RESULT pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
