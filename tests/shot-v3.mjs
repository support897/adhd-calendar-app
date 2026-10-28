// Proof screenshots for the v3 panels (seeded with realistic use, then shot).
import { chromium } from "playwright-core";
import http from "http"; import fs from "fs"; import path from "path";
const ROOT = "/Users/ilse/Apps/adhd-calendar-app";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html"; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res); });
await new Promise(r => server.listen(8920, r));
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
await page.goto("http://localhost:8920/", { waitUntil: "networkidle" });
await page.click("#welcomeSkip");
// Seed a lived-in To do + Habits state through the app's own storage shape.
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("calmcal-v1"));
  const today = new Date(), key = d => d.toISOString().slice(0, 10), off = n => { const d = new Date(today); d.setDate(d.getDate() - n); return key(d); };
  s.todos = [
    { id: "t1", text: "Book the car service", done: false, calTaskId: null },
    { id: "t2", text: "Water the ferns", done: false, calTaskId: null },
    { id: "t3", text: "Reply to Sam's email", done: true, calTaskId: null }
  ];
  s.habits = [
    { id: "h1", name: "Drink water", icon: "drop", days: { [off(2)]: true, [off(1)]: true, [off(0)]: true } },
    { id: "h2", name: "Read before bed", icon: "book", days: { [off(1)]: true } },
    { id: "h3", name: "Morning stretch", icon: "sun", days: {} }
  ];
  localStorage.setItem("calmcal-v1", JSON.stringify(s));
});
await page.reload({ waitUntil: "networkidle" });
await page.click('.side-item[data-panel="todo"]');
await page.waitForTimeout(400);
await page.screenshot({ path: ROOT + "/proofs/v3-todo.png" });
await page.click('.side-item[data-panel="habits"]');
await page.waitForTimeout(400);
await page.screenshot({ path: ROOT + "/proofs/v3-habits.png" });
console.log("SHOTS DONE");
await browser.close(); server.close();
