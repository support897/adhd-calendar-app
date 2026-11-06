// Build 48: Skip-led Talk panel, icons picked from the words, one-tap time chips, switches. Offline, no AI.
import { boot, check, summary } from "./pace-harness.mjs";
const h = await boot(8993, { viewport: { width: 390, height: 844 } }); const { page } = h;
const tab = async (n) => { await page.locator('#bottomTabs [data-tab="' + n + '"]').click(); await page.waitForTimeout(250); };
await tab("capture");
const bub = async () => (await page.locator("#skipTalk .st-bubble").innerText()).trim();
check("V1 Skip greets you with 'one step at a time' and a drawn mascot", /One step at a time/.test(await bub()) && (await page.locator("#skipTalk svg.skip-svg").count()) === 1);
check("V2 the page is named after Skip", /Talk to Skip/.test(await page.locator("#panel-capture h2").innerText()));
check("V3 three little steps are shown: Tell me, Check, Add", (await page.locator("#skipTalk .st-step").count()) === 3 && (await page.locator("#skipTalk .st-step.is-on").innerText()).includes("Tell me"));
await page.fill("#dumpText", "gym at 7am, team meeting at 10am for 1h, buy milk, I want to launch my podcast");
check("V4 while you type, Skip says he is listening", /listening/i.test(await bub()));
await page.click("#parseBtn"); await page.waitForTimeout(500);
check("V5 after sorting, Skip says YOU choose and the step moves to Check", /You choose/.test(await bub()) && (await page.locator("#skipTalk .st-step.is-on").innerText()).includes("Check"));
const icons = await page.locator("#paceReview .pr-card .pr-ico").allInnerTexts();
check("V6 every review card has an icon read from its words", icons.length >= 4 && icons.every(t => t.trim() && t.trim() !== "\u2795"));
check("V7 the podcast goal gets a microphone", icons.some(t => t.includes("\ud83c\udf99")));
const first = await page.locator("#paceReview .pr-card:has(.pr-title[value='Buy milk']) .pr-ico").first().innerText().catch(() => "");
if (first) { await page.locator("#paceReview .pr-card:has(.pr-title[value='Buy milk']) .pr-ico").first().click(); }
await page.click("#prAdd"); await page.waitForTimeout(600);
check("V8 after adding, Skip celebrates and says one step done", /one step/i.test(await bub()) && (await page.locator("#skipTalk .st-step.is-on").innerText()).includes("Add"));
const st = await h.store();

check("V9 created tasks keep their icon", st.tasks.filter(t => t.source === "capture").length >= 1 && st.tasks.filter(t => t.source === "capture").every(t => t.icon));
check("V10 the created goal keeps its icon", (st.goals || []).some(g => g.icon === "\ud83c\udf99\ufe0f"));
/* settings: time chips + switches */
await page.evaluate(() => window.PaceCtx.showPanel("settings")); await page.waitForTimeout(300);
await page.locator("#wakeTime").scrollIntoViewIfNeeded();
await page.locator('.time-chips button[data-t="06:30"]').first().click();
check("V11 one tap on '6:30am' sets the wake-up time", (await page.inputValue("#wakeTime")) === "06:30" && (await page.locator('.time-chips button[data-t="06:30"].is-on').count()) >= 1);
check("V12 the tapped time shows a tick, not only a colour", await page.locator('.time-chips button[data-t="06:30"].is-on').first().evaluate(e => /--i-check|mask/.test(getComputedStyle(e, "::before").maskImage + getComputedStyle(e, "::before").webkitMaskImage) || getComputedStyle(e, "::before").maskImage !== "none"));
const sw = await page.locator("#nCheckin").boundingBox();
check("V13 tick boxes in settings are big switches (52 x 32)", sw && sw.width >= 50 && sw.height >= 30);
await page.locator("#nCheckin").scrollIntoViewIfNeeded(); const was = await page.locator("#nCheckin").isChecked(); await page.locator("#nCheckin").click({ force: true });
check("V14 a switch still toggles", (await page.locator("#nCheckin").isChecked()) !== was);
check("V15 every settings group has a picture (icon) in its title", await page.evaluate(() => ["setLook", "setCheckin", "setNotif", "setTasks", "setHelp"].every(id => (getComputedStyle(document.querySelector("#" + id + " > h3"), "::before").maskImage || "none") !== "none")));
/* goals: icon picker */
await tab("goals"); await page.locator("#goalsRoot button:has-text('New goal')").first().click(); await page.waitForTimeout(250);
await page.fill("#goalTitle", "Run a marathon"); await page.click(".goal-form .pstep-next"); await page.waitForTimeout(150); await page.click(".goal-form .pstep-next"); await page.waitForTimeout(150);
const gi = await page.locator(".gf-icons .gf-ico:not(.gf-ico-more)").allInnerTexts();
check("V16 the goal form offers icons that fit the words (running shoes for a marathon)", gi.length >= 2 && gi[0].includes("\ud83c\udfc3"));
await page.locator(".gf-ico-more").click(); check("V17 'More' shows the whole icon set", (await page.locator(".gf-icons .gf-ico:not(.gf-ico-more)").count()) >= 30);
/* 320px */
await page.setViewportSize({ width: 320, height: 640 }); await tab("capture"); await page.waitForTimeout(200);
check("V18 Skip's page fits at 320px with no sideways scroll", await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
const tiny = await page.evaluate(() => [...document.querySelectorAll("#panel-capture .capture-actions .soft-btn, #panel-capture .primary-btn")].filter(e => e.offsetParent && e.getBoundingClientRect().height < 44).length);
check("V19 Skip's big buttons are at least 44px tall", tiny === 0);
check("V20 zero JS errors", h.errors.length === 0); if (h.errors.length) console.log(h.errors.slice(0, 5));
await h.close(); process.exit(summary() ? 1 : 0);
