# BUILD LOG — Calm Calendar (ADHD Calendar App)

Built 12 Oct 2026, fully autonomous on Ilse's order ("work fully autonomous and don't stop until app fully tested, completed and approved"). Phases 2 to 8 of PHASE1-RESEARCH.md.

## V2 — brand, collapsible menu, themes (13 Oct 2026, Ilse's order)
- Brand end to end: the app is now **Pace** ("Your day, at your pace"). New modern logo: three rising steps in the three level colours (honey, green, blue), drawn as one SVG used for the Home Screen icon, the favicon, the sidebar lockup, the collapsed-menu button and the Settings brand footer. Title, manifest and welcome all carry the new name. The on-device data key is unchanged, so existing users keep every task through the rename.
- Sidebar menus fully collapsible: the « button in the sidebar (and a Settings switch) hides the menu COMPLETELY, her standing rule for her apps; one floating Pace-mark button brings it back. The choice is remembered across restarts, on computer and phone alike. When open, the sidebar still sits beside the content at every width and narrows to a rail on phones.
- User-chosen visuals in Settings ("How it looks"): White, Dark, Blush, Sky, Mint and Lavender themes (the whole app re-skins through CSS variables, FullCalendar included via its own theme variables), plus a Cute mode (rounder corners, filled level pills, pastel board columns, small playful touches). The saved look is painted before first render, so there is no flash of the wrong theme.
- Icons: a small inline SVG icon set (calendar, talk, chart, gear, collapse, mic, file, camera, heart) replaces the old text glyphs and emoji in the menu and capture buttons.
- More interactive: a progress ring in the sidebar showing today's done percentage at the adapted pace, panel and row entrance animations, a pop on the picked level and on completed tasks, press feedback on buttons, sheets that rise, a sliding toast, smooth DayTicker scrolling, and a ghost fade on the row being dragged.
- Proof: the four v1 suites still pass untouched (37 logic, 27 browser, 7 drag, 6 recurrence) and a new v2 suite adds 19 checks (brand rendered, icons present, collapse hides the menu completely and persists, expand restores, dark and blush grounds measured by computed style and persistent, cute mode measured by its corner radius and persistent, phone rail beside content, phone collapse). 96 checks total, 0 errors. New proofs: dark-desktop.png, cute-blush.png, collapsed-desktop.png.

## Live
https://adhd-calendar-app-beta.vercel.app — Vercel project adhd-calendar-app (team support-6499's projects), static site from this repo's main branch, deployed commit e3488a. (adhd-calendar-app.vercel.app was already taken by an unrelated project, so Vercel assigned the -beta domain.) Live core files verified byte-identical to the gated build (MD5 on index.html, styles.css, app.js, logic.js, manifest.webmanifest, service-worker.js).

## Gates (12 Oct 2026)
- EFFICIENCY: PASS. It re-ran the logic tests itself, verified the FullCalendar byte size, and passed the lean route (reuse, $0, zero Ilse taps, durable verified pushes).
- QUALITY: PASS on the repo build including the taught-minimum fix below, judged item by item against PROMPT.md with its own shame-word and dash scans at zero. Live spot check requested with the URL above.

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
