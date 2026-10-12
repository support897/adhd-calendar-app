# BUILD LOG — Calm Calendar (ADHD Calendar App)

Built 12 Oct 2026, fully autonomous on Ilse's order ("work fully autonomous and don't stop until app fully tested, completed and approved"). Phases 2 to 8 of PHASE1-RESEARCH.md.

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
