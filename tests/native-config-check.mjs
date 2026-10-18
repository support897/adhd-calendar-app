// Pace — native door config pin. THE BUILD-6 LESSON (18 Oct 2026):
// @capacitor-firebase/authentication creates its Google/Apple
// handlers ONLY for providers named in the FirebaseAuthentication
// config's "providers" list — the default is EMPTY, and without the
// list every door tap rejects "provider is not enabled" behind the
// friendly line (proven live at Ilse's sitting on Caresitters 6;
// Pace 6 shipped the same bare {skipNativeAuth: true}). Config
// presence reads (plist · scheme · entitlement · plugin aboard)
// all passed while the doors were dead. This battery pins the
// config itself: both lists, both files, every run.
import { readFileSync, existsSync } from "node:fs";
let pass = 0, fail = 0;
const check = (name, ok) => { console.log((ok ? "PASS " : "FAIL ") + name); ok ? pass++ : fail++; };
const WANT = ["google.com", "apple.com"];
const read = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch (e) { return null; } };
for (const [label, path] of [
  ["store package config", "/home/hatch/workspace/pace-store/capacitor.config.json"],
  ["synced iOS app config", "/home/hatch/workspace/pace-store/ios/App/App/capacitor.config.json"],
]) {
  const cfg = read(path);
  const fa = cfg && cfg.plugins && cfg.plugins.FirebaseAuthentication;
  check(label + " exists with a FirebaseAuthentication block", !!fa);
  if (fa) {
    check(label + ": skipNativeAuth stays true", fa.skipNativeAuth === true);
    const prov = Array.isArray(fa.providers) ? [...fa.providers].sort() : [];
    check(label + ": providers = [" + WANT.join(", ") + "] (reads " + (fa.providers || "NOTHING — the build-6 fault") + ")", JSON.stringify(prov) === JSON.stringify([...WANT].sort()));
  }
}
const pluginSrcPath = "/home/hatch/workspace/pace-store/node_modules/@capacitor-firebase/authentication/ios/Plugin/FirebaseAuthentication.swift";
const src = existsSync(pluginSrcPath) ? readFileSync(pluginSrcPath, "utf8") : "";
check("the pin's premise still holds in the installed plugin (handlers gated on the providers list)", /config\.providers\.contains\(ProviderId\.google\)/.test(src) && /config\.providers\.contains\(ProviderId\.apple\)/.test(src));
console.log("RESULT pass=" + pass + " fail=" + fail);
process.exit(fail ? 1 : 0);
