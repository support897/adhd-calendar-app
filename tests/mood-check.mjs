// Pace MOOD LOOP proof (Ilse's order, 14 Oct 2026): the three answers
// Good / Ok / Bad must visibly CHANGE the day — Bad shrinks tasks to
// their smallest versions and parks the rest, Ok is the normal capped
// day, Good offers the stretch versions. Proven on the rendered list
// and the saved state, not asserted from the logic alone.
import { chromium } from "playwright-core";
const URL = "http://localhost:9119/";
let pass = 0, fail = 0;
const check = (n, ok) => { console.log((ok ? "PASS " : "FAIL ") + n); ok ? pass++ : fail++; };
const today = new Date(); // LOCAL date, the way the app computes todayKey —
// toISOString() is UTC and seeds yesterday's tasks once local time passes
// midnight (caught 15 Oct: Sydney AEDT crossed over while the suite ran).
const K = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
const mk = (id, title, extra) => Object.assign({ id, title, date: K, time: "09:00", durationMin: 40, priority: 1, repeat: null,
  category: "home", color: "#35704e", essential: false, status: "todo", steps: [], minVersion: "", fullVersion: "",
  source: "seed", originalText: "", skipDates: [], doneDates: [] }, extra);
const seed = { settings: { guide: "done", onboarded: true, names: { low: "Bad", steady: "Ok", full: "Good" } }, welcomed: true, samplesLoaded: true,
  tasks: [ mk("a", "Write the report", { minVersion: "Just open the doc", fullVersion: "Report + plan next week" }),
           mk("b", "Clean the garage", { time: "11:00" }),
           mk("c", "School pickup", { time: "15:30", essential: true }) ],
  todos: [], habits: [], feelings: {}, checks: {}, habitLog: {}, imports: [], samplesLoaded: false };
const b = await chromium.launch({ executablePath: process.env.CHROME_EXE, args: ["--no-sandbox"] });
const p = await b.newPage();
await p.addInitScript((s) => { if (!localStorage.getItem("calmcal-v1:guest")) localStorage.setItem("calmcal-v1:guest", JSON.stringify(s)); }, seed);
await p.goto(URL, { waitUntil: "networkidle" }); await p.waitForTimeout(500);
await p.locator("#welcome .primary-btn").click({ timeout: 800 }).catch(() => {});
for (let i = 0; i < 9; i++) { const g = await p.locator("#guideSheet:not([hidden])").count(); if (!g) break;
  await p.locator("#guideSkip").click({ timeout: 400 }).catch(() => {});
  await p.locator("#guideNext").click({ timeout: 400 }).catch(() => {}); await p.waitForTimeout(180); }
await p.locator("#impClose").click({ timeout: 500 }).catch(() => {});
const titles = () => p.$$eval(".task-row .tr-title", els => els.map(e => e.textContent));
const feelings = () => p.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1:guest")).feelings);

// Baseline: no answer yet — the plain day.
check("the ask is her words with her three answers", (await p.textContent("#checkinQ")) === "How are you feeling today?"
  && (await p.textContent('[data-level="low"]')) .includes("Bad") && (await p.textContent('[data-level="full"]')).includes("Great"));
check("baseline day lists all three tasks plainly", JSON.stringify(await titles()) === JSON.stringify(["School pickup", "Write the report", "Clean the garage"]) || (await titles()).length === 3);

// BAD: shrink + park.
await p.click('[data-level="low"]'); await p.waitForTimeout(400);
const badTitles = await titles();
check("Bad: the report shrinks to its smallest version", badTitles.some(t => t.includes("Just open the doc")));
check("Bad: the garage is parked, not listed", !badTitles.some(t => t.includes("garage")));
check("Bad: the essential pickup stays", badTitles.some(t => t.includes("School pickup")));
check("Bad: a parked note says the rest is safe", /parked/.test(await p.textContent(".day-list")));
check("Bad: the answer is saved", (await feelings())[K] === "low");

// OK: the normal day returns.
await p.click('[data-level="steady"]'); await p.waitForTimeout(400);
const okTitles = await titles();
check("Ok: full titles return, nothing parked", okTitles.some(t => t.includes("Write the report")) && okTitles.some(t => t.includes("Clean the garage")) && !okTitles.some(t => t.includes("Just open the doc")));
check("Ok: the answer is saved", (await feelings())[K] === "steady");

// GOOD: stretch versions offered.
await p.click('[data-level="full"]'); await p.waitForTimeout(400);
const goodTitles = await titles();
check("Good: the report stretches to its bigger version", goodTitles.some(t => t.includes("Report + plan next week")));
check("Good: everything is on the table", goodTitles.some(t => t.includes("Clean the garage")));
check("Good: the answer is saved", (await feelings())[K] === "full");

// The answer survives a reload (it shapes the day, not just the tap).
await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(500);
check("Good survives reload: stretch still offered", (await titles()).some(t => t.includes("Report + plan next week")));
check("Good survives reload: the Good button is the active one", await p.$eval('[data-level="full"]', el => el.classList.contains("is-active")));
await b.close();
console.log("RESULT pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
