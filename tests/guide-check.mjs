// Structure checks for the first-run setup and replayable app tour.
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = readFileSync(path.join(root, "app.js"), "utf8");
const html = readFileSync(path.join(root, "index.html"), "utf8");
const css = readFileSync(path.join(root, "styles.css"), "utf8");
const es = readFileSync(path.join(root, "i18n.js"), "utf8");
let pass = 0, fail = 0;
function check(name, condition) { try { assert.ok(condition); console.log("PASS " + name); pass++; } catch (e) { console.log("FAIL " + name); fail++; } }
check("first-run guide asks about today's energy", app.includes('action: "energy"') && app.includes("state.feelings[L.todayKey()]"));
check("first-task action opens the task form and resumes the tour after save", app.includes('guideResumeAfterTask = guideStep + 1') && app.includes('showGuide(nextGuideStep)'));
check("canceling first-task entry returns to the same guide step", app.includes('guideResumeAfterTask = null; showGuide(guideStep)'));
check("calendar import and optional reminder setup are separate guide stops", app.includes('kind: "import"') && app.includes('kind: "reminders"') && html.includes('id="guideImport"'));
for (const panel of ["today", "calendar", "capture", "todo", "more", "progress", "habits", "settings"]) check("tour includes " + panel, app.includes('panel: "' + panel + '"'));
check("skip and close finish the guide; Settings can replay it", /function closeGuide\(\)[\s\S]*guideDone = true/.test(app) && html.includes('id="guideAgain"') && app.includes('showGuide(0)'));
check("the onboarding theme targets are at least 44px", /\.g-swatch \{[^}]*width: 44px;[^}]*height: 44px;/.test(css));
check("new guide wording has Spanish translations", ["Your calendar starts empty. Add only what you choose.", "Add your first task when you're ready.", "Today is for the day in front of you.", "Settings is where reminders and this guide live."].every(k => es.includes('"' + k + '"')));
console.log("RESULT pass=" + pass + " fail=" + fail);
if (fail) process.exitCode = 1;
