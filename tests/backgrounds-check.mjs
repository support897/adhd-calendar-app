// Pace LAW E battery (v14): every user can choose their background —
// WHITE · BLACK · BRAND COLOURS · UPLOAD OWN IMAGE — with contrast
// adapting automatically (AA floor, veil over photos). The uploaded
// photo is user data (Law B): switching looks never deletes it, and
// Remove carries Undo (Law B2). AA is proven at the worst case: the
// veil composited over pure-black and pure-white photo pixels, ink
// from the live CSS, contrast formula — not eyeballed.
import { chromium } from "playwright-core";
import { writeFileSync } from "fs";
const URL = "http://localhost:9119/";
let pass = 0, fail = 0;
const check = (n, ok) => { console.log((ok ? "PASS " : "FAIL ") + n); ok ? pass++ : fail++; };
const b = await chromium.launch({ executablePath: process.env.CHROME_EXE, args: ["--no-sandbox"] });
// Two busy test photos (deterministic noise), one dark, one bright.
{
  const p = await b.newPage();
  const mkImg = (base) => p.evaluate((base) => {
    const cv = document.createElement("canvas"); cv.width = 480; cv.height = 320;
    const cx = cv.getContext("2d");
    for (let y = 0; y < 32; y++) for (let x = 0; x < 48; x++) {
      const v = base + ((x * 7 + y * 13) % 40);
      cx.fillStyle = "rgb(" + v + "," + (v + 9) + "," + (v + 18) + ")"; cx.fillRect(x * 10, y * 10, 10, 10);
    }
    return cv.toDataURL("image/png").split(",")[1];
  }, base);
  writeFileSync("/tmp/bg-dark.png", Buffer.from(await mkImg(18), "base64"));
  writeFileSync("/tmp/bg-bright.png", Buffer.from(await mkImg(205), "base64"));
  await p.close();
}
const seed = { settings: { guideDone: true }, welcomed: true, samplesLoaded: true, tasks: [], todos: [], habits: [], feelings: {}, checks: {}, habitLog: {}, imports: [] };
async function fresh() {
  const p = await b.newPage();
  await p.addInitScript((s) => { if (!localStorage.getItem("calmcal-v1")) localStorage.setItem("calmcal-v1", JSON.stringify(s)); }, seed);
  await p.goto(URL, { waitUntil: "networkidle" }); await p.waitForTimeout(450);
  return p;
}
const theme = (p) => p.evaluate(() => document.documentElement.getAttribute("data-theme"));
const stored = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("calmcal-v1:guest") || localStorage.getItem("calmcal-v1")).settings.appearance);
// 1. BLACK + BRAND choices.
{
  const p = await fresh();
  await p.evaluate(() => document.querySelector('[data-panel="settings"]').click()); await p.waitForTimeout(300);
  await p.click('.swatch[data-theme-set="blush"]'); await p.waitForTimeout(200);
  check("Blush choice applies", (await theme(p)) === "blush");
  await p.click('.swatch[data-theme-set="brand"]'); await p.waitForTimeout(200);
  check("Brand choice applies the brand look", (await theme(p)) === "brand");
  // The app fades between looks (0.25s transition) — wait for the
  // ground colour to settle instead of racing the fade.
  await p.waitForFunction(() => getComputedStyle(document.body).backgroundColor === "rgb(220, 225, 246)", null, { timeout: 3000 }).catch(() => {});
  const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check("Brand ground is the Still Water wash", bg === "rgb(220, 225, 246)");
  await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(400);
  check("Brand choice persists across reload", (await theme(p)) === "brand");
  await p.close();
}
// 2. Upload a DARK busy photo: dark mode, veil, persistence.
let darkPage;
{
  const p = await fresh(); darkPage = p;
  await p.evaluate(() => document.querySelector('[data-panel="settings"]').click()); await p.waitForTimeout(300);
  await p.setInputFiles("#bgPhotoFile", "/tmp/bg-dark.png"); await p.waitForTimeout(700);
  check("dark photo now uses the light ink set (no black look)", (await p.evaluate(() => document.documentElement.getAttribute("data-photo"))) === "light" && (await theme(p)) === "photolight");
  check("the photo is stored as user data", ((await stored(p)).photo || "").indexOf("data:image/") === 0 && (await stored(p)).bgChoice === "photo");
  await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(400);
  check("photo background survives reload", (await p.evaluate(() => document.documentElement.getAttribute("data-photo"))) === "light");
}
// 3. AA at the worst case, from the live CSS values.
{
  const p = darkPage;
  const vals = await p.evaluate(() => {
    const cs = getComputedStyle(document.body, "::after");
    const ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim();
    return { veil: cs.backgroundColor, ink };
  });
  const lum = (r, g, bl) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl); };
  const parse = (s) => s.match(/[\d.]+/g).map(Number);
  const [vr, vg, vb, va] = parse(vals.veil);
  const inkRgb = vals.ink.startsWith("#") ? [parseInt(vals.ink.slice(1, 3), 16), parseInt(vals.ink.slice(3, 5), 16), parseInt(vals.ink.slice(5, 7), 16)] : parse(vals.ink);
  const inkL = lum(inkRgb[0], inkRgb[1], inkRgb[2]);
  const worst = [0, 255].map((px) => {
    const cl = lum(vr * va + px * (1 - va), vg * va + px * (1 - va), vb * va + px * (1 - va));
    const hi = Math.max(cl, inkL), lo = Math.min(cl, inkL);
    return (hi + 0.05) / (lo + 0.05);
  });
  check("dark-photo mode: ink holds AA over the worst photo pixels (" + worst.map((x) => x.toFixed(2)).join(", ") + ")", Math.min(...worst) >= 4.5);
  // ALL ink levels, both modes — the title ink passing is not the
  // floor; the faintest hint ink is (App Checker B3, v14: ink-3 over
  // a dark patch measured 3.42 before the photolight deepening).
  for (const mode of ["dark", "light"]) {
    const vs = await p.evaluate((m) => {
      const root = document.documentElement;
      const keep = { t: root.getAttribute("data-theme"), ph: root.getAttribute("data-photo") };
      root.setAttribute("data-photo", m); root.setAttribute("data-theme", m === "dark" ? "photodark" : "photolight");
      const out = { veil: getComputedStyle(document.body, "::after").backgroundColor,
        ink: getComputedStyle(root).getPropertyValue("--ink").trim(),
        ink2: getComputedStyle(root).getPropertyValue("--ink-2").trim(),
        ink3: getComputedStyle(root).getPropertyValue("--ink-3").trim() };
      root.setAttribute("data-theme", keep.t); if (keep.ph) root.setAttribute("data-photo", keep.ph); else root.removeAttribute("data-photo");
      return out;
    }, mode);
    const [vr, vg, vb, va] = parse(vs.veil);
    for (const [name, hex] of [["ink", vs.ink], ["ink-2", vs.ink2], ["ink-3", vs.ink3]]) {
      const c = hex.startsWith("#") ? [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)] : parse(hex);
      const il = lum(c[0], c[1], c[2]);
      const w = [0, 255].map((px) => { const cl = lum(vr * va + px * (1 - va), vg * va + px * (1 - va), vb * va + px * (1 - va)); return (Math.max(cl, il) + 0.05) / (Math.min(cl, il) + 0.05); });
      check("photo-" + mode + " " + name + " holds AA at the worst patch (" + w.map((x) => x.toFixed(2)).join(", ") + ")", Math.min(...w) >= 4.5);
    }
  }
}
// 4. A BRIGHT photo picks the light ink set + AA bound; switching to
//    White never deletes the photo (Law B); Your-photo re-applies.
{
  const p = await fresh();
  await p.evaluate(() => document.querySelector('[data-panel="settings"]').click()); await p.waitForTimeout(300);
  await p.setInputFiles("#bgPhotoFile", "/tmp/bg-bright.png"); await p.waitForTimeout(700);
  check("bright photo picks the light ink set", (await p.evaluate(() => document.documentElement.getAttribute("data-photo"))) === "light" && (await theme(p)) === "photolight");
  const vals = await p.evaluate(() => ({ veil: getComputedStyle(document.body, "::after").backgroundColor, ink: getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() }));
  const lum = (r, g, bl) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl); };
  const parse = (s) => s.match(/[\d.]+/g).map(Number);
  const [vr, vg, vb, va] = parse(vals.veil);
  const inkL = lum(parseInt(vals.ink.slice(1, 3), 16), parseInt(vals.ink.slice(3, 5), 16), parseInt(vals.ink.slice(5, 7), 16));
  const worst = [0, 255].map((px) => { const cl = lum(vr * va + px * (1 - va), vg * va + px * (1 - va), vb * va + px * (1 - va)); return (Math.max(cl, inkL) + 0.05) / (Math.min(cl, inkL) + 0.05); });
  check("light-photo mode: ink holds AA over the worst photo pixels (" + worst.map((x) => x.toFixed(2)).join(", ") + ")", Math.min(...worst) >= 4.5);
  await p.click('.swatch[data-theme-set="white"]'); await p.waitForTimeout(200);
  check("switching to White keeps the photo stored (Law B)", !!(await stored(p)).photo && (await stored(p)).bgChoice === "theme");
  await p.click("#photoApply"); await p.waitForTimeout(200);
  check("Your photo chip re-applies the photo", (await stored(p)).bgChoice === "photo");
  // 5. Remove carries Undo (Law B2).
  await p.click("#photoRemove"); await p.waitForTimeout(200);
  check("Remove clears the photo", !(await stored(p)).photo);
  await p.click(".toast-undo"); await p.waitForTimeout(200);
  check("Undo restores the photo and its mode", !!(await stored(p)).photo && (await stored(p)).bgChoice === "photo");
  await p.close();
}
await b.close();
console.log("RESULT pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
