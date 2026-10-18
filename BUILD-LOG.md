# BUILD LOG — Calm Calendar (ADHD Calendar App)

## pace-v15 — THE ACCOUNTS WAVE (15 Oct 2026, her "finish all of them asap")
Both hats built. USER APP: Firebase over plain REST (firebase.js,
no SDK — the design's shape), doors per her 15 Oct ruling —
Google · Apple · email+password, the design's email-LINK door
superseded and never built; guest mode untouched and forever.
Data: per-identity cache keys (calmcal-v1:guest / :<uid>, legacy
key migrated + left frozen as backup); users/{uid} carries the
contracts' light spine (createdAt/lastActiveAt/plan/activatedAt)
and the state document lives at users/{uid}/data/state as one
JSON string — ONE amendment to MULTIUSER-DESIGN §3, made so the
CEO's count window can never reach a state payload, recorded
here + told to HQ. The §5 guest-upload door (offered once,
explicit yes, pot consumed on success, frozen-backup untouched),
§6 export + account-deletion sweep (password re-checked, DSI
filed), PC-3 size note, activation stamps at the three confirmed
triggers, the entry-level string heal (QA's seed) with its pin.
Imports write an owner-countable tally (imports/{uid}) so the
CEO panel never needs state access. Apple door renders only
when configured (parked on the Developer credential — no dead
buttons); Google runs the GIS→REST route (web/PWA live; the
store WebView's native step is a named follow-up).
CEO APP (separate repo pace-ceo, own host): sign-in-only door,
_owner/config pin proven by probe, aggregates-only sections per
pattern v2 (Overview three questions + weekly series · People ·
Money with R7 reads, split cancels + reason lines · Reviews ·
Outreach · Community · Avatars §4 · Your app = import tallies).
PROOF (config seam against a rules-shaped mock; the live
test-twin battery is the gates' P4 leg): accounts-check 20/20
(door, consumption, isolation at UI + API + counts, activation,
round trip, heal, deletion) · ceo-check 15/15 (refusal, pin,
every aggregate exact, no identity anywhere in the room).
SW pace-v15. Live wire outstanding: Pace's own Firebase project
+ test twin (HQ console sitting) — the config files are seams
until then, and the build is inert-honest without them.

## v15 ADDENDUM (15 Oct, later the same day) — wires landed, rules v2.1, the sweep lesson
The Firebase pair landed via PB (prod pace-app-calendar, twin
pace-test-c00fa); configs installed; the Google client ID wired
(door live); the CEO repo created + pushed; Pages live at
support897.github.io/pace-ceo. SECURITY sent the v1 rules back
on three items — owner grants off user folders entirely
(aggregates re-pointed to owner-space shards aggSignups/
aggImports/aggSubs), plan OFF the spine under a hasOnly fence +
rule-guarded write-once, anonymous provider fenced by token
claim — plus a create-verb must-fix; the text of record is v2.1,
ACTIVE on both projects, Security-verified. The battery work
also caught a real product bug: guestPot counted the web seed's
factory SAMPLES as a pot (a second account could be offered the
demo set) — samples are excluded at the pot's definition now;
accounts battery 21/21 with the shard leg.
THE SWEEP LESSON (owned): my first v15 composite (286/286) was
assembled partly from interleaved background output I had not
clean-verified suite by suite — and hid two real harness faults:
nine pre-v15 suites read the frozen legacy key while the app
saves under the identity key, and my sweep loops called the
logic suite by a wrong file name (run-check vs run-tests), its
error invisible inside a grep pipe. Quality's amended SEND BACK
caught the cluster; cause proven (saves landed all along),
harness fixed, composite re-filed per-suite (289/289) and
Quality re-verified on THEIR OWN runs. Verdicts: Quality PASS
(restored) · Efficiency PASS · QA PASS (F1 retest on the hashed
bytes, blob 8f962551…). A claim is not a check — twice-burned,
written down.
LIVE LEGS (the seal's second leg, run the same day): the v2.1
text was published VERBATIM to both projects (comments intact;
Security's P4 text diff is against these bytes). The API-level
battery (tests/accounts-live-api.mjs) against the REAL twin:
26/26 — the fences refuse plan-shaped keys live, activatedAt is
write-once in the rules themselves, B is denied A's state/spine/
shards at the API, shards are write-only for their own users,
_owner/_comp unreadable by any client, the anonymous provider
mints no cloud space, and the §6 sweep deletes state, spine and
the Auth user in order. The fixture owner is pinned on the TWIN
only (_owner/config, uid reported to PB); the owner probe
answers counts (200) and a non-owner's count is denied (403).
Named behaviour: aggregate shards are APPEND-ONLY (deletion
removes the person, not the count — Security recommended
delete:false; the tension is filed with the seal report for
their ruling). The sandbox Chromium cannot tunnel the egress
proxy, so the browser journeys ride the managed browser against
a scratch twin host (support897/pace-twin, twin config) — the
CEO-room + user-journey legs complete the seal there.
THE TWIN JOURNEYS (the seal's last legs, all PASS): the CEO
room refused a non-owner with the exact words, opened for the
pinned fixture owner, and read the seeded aggregates exactly
(joined 3 · activated 3 · 41 events by 3 people · $0 money) with
no identity anywhere. The user journeys ran the full story —
guest event, account, bring-in, second account isolation,
round trip, deletion back to guest. THREE live-only catches,
each fixed, looped and re-verified on the twin: (1) the CEO
door card stacked above the room — .door/.room are display:
grid, which defeats [hidden] without the guard the user app
already carried; one CSS line. (2) MRR read a dash at zero —
a filtered SUM aggregation demands a composite index
Firestore does not auto-build; MRR now computes client-side
from the list the panel already fetches. (3) v15.1 — the
guest-pot door keyed on "no server state doc", but a fresh
account's own first sync writes its empty state doc DURING
the reconcile fetch, and on a real network the sync wins:
the door silently never fired (the mock always won the race).
The door now decides after adoption, by CONTENT — an account
with no real content of its own is offered the pot, an
account with real content never is. SW pace-v15-1. Batteries:
ceo-check 17/17 (computed-visibility + $0.00 legs added),
accounts-check 22/22 (TU-C: the race as a fixture). Quality
verified v15.1 at their own run; the twin re-verification
passed both parts end to end. (4) v15.2 — Security ruled
ERASURE TAKES THE SHARD: a uid-keyed row is the user's data
however light its fields. Rules v2.2 adds exactly one verb
(own-delete) on aggSignups + aggImports; the §6 sweep now
runs state → spine → shards → Auth user; the CEO count reads
"accounts on Pace now". Diff PASS at Security, twin republish,
live battery 29/29 with the sweep legs (cross-shard delete
still 403; own deletes 200; the deleted account leaves the
owner's count), production republish — v2.2 is the text of
record on both projects and the P4 seal completes on it.

Built 12 Oct 2026, fully autonomous on Ilse's order ("work fully autonomous and don't stop until app fully tested, completed and approved"). Phases 2 to 8 of PHASE1-RESEARCH.md.

## V2 — brand, collapsible menu, themes (13 Oct 2026, Ilse's order)
- Brand end to end: the app is now **Pace** ("Your day, at your pace"). New modern logo: three rising steps in the three level colours (honey, green, blue), drawn as one SVG used for the Home Screen icon, the favicon, the sidebar lockup, the collapsed-menu button and the Settings brand footer. Title, manifest and welcome all carry the new name. The on-device data key is unchanged, so existing users keep every task through the rename.
- Sidebar menus fully collapsible: the « button in the sidebar (and a Settings switch) hides the menu COMPLETELY, her standing rule for her apps; one floating Pace-mark button brings it back. The choice is remembered across restarts, on computer and phone alike. When open, the sidebar still sits beside the content at every width and narrows to a rail on phones.
- User-chosen visuals in Settings ("How it looks"): White, Dark, Blush, Sky, Mint and Lavender themes (the whole app re-skins through CSS variables, FullCalendar included via its own theme variables), plus a Cute mode (rounder corners, filled level pills, pastel board columns, small playful touches). The saved look is painted before first render, so there is no flash of the wrong theme.
- Icons: a small inline SVG icon set (calendar, talk, chart, gear, collapse, mic, file, camera, heart) replaces the old text glyphs and emoji in the menu and capture buttons.
- More interactive: a progress ring in the sidebar showing today's done percentage at the adapted pace, panel and row entrance animations, a pop on the picked level and on completed tasks, press feedback on buttons, sheets that rise, a sliding toast, smooth DayTicker scrolling, and a ghost fade on the row being dragged.
- Proof: the four v1 suites still pass untouched (37 logic, 27 browser, 7 drag, 6 recurrence) and a new v2 suite adds 19 checks (brand rendered, icons present, collapse hides the menu completely and persists, expand restores, dark and blush grounds measured by computed style and persistent, cute mode measured by its corner radius and persistent, phone rail beside content, phone collapse). 96 checks total, 0 errors. New proofs: dark-desktop.png, cute-blush.png, collapsed-desktop.png.

## QA fixes (13 Oct 2026) — the QA Tester gate found 2 bugs; both fixed the same day
The QA Tester ran the live app as a real user (92 checks of its own; 89 passed) and failed the build on two bugs, both in app.js. Verdict: ~/workspace/qa-tester/pace-QA-VERDICT.md. Fixes, per the three-gate law, loop back through Efficiency + Quality, then QA retests.
- BUG 1 (serious): a wrong-shaped tasks field (text, or the key missing) in the calmcal-v1 store bricked the app (pageerror, 0 ticker days, dead calendar, shell still switching panels). Fix: load() now normalises everything the app leans on: a non-object store returns null (fresh seed), tasks is forced to an array and filtered to real task objects with defaults filled (missing date becomes today, missing lists become empty lists, missing duration becomes 25), feelings and sent are forced to objects, settings.names is forced to an object of non-empty strings (it previously rendered blank level labels), stored digest times are cleaned, and the collapsed flag is coerced to a boolean.
- BUG 2 (minor): round-up times accepted impossible values ("25:99" stored, the digest could never fire, no message). Fix: one validClock helper (hour 0 to 23, minute 0 to 59, accepts "9:05" and stores it padded as "09:05") now filters both the Settings save and the load-time clean; when nothing valid remains, the existing ["12:30"] fallback applies in both places, and the Settings field rewrites itself to what was actually kept, so the fix is visible, never silent.
- Proof: new tests/qa-check.mjs, 14 checks covering both repro cases and their neighbours, all pass; the five earlier suites re-ran green untouched. Running total: 110 checks, 0 errors.

## Live
https://adhd-calendar-app-beta.vercel.app — Vercel project adhd-calendar-app (team support-6499's projects), static site from this repo's main branch, deployed commit e3488a. (adhd-calendar-app.vercel.app was already taken by an unrelated project, so Vercel assigned the -beta domain.) Live core files verified byte-identical to the gated build (MD5 on index.html, styles.css, app.js, logic.js, manifest.webmanifest, service-worker.js).

## Gates (12 Oct 2026)
- EFFICIENCY: PASS. It re-ran the logic tests itself, verified the FullCalendar byte size, and passed the lean route (reuse, $0, zero Ilse taps, durable verified pushes).
- QUALITY: PASS on the repo build including the taught-minimum fix below, judged item by item against PROMPT.md with its own shame-word and dash scans at zero. Live spot check requested with the URL above.

## Gates (13 Oct 2026, Pace v2 + QA fixes) — ALL THREE SEALS ON
- QUALITY: PASS on v2 (build + live), and PASS on the QA fix delta (own hash pulls: live app.js 3d5802be, logic.js still 35b8c14f, byte-identical to the v1-passed build).
- EFFICIENCY: PASS on v2, and PASS on the fix delta (verified in code; the full-suite re-run accepted as lean because the fix sits in load(), the whole app's blast radius).
- QA TESTER: first run FAIL on the 2 bugs above (92 checks, 89 passed); retest PASS, 24 of 24, on the final live build (verdict: ~/workspace/qa-tester/pace-QA-RETEST-VERDICT.md). Pace v2 is fully done under the three-gate law.

## What shipped
Self contained static files in the repo root. No server, no account, no keys, no cost. All data lives on the user's device (localStorage, key calmcal-v1).

- index.html, styles.css, app.js, logic.js: the app.
- fullcalendar.js: FullCalendar Standard Bundle v6.1.15, MIT licence, vendored locally (282,117 bytes) so the calendar engine works fully offline. This is the Phase 1 pick, used for real: month, week, day and agenda (list) views, event drag and resize.
- manifest.webmanifest + service-worker.js + icon.svg: PWA shell in the exact Meal Prep pattern (standalone display, cache-first offline, cache name calmcal-v1).
- tests/: run-tests.mjs (logic), browser-check.mjs, drag-check.mjs (real Chromium, real mouse drags).
- proofs/: desktop-month.png, phone-month.png, low-day.png, year-view.png, capture-drafts.png, progress-board.png.

## Features, mapped to her prompt
- Fantastical anatomy: sticky DayTicker strip (31 days, today centred as a filled circle, coloured pills per day) synced with the calendar and the day list through one selected-date state; tap the month title to return to today; Day / Week / Month / Year / Agenda views (Year = hand-built 12 mini-month heat view, tap a day to jump). Calendar Sets became Feeling Levels.
- Morning check-in at the user's set time, 3 levels in 3 colours (names user-renamable). Low = bare minimum only (must-not-slip tasks + one tiny step; tasks with a smallest version shrink to it; the rest parked with the words "Parked, not dropped"). Steady = capped list of 6. Full = everything + one offered stretch task from tomorrow. Changeable any time, the day re-shapes at once. Progress scores against the ADAPTED plan, never the full list.
- Teach-my-levels: every task carries a smallest version and a biggest version (task sheet + quick-add details), used by the levels above.
- Talk-to-it sidebar: type, speak (Web Speech API where the browser offers it, typing always works), upload a journal text file, or a photo of handwriting/notes (Tesseract.js OCR loaded on demand from CDN, with a check-and-fix step; the original words stay attached to every task it made). One brain dump becomes many tasks: split by line / sentence chain, dates and times read in plain words ("tomorrow at 3pm", "every weekday", "25/12", "!!!"), colour and duration assigned automatically, big vague jobs get 3 starter steps (small, physical, verb first, editable). Drafts are shown as editable cards before anything is added.
- Progress sidebar menu: To do / Doing / Done board, counts that only ever grow, done stays visible. Drag cards between columns.
- Drag and drop, all proven by real mouse drags: calendar events between days and times (FullCalendar), event resize changes duration, day-list rows dragged onto DayTicker days, board cards between columns.
- Notifications, Meal Prep pattern: offered on first open (Turn on / Not now), one plain Settings screen, user-chosen per type: morning check-in (once), start nudge before each timed task (contains the actual first step; fires at task time minus the user's lead-in, default 5 min), batched round-up of what's left at user-picked times, end-of-day done note (opt-in, only what got done). 30-second checker with de-duplication. Pause-all-for-today button. Nothing ever pings about parked items.
- No shame anywhere: a word sweep over every app file finds no overdue, missed, failed, streak or lazy language. "Not today" moves a task to tomorrow with the words "That counts as handling it."

## Declared deviations from the Phase 1 plan (reasoned, like Meal Prep's)
1. Natural-language dates: chrono-node's grammar was re-implemented as a small tested parser in logic.js instead of vendoring chrono-node (keeps the app light and fully offline; the grammar copied is the one the research documented).
2. Sidebar dragging: FullCalendar's built-in drag + native drag-and-drop are used instead of dnd-kit (a React toolkit; this app is vanilla, in the Meal Prep pattern).
3. Start-nudge maths: Meal Prep's start = time minus duration minus setup exists because food must FINISH at eating time. A task block BEGINS at its time, so the nudge fires at task time minus the lead-in only (default 5 min) and names the first step. Firing a full duration early would be a nag, which the psychology research bans.

## Honest limits (also stated inside the app)
- Web notifications fire while the app is installed or open. Guaranteed wake-ups while fully closed need a real Web Push server (Phase 7b, Ilse's decision, not built).
- The smart LLM brain-dump breakdown needs an AI key and costs money (Phase 6 decision, Ilse's). Version 1 is rule-based: free, private, and correctable.
- Handwriting OCR accuracy varies with the photo; the app always shows the read text for fixing before making the list.
- Voice input depends on the browser offering speech recognition (Chrome/Android yes; Safari partial). Typing always works.
- No external calendar sync (Google/Apple) in v1, as the plan recorded.

## Proof
- Logic tests: node tests/run-tests.mjs → 37 pass, 0 fail (parser, adaptation caps, min-version shrinking, no-shame outputs, nudge maths).
- Browser checks: 27 pass, 0 fail, 0 page errors (welcome, all 5 views, ticker sync, low/full day reshaping, done scoring, quick-add sentence, task sheet Not today, dump → 3 drafts → calendar, board, settings, notification permission granted, notification checker fires a start nudge and records it sent, phone width renders with the sidebar beside content narrowed to 78px, service worker cached all app files).
- Drag checks: 7 pass, 0 fail (real mouse: week-view event dragged to a new day and saved; board card dragged To do → Doing; day-list row dragged onto a DayTicker day and saved).
- Recurrence checks: 6 pass, 0 fail ("every weekday" captured, shows today and tomorrow, done recorded for one day only, taught smallest version shown shrunk on a Low day).
- Post-build fix, found by the recurrence checks: a taught smallest version only shrank a task if the day's cap happened to show it, so a taught task could still be parked on a Low day. That broke the teach-my-levels promise in the Phase 1 research (a task with a minimum version shrinks instead of vanishing). adaptDay now treats every taught-minimum task as part of the bare minimum: visible and shrunk on Low days. All four suites re-ran green after the fix (77 checks total).
- Tooling note: notification checks fail under the minimal headless shell (it cannot grant notification permission) and pass under full Chromium; that is a test-shell limit, recorded here, not an app limit.

## v3 — To Do + Habits (Ilse's order 13 Oct 2026, 22:12) + Visual Law cuts

Two new sidebar panels, built icon-first under her design law (least text, icons everywhere):
- **To do**: a fast capture list beside the calendar. Add by typing (Enter), by voice (each spoken line becomes an item), or by photo (the same on-device OCR as Talk to it, with a tick-the-keepers check step). Every item carries its own calendar choice (the calendar icon on its row), plus an "All to calendar" select-all in the header. Sending creates today's calendar task; tapping again takes it back off. Items not sent live in To do alone. Done items tick off with the shared check icon; "Clear done" appears only when there is something to clear.
- **Habits**: an icon picker (12 icons from the app's own sprite), one row per habit: its icon in a tinted circle, the name, the streak drawn as dots + "N in a row", 7 tappable week dots (today ringed), and a big tick for today. Streak maths is pure and unit-tested in logic.js (streakInfo: an unticked today keeps yesterday's run alive, because the day is not over).
- Saved data: todos/habits join the load() heal pass — wrong shapes reset to empty lists, never a brick (the QA Bug 1 lesson applied from the start).
- **Visual Law cuts** (App Checker baseline audit, 13 Oct; its gap list T1–T10 + I1–I3, applied in this same build): the Welcome's 77 words of paragraphs are now the name, the tagline and one 6-word line; both panel ledes cut; check-in sub-line is "The day adapts."; Settings hints cut to one-liners; the add button is the i-plus icon, the day-list tick is the i-check icon (same drawing as To Do/Habits), the task sheet's five actions carry icons; Up Next shows a first step only when the step differs from the task name; parked/stretch/empty notes halved, keeping "Parked, not dropped". One test expectation updated (browser stretch regex is now case-insensitive; v2 icon count 4 → 6 for the two new nav items).
- Service worker cache bumped to pace-v3.
- Proof: maker suites 142 checks, 0 failures (logic 44 incl. 7 new streak checks; new features-check.mjs 25; browser 27; drag 7; recur 6; v2 19; qa 14). Screenshots: proofs/v3-todo.png, proofs/v3-habits.png.

## 14 Oct 2026 — the four laws build (SW pace-v6)
- LOGO WIRED: concept C "One Stepped Path" (Quality winner) is now icon.svg (full-bleed), logo.svg (tile) and the sprite i-logo — one staircase geometry everywhere.
- SIDEBAR ADAPTIVE LAW (final shape, per HQ/ILSE-STANDARD §5): the menu is hidden on EVERY load (normalise forces it; opening is per-session), the app centres across the full screen when hidden and reflows beside the menu when open (232px desktop / 78px phone rail). Maker geometry probes in tests: v2 28 checks.
- EMPTY-START LAW (store apps): inside the Capacitor wrapper the app seeds ZERO tasks (runtime detection); the web app keeps its samples; saved data never touched. Designed empty day + Skip at the dock.
- GUIDE (Empty-Start law, Lab spec GUIDE-MASCOTS-001): Skip the Ferry — one SVG master, welcome/point/celebrate/goodbye poses, bubbles ≤6 words ("We cross at your pace."), step 2 applies themes for real, step 3 ends at the Add sheet, close in one tap, never blocks, reopens from Settings (Setup guide), and Skip waits at the empty-day dock only.
- DATA NEVER DELETED: the normalise pass now REPAIRS a string-shaped todos value into a real item instead of dropping it (pinned in features-check).
- Maker total: 165 checks, 0 failures (logic 44, features 38, browser 28, drag 7, recur 6, v2 28, qa 14).

## 14 Oct 2026 — Store Review fix build (SW pace-v8)
Fixes routed by the Store Review desk's first full sweep (Pace 42 PASS / 8 FAIL):
- SR-E1/E2 privacy: privacy.html + a new support.html published from the app repo
  (URLs in the store listing pack); both linked from Settings ("Help + privacy").
- SR-A7 Tesseract: the OCR library is BUNDLED — vendor/tesseract holds
  tesseract.js 5.0.5, its worker, the two LSTM core builds (SIMD + plain, WASM
  embedded) and the English LSTM data (best_int). app.js calls recognize() with
  local workerPath/corePath/langPath; no CDN string remains. New suite
  tests/ocr-check.mjs reads a real generated image through the real photo input
  and asserts zero external requests.
- SR-H2 screenshots: all store shots re-shot on this build; To Do and Habits
  join the set (6 per store).
- SR-H6 support: support.html (email + the three questions people actually ask)
  is the support URL in the pack.
- SR-I1 signing stays Ilse's Vault step (SIGNING.md) — the AAB rebuild remains
  unsigned-but-ready until then.
- Follow-up catch (same day): bundletool decompresses .gz assets in the AAB
  and strips the suffix — the language file rides in the bundle as raw
  eng.traineddata. app.js now passes gzip:false inside the Capacitor wrapper
  (web unchanged); SW pace-v9. Both shapes test-proven (web 5/5, store-shape
  simulation 5/5).

## REBRAND — "Pace Calendar" + Still Water (14 Oct 2026, Ilse blanket approval)
Board approved (Lab claim locked 14 Oct: Bricolage Grotesque + Manrope,
Still Water palette). Name locked "Pace Calendar" WITH mitigations —
never bare "Pace" in title/logo; paired form in listings.
- Skin: :root remapped to the board (Porcelain Mist ground, Pine Shade
  ink AAA 11.40, Still Water primary large/icons only per CONTRAST.md
  fences, Soft Apricot fills/marks only, Water Light tints; filled
  buttons use a deepened shade #4858C4 so white text passes AA).
  Dark look remapped to a pine night. Heat scale now periwinkle ramp.
  Category data colours kept, two brand-coincidence hexes retinted.
- Type: Bricolage Grotesque (display) + Manrope (UI) vendored as
  variable TTFs in fonts/, SIL OFL; @font-face + SW-cached.
- Mark: variant D (Ilse "Perfect approved") FINISHED as vector —
  calendar page joined into Skip's hull like a cabin; icon.svg,
  logo.svg, sidebar sprite all carry it. Store icons regenerated.
- Guide: Skip's art of record finished from the variant B composition
  (full ferry, calendar smaller inside him as cabin); poses unchanged.
- Calm nav delta: sidebar group labels Plan / Lists / Add + app
  (CALM-NAV-AUDIT.md delta of record — labels only, order regrouped).
- Name wired: <title>, manifest, wordmark, Settings footer, welcome,
  Capacitor appName, listing title "Pace Calendar — ADHD Planner" (28).
- SW pace-v10 (fonts in the shell). Maker sweep 166/166 (v2 pins
  updated to the new brand: title + dark ground rgb(20,31,27)).
- Promo page built to the binding blueprint (promo.html + promo/
  imagery from the re-shoot; founder block = slot, waits her why-line;
  NO rating chip — none exists).
- Law E backgrounds ride the NEXT build per the prep note (recorded;
  not silently folded into this one).

<!-- deploy nudge 14 Oct: full-deployment refresh for the rebrand binaries -->

## LAW B2 FIX BUILD (pace-v11, 14 Oct 2026)
App Checker's live v10 re-probe found task delete firing instantly with
no safety step (LAW B2). Fix: every destructive delete now carries an
Undo in the toast (6.5s window) — task delete, recurring remove-for-day,
to-do delete, clear-done, habit delete, to-do calendar unlink, and
remove-samples. An un-undone delete persists (the window is the safety,
not a block); plain toasts carry no Undo. Built on the exact v10 bytes
(staged apart from the held v12 import wiring). Proof:
tests/delete-undo-check.mjs 13/13 + the full 166 sweep = 179/179.
Maker: Pace build desk.

## "BRING MY CALENDAR IN" (pace-v12, 14 Oct 2026)
Ilse's house feature, Pace leads: one button (calendar header +
Settings + the guide's last step) opens one sheet — Google / Apple /
Outlook / a file — everything copies in with counts shown. Repeats
that match Pace's model stay live; the rest expand (−30d → +12mo).
Dedupe per user, never overwrites, read-only against the source,
demo sessions have no entry points. Isolation-first module
(calendar-import.js, vendored ical.js 1.5.0) pinned by three
batteries: 23 module + 11 browser + 8 isolation (Security NS-2).
Proof on the shipped tree: the full sweep, 221/221. Design:
IMPORT-DESIGN.md; adoption: IMPORT-ADOPTION.md. Google sign-in is a
named adapter slot (needs Ilse's OAuth client) — v1 Google source is
its iCal secret-address line. Maker: Pace build desk.

## FEEL BUILD (pace-v13, 14 Oct 2026, Ilse's direct order)
Her verdict on v12 ("too ugly and cramped; dictation doesn't work;
Skip cuter + say my lines; prove the mood loop") rebuilt as one build:
(1) VISUAL — air pass over every view (spacing scale up, softer
grid, other-month days recede), events become tinted pills with a
colour spine + ink text (never white-on-solid), Week/Day show waking
hours (06:00–22:00) instead of the empty 24h grid, phone month shows
colour DOTS (titles live in the list below — truncated chips were a
real part of "cramped"), month caps at 3 events/day + "+n more".
(2) DICTATION — root cause: the store app's WebView has no web
speech, so Speak could never work there. One voice engine now:
device recogniser via @capacitor-community/speech-recognition in the
store build (RECORD_AUDIO + RecognitionService queries; iOS mic +
speech usage strings), hardened Web Speech in browsers (live interim
words, continuous), and errors that name their cause (blocked mic /
no mic / heard nothing / needs internet). Battery: voice 8/8 +
real-voice mic-path probe (her banked recording through the fake
mic: RMS peak 0.4565 — real voice energy reaches the app; the cloud
recogniser itself is the device's and cannot run in a sandbox).
(3) SKIP — cuter on the geometry of record (bigger eyes + highlights,
apricot blush, wider smile, rounder cabin; graphics-pipeline concept
proven first, finished as vector like the mark). Skip says her line
in the guide: "This calendar helps people that are overwhelmed, or
with ADHD and problems getting things done."
(4) MOOD — her words are the defaults now: "How are you feeling
today?" → Good / Ok / Bad (existing users keep their own names).
Proof battery tests/mood-check.mjs 14/14: Bad shrinks + parks,
Ok normal, Good stretches, persists across reload.
Law E renumbers to v14 (this build took v13 on her order).
Maker: Pace build desk.
Sweep record, stated exactly: the first full v13 sweep run held
4 failing suites — three stale maker tests encoding pre-v13
behaviour Ilse ordered changed (guide step order, fallback level
words, import step position) and one harness bug in the new mood
suite (tasks seeded by UTC date; Sydney crossed midnight AEDT
mid-session and the app correctly showed its own next day). All
fixed in tests only; shipped bytes never changed. Full re-run:
247/247 (run 44, features 39, browser 28, v2 24, drag 7, recur 6,
qa 14, delete-undo 13, import 26, isolation 8, import-ui 11,
voice 8, mood 14, ocr 5). The desk's lesson, recorded: the figure
quoted in the first gate briefs (243/243) was sent before the
sweep output existed; corrections went to every desk that
received it the same night.

## v14 RIDERS (fixed + proven in-tree 15 Oct, ride the Law E build)
QA's v13 audit notes 2 + 3, fixed the same night: (2) all-day/month
block titles now end with an ellipsis instead of cutting mid-word
("School holidays p…" — CSS, .fc-daygrid-event title chain); (3)
after a final dictation lands, interim words no longer stomp the
"check the words" nudge (the final hook owns the message from then
on) — proven by a new voice-battery leg, 9/9. Notes 1 + 4 (the
ticker doubling the grid's dates; the 108-element count) are one
open design question, put to HQ by name — not patched over.
QA addendum (sha 0279e4c3) rider, same treatment: the two most-
touched first-screen controls sat 2–3px under the 44pt guidance —
mood buttons now min-height 44 (measured 74×44 on the phone build),
the add button 46×46 (measured); view segments raised 29 → 38px
(measured 47×38) as a disclosed secondary-control choice (above
the WCAG floor, under the guidance, deliberate for a five-way
switcher in a calm topbar). Sidebar items were already 57px.
Quality's framing of this build's two lessons, banked verbatim:
"a claim is not a check, and a figure quoted from memory reads
the same as a figure quoted from hope." Both filings (the sweep
figure, the "real-voice proof") stated a result before its
evidence existed; both were caught and corrected by this desk
the same night, and stand as lessons, not findings.

## LAW E BUILD (pace-v14, 15 Oct 2026)
Backgrounds, per the law: Settings → How it looks now offers WHITE
(porcelain) · BLACK (pine night) · BRAND (the Still Water wash)
· the existing user looks · UPLOAD YOUR OWN PHOTO. A photo is
downscaled on-device and stored as user data (Law B): switching
looks never deletes it; a "Your photo" chip re-applies it; Remove
is the user's own delete and carries Undo (Law B2). Contrast
adapts from the photo's own brightness: bright photo → porcelain
veil (80%) + pine ink; dark photo → pine-night veil (88%) + light
ink. Proof: tests/backgrounds-check.mjs 14/14 incl. worst-case AA
computed from the live CSS (veil over pure black AND pure white
pixels: 10.31 dark mode, 7.12 light mode, floor 4.5).
Riders (all fixed + proven before this build, from QA's v13
audit): all-day titles ellipsis · dictation nudge survives
interim words · tap targets (mood 44, add 46, segments 38).
Maker: Pace build desk.
Caught by the sweep before shipping (recorded plainly): the
first Law E draft reused the id "photoFile" for the settings
upload — an id the Talk-to-it photo input already owns. Both
handlers bound to one element and OCR timed out. Renamed to
bgPhotoFile/bgPhotoBtn; ocr 5/5, backgrounds 14/14, features
39/39 after the fix. Full sweep after all fixes: 262/262
across 15 suites.
Switcher ruling (QA Addendum 2, sha e8e084d0): the view segments
at 38px STAND as a recorded choice — under the 24px floor is a
fail, under the 44pt guidance is a named finding, and a named
finding on a secondary control may close by deliberate recorded
decision when every primary action meets the guidance (mood 44,
add 46, sidebar 57 — all measured). Never dressed as 44.
v14.1 delta (App Checker B3): in photo-light mode the hint ink
(--ink-3) over a dark patch of a bright photo measured 3.42 —
under AA. Photolight --ink-3 deepened to #42564a (this mode
only): worst case 4.52. The backgrounds battery now measures
ALL THREE ink levels in BOTH photo modes (20/20) — the title ink
passing was never the floor; the faintest hint ink is.

ADDENDUM (15 Oct, evening) — THE POST-SEAL DELTAS, v15.3 to
v15.6, all gated and closed on the v15.6 tree: v15.3 — the
nav ruling (the Muse-app sidebar shape: open menu takes the
phone screen, content a tappable sliver; the 78px rail
retired). v15.4 — sign-up asks for the user's name (carried
on the profile, adopted after reconcile settles, greet-by-
name) + the no-Ilse sweep over every shipped file (battery-
asserted on every run). v15.5 — final-sweep fixes: F1 fresh
phone paint (the calendar re-sizes on every sidebar settle),
F2 the up-next Start button (a bare 34x21 speck became a
44px pill), and the feeling words read Bad · Ok · Great
(the complete old factory set migrates; customised names
never touched). v15.6 — Quality's held deletion leg,
diagnosed to a real interleave: a 1200ms debounced sync
could land mid-sweep and resurrect the state doc after its
delete (spine + shards stayed deleted — the fingerprint).
The sweep now disarms sync before re-auth and re-arms on
failure. Closure evidence: accounts battery 29/29 at three
desks (QA three times over on the named tree), Quality's
own re-run OOM-killed by the shared sandbox and stated as
exactly that. The sandbox also lost its full Chromium this
day (headless shell only) — the two notification legs in
browser-check cannot go green there; environmental, proven
at three desks, no delta touches that code.

## DOOR-FIRST LINE (pace-v15.9 → v15.11, 15–16 Oct 2026)
v15.9 built Ilse's approved v4 shape: the door is a full page
(sign-up only, big and in the middle — mark tile, icon doors,
one email field, password on step 2), then the whole app with
Skip's tour pop-up in the middle (the name asked inside it,
first visit only; plans chosen later only). v15.10 added the
name re-ask chain (once, next visit, then never), the ruled
step-2 words ("Your password" · "Continue" · the one-button
caption) and removed the mockup annotation lines from the door.
v15.11 built the upgrade moment: "That's a Plus thing." with the
locked price words (A$4.99/mo · A$39.99/yr · first month free ·
A$99.99 lifetime on Plans only), the honest lines standing
("Nothing is locked today, and nothing charges…" · "Not on sale
yet. Nothing to pay today."), calm cap once per visit per edge.
Line fully gated 16 Oct (accounts 39/39 · features 47/47).

## LANGUAGE BUILD (pace-v16 → v16.1, 16 Oct 2026)
i18n.js: key-by-source-string layer, device language decides
(Spanish complete, 313+ entries), FullCalendar locale wired,
four legal strings fenced to English until a human signs them.
v16.1 fixed QA's one finding (the six sidebar labels now carry
the layer; "Calendar" = "Calendario"). The open menu is a named
frame in every language walk from this build on. SR-B7 closed
for Pace at pack level — the programme's first full language
close. Gates: Quality PASS · Efficiency PASS · QA retest PASS.

## P5 STORE-TRUTH FLIP (16 Oct 2026)
privacy.html + the three listing papers flipped to the accounts
truth from P5-STORE-TRUTH-PREP.md (Firebase named; guest posture
true; date 16 October 2026). Deployment lesson of record: Vercel
auto-deploy silently skipped the night's commits — fixed by
creating a deployment from branch main at the newest commit in
the dashboard; never "Redeploy" an old one.

## THE SR-OBSERVATION PAIR (pace-v16.2 + v16.3, 16 Oct 2026)
v16.2: the Settings rename captions now read "Bad day is
called · Ok day is called · Great day is called" (+ Spanish),
and a full nested-text sweep (now a standing part of the
layer's proof) wired 7 more leaks. v16.3: all 12 static aria
surfaces carry the layer; aria-label and its mirroring title
translate through the same call so they cannot drift.
Certificate #2 stands on the v16.3 pack: AAB SHA256
442393158403aabc852a4c50eae0b3e81b9948deb7a18ab0426ecb6c70228e93.

## 17 OCT 2026 — SUBMISSION TRUTH + THE 100% LINE
The submitted v16.1 build drew Apple's Guideline 2.1 letter
(new-account information gate; no app fault found). Ilse ruled:
resubmissions hold until the app reads 100%; one filing vehicle.
Pace's inventory: 23 of 27 (85%) — the four open rows are her
locks (Apple door · Plus selling · own-currency prices · CEO
pin). Pace's own B-F items, from SR's spine: B-F1 = raw provider
error text at the door; B-F2 = the privacy-manifest correction.
Both fixed 17 Oct: B-F1 by one calm translator (PaceFB.userError)
at all five error display sites, its fourteen lines in Spanish,
proven on six shaped errors; B-F2 written into
pace-store/ios/App/App/PrivacyInfo.xcprivacy (Email · Name ·
User ID · Other User Content, Linked · no tracking · App
Functionality), plist-parse verified. Also landed: the fleet
import-module verification (module SHA256 68492ade…, batteries
26/26 · 11/11 · 8/8 fresh; one stale harness leg found +
repaired with its reason commented, and the accounts harness's
pot-door race closed the same way), the inert billing groundwork
(billing.js seam + pace-store/BILLING.md), and the Apple door's
browser half wired behind appleEnabled. The 100% build was cut
(pace-v16-4; AAB 9,681,435 B · SHA256
e0338257b8829ce78cf33da854fe67700c7b2f87710a2e8451433b43fbf6c226)
and the visual proof pack built from its bytes (proof-pack/:
12 real frames + PACK.md; the bundle's icon.svg reads MD5
99d021582d15efb874233493ca7732b2 — byte-identical to the approved
variant D). Regression on the tree: features 47/47 · accounts
39/39 (confirmation run; a 36/3 first read under load was the
box). Her locks re-based by her 16:09 order to the TestFlight
100% build after her visual confirmation; the 17 Oct console
watch for her first sign-in ran its window and found the Auth
list still empty, so no pins stand yet — the pin writes + reads
back the hour her sign-in lands.

## CERTIFICATE MOVE (17 Oct 2026)
Store Review's delta read verified both B-F marks in the 100%
build's bytes (B-F2 by their own plist parse; B-F1 at the
architecture + string level, QA's behavioural re-proof its
closing mark) and reproduced the icon byte-match at their
hand. Certificate #2 moves to the pace-v16-4 pack: AAB SHA256
e0338257b8829ce78cf33da854fe67700c7b2f87710a2e8451433b43fbf6c226
— Pace's build of record. Same day: the shells' display name
was fixed to "Pace Calendar" in the store package (the App
Checker's census item; rides the next cut), and the proof
pack gained its addendum carrying the census dispositions.

## 18 Oct 2026 — BUILD 4 (the fix build; TESTFLIGHT TEST COPY)

Contents: import v16-5 (file-only sheet + privacy re-cut) · safe-area
insets (load · drawer-open · scroll, battery 13/13) · native doors
(Caresitters recipe of record: @capacitor-firebase/authentication
8.5.2, the plugin's idToken feeding the REST exchanges, the Apple raw
nonce verbatim; accounts battery 44/44). iOS app registered in
pace-app-calendar: bundle shop.ilseplacencia.pace, GOOGLE_APP_ID
1:1098367119523:ios:48edaa4c53f22dd28ecf16. IPA run #5, sha256
7ff9a0cf, delivery dc7533f2. Gates on the packaged bytes: SR delta
PASS · Quality delta PASS · (Efficiency + QA packaged runs fired).
NOT SUBMITTED — her hold: TestFlight test + her approval first.

★ CONDITION OF RECORD (Quality, 18 Oct 2026): the shipped
GoogleService-Info.plist is the value-identical reconstruction
(md5 48592a16) — the run's checkout raced the minted file by seconds.
Acceptable for the test copy (values verified exact inside the
shipped bytes). ANY STORE-BOUND BUILD MUST CARRY THE GENUINE MINTED
BYTES (md5 ab1932ed4d2fa11c5d31fa195a00750d), already in the repo at
store/ios/App/App/GoogleService-Info.plist (blob bde2e94c). Assert
the shipped plist's md5 at that build's gate.
