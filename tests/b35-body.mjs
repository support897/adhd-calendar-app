
/* ===== build 35 phase A: settings with email, jump chips, Skip's settings tour ===== */
const SH = process.env.SHOTS || "/Users/ilse/Apps/_qa/shots"; fs.mkdirSync(SH, { recursive: true });
const mkPhone = async (email) => {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await c.newPage();
  await p.addInitScript((s) => { localStorage.setItem("pace-auth-v1", JSON.stringify(s)); }, await mkSess(email));
  p.errs = []; p.on("pageerror", e => p.errs.push(e.message));
  await p.goto("http://localhost:8919/", { waitUntil: "networkidle" });
  await p.click("#welcomeSkip").catch(() => {});
  await p.locator("#guideSkip").click({ timeout: 900 }).catch(() => {});
  return p;
};
const openSettings = async (p) => { await p.evaluate(() => document.querySelector('.side-item[data-panel="settings"]').click()); await p.waitForTimeout(400); };
const m = await mkPhone("set35@test.dev");
await openSettings(m);
check("settings shows my email at the top", (await m.locator("#pcEmail").textContent()) === "set35@test.dev");
check("settings avatar is my first letter", (await m.locator("#pcAvatar").textContent()) === "S");
check("settings says everything is free", /Free/.test(await m.locator(".pc-badge").textContent()));
check("Skip the mascot is in settings", (await m.locator("#pcSkip svg").count()) >= 1);
await m.screenshot({ path: SH + "/settings-390.png" });
const y0 = await m.evaluate(() => window.scrollY + (document.querySelector("#main")||{}).scrollTop);
await m.click('[data-jump="setNotif"]'); await m.waitForTimeout(900);
const topN = await m.evaluate(() => document.getElementById("setNotif").getBoundingClientRect().top);
check("the Reminders chip scrolls to reminders (top " + Math.round(topN) + ")", topN < 300);
await m.screenshot({ path: SH + "/settings-jump-390.png" });
await m.click("#settingsTour"); await m.waitForTimeout(500);
check("the settings tour opens with Skip", await m.locator("#guideSheet").isVisible() && (await m.locator("#guideArt svg").count()) >= 1);
const seen = [];
for (let i = 0; i < 9; i++) {
  const t = await m.evaluate(() => { const e = document.querySelector("#panel-settings .guide-target"); return e ? e.id : ""; });
  if (t) seen.push(t);
  if (i === 2) await m.screenshot({ path: SH + "/settings-tour-390.png" });
  const label = await m.locator("#guideNext").textContent();
  await m.click("#guideNext"); await m.waitForTimeout(350);
  if (/Done/.test(label)) break;
}
check("the tour visits every settings section (" + seen.join(",") + ")", ["profileCard","accountGroup","setLook","setCheckin","setNotif","setTasks","setHelp"].every(x => seen.includes(x)));
check("the tour closes at the end", await m.locator("#guideSheet").isHidden());
check("settings: no page errors", m.errs.length === 0 || (console.log(m.errs), false));

check("no page errors (desktop)", errors.length === 0 || (console.log(errors), false));
console.log("RESULT pass=" + pass + " fail=" + fail);
await browser.close(); mock.close && mock.close(); server.close();
process.exit(fail ? 1 : 0);
