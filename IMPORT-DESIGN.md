# "Bring my calendar in" — shared import module: design of record

Ilse's order via HQ, 14 Oct 2026 (19:29): *"for all calendars add the
option to instantly change all your data from other calendars and add
data to our calendar instead — in one simple step."* Pace designs and
builds it first; every other calendar app adopts this module unchanged
(the Meal Prep engine pattern: one vendored module + an adoption note,
never a per-app redesign).

## The step (identical in every app)

From the app's calendar, ONE calm action — an icon-led button "Bring my
calendar in" — opens ONE sheet:

1. Pick a source: **Google Calendar · Apple / iCloud · Outlook · A file
   or link (.ics)**. Each source shows ONE line on where to find it.
2. Everything comes across in one go. The sheet ends with counts:
   **"128 events brought in"** — never a silent success.
3. The data now lives in OUR calendar as the user's own data.

No wizard, no step 2 of 5, no settings maze (Law D calm). The setup
guide OFFERS the step once ("Want to bring your old calendar in?")
like Meal Prep §3.7's parked-data offer — offered, never forced, and
Empty Start stands: nothing arrives pre-filled, ever.

## Sources — the honest engineering shape

v1 transports, all ending in the same normaliser:

- **ICS file** (upload) and **ICS link** (paste a URL; Google, Apple
  and Outlook all publish a "secret / public iCal address" — one line
  of guidance per service inside the sheet). Works today, no accounts,
  no keys, no server.
- **Google sign-in** — a named ADAPTER SLOT in the module
  (`sources.google`), not built in v1: it needs an OAuth client of
  Ilse's (her Google step) and activates without touching the core.
  The sheet shows it as a source like the others; until the client
  exists it routes to the ICS-link line for Google ("paste your Google
  iCal link — here's where it lives"). Never faked, never hidden.

## Rules (fences, all testable)

1. **Read-only against the source.** The module never writes back,
   never deletes anything in the old calendar. Declared in plain words
   at the button: "Read-only — copies your events into Pace. Nothing
   in your old calendar changes."
2. **Law B data**: imported events are ordinary user data — the app
   never deletes them; only the user can.
3. **Dedupe, never double.** Every import records a registry in state:
   `imports: [{ key, sourceLabel, at, count }]` where
   key = hash(source kind + calendar name + the source's event UIDs
   fingerprint). Each imported task carries `importUid` (the source
   UID) + `importKey`. A re-import of the same source SKIPS any event
   whose (importKey, importUid, start) is already present. Source-side
   edits arrive as new-only on re-import — stated plainly in the
   sheet's one line: imports are a copy, not a sync.
4. **Untouched-snapshot rule**: an event the user has EDITED in our app
   since importing is never overwritten by a re-import (its snapshot
   hash differs from what import wrote; re-import leaves it alone).
   Import only ever ADDS.
5. **Repeats resolved truthfully.** Pace's repeat model is five
   strings (every day / weekday / weekend / week / <weekday>).
   Mapping: an RRULE becomes a LIVE repeat only when it matches that
   model exactly AND is open-ended (no UNTIL/COUNT) AND has no EXDATEs
   AND no per-instance overrides. Everything else EXPANDS into
   individual events inside the window. Truth first, always — never
   import a repeat that will fire on wrong days.
6. **Window**: expansions cover −30 days → +12 months from import day.
   Live repeats run on Pace's own engine beyond the window.
7. **Demo sessions: import OFF.** The connections fence — in a demo
   session the button does not appear at all.
8. **All-day + timezones**: all-day events stay all-day (no fake
   times); timed events convert through the calendar's own VTIMEZONE
   definitions (the parser carries them) into local date + time.
9. **Counts shown**: events brought in, repeats kept live, expanded
   instances, duplicates skipped, unparseable skipped — each a number
   on the result line. Nothing silently dropped (Law B spirit applied
   to the import itself: a skip is a counted skip, named).

## The module

`calendar-import.js` — vendored ical.js core (MPL-2.0, licence in
`vendor/ical/`) + a thin house layer. Version note (build time): 2.1.0
ships ESM-only, which cannot load as a classic script in the app or
under Node require; the vendored build is **1.5.0 UMD (81,064 B)** —
the long-proven release with the identical API surface used here
(parse / Component / Event / TimezoneService / recurrence iterator),
verified by the fixture battery (23 checks) + browser battery (11).

- `CI.parseICS(text)` → raw events (uid, title, notes, location,
  start/end, allDay, rrule, exdates, overrides).
- `CI.planImport(events, existingTasks, opts)` → a PLAN, pure and
  testable without a DOM: { add: [taskShapes], liveRepeats: n,
  expanded: n, dupes: n, skipped: [{title, why}] }.
  Opts: `now`, `sourceLabel`, `importKey`, and `repeatModel` — a host
  whose repeat model cannot say Pace's five strings truthfully (or
  which has NO repeat model) passes `repeatModel: "none"` and every
  RRULE expands into instances inside the window instead of mapping
  live; liveRepeats then reports 0 and the counts stay truthful
  (Meal Prep seam Q1, 14 Oct 2026; default behaviour unchanged).
- `CI.applyImport(state, plan, sourceLabel, toTask)` → mutates the
  state-shaped object it is handed ({tasks, imports}), writes the
  registry entry when events were added, returns counts. The host
  commits through its own save path (Law B repair boundary untouched).
  SANCTIONED SEAM (Meal Prep Q2): handing applyImport a collector —
  {tasks: [], imports: hostImports} — and committing the collected
  shapes through the host's own save() is the intended use; the module
  never touches storage itself.
- The source list + per-source one-line guidance are NOT a module
  export: the guidance of record is the shipped sheet copy (Pace's
  app.js IMPORT_GUIDE + the sheet markup in index.html). Hosts copy
  those strings verbatim and may re-tint; the module stays copy-free.
  (Meal Prep Q3 — an earlier draft of this section overstated a
  `CI.sources` export; corrected 14 Oct 2026.)

Hosts wire: one button, one sheet, three calls. Adoption note ships
with the module (IMPORT-ADOPTION.md) — a desk adopting it changes
labels + brand tint only.

## Isolation contract (Security NS-2, 14 Oct 2026 — isolation-first)

The module is written isolation-first because every app inherits it:

- The module only ever receives THE IMPORTING USER'S OWN space: the
  host passes that user's state (today: the device state; under
  accounts: that user's `users/{uid}` document). It has no API that
  can see, scan, or write any other user's space.
- Dedupe scope = the importer's space ONLY. Two users importing the
  same calendar each get their own full copy; one user's imports are
  invisible to another's dedupe (a cross-user dedupe would leak that
  the events exist elsewhere).
- Counts move for the importer alone; the registry row lands in the
  importer's space only, and only when events were actually added.
- A forged or malformed file cannot write anywhere: parsing produces
  a plan of plain task shapes for the importer's space; nothing in a
  file can name a path, a user, or a destination.
- Demo sessions: imports OFF (the entry points do not exist).
- Pinned by `tests/import-isolation-check.mjs` (8 checks, TU cast):
  B imports the calendar A already holds → B gets the full set, A's
  and C's spaces stay byte-identical; re-import inside B dedupes;
  malformed file adds nothing and writes no registry row.
- The standing cast (Security spec, 14 Oct): TU-A content-rich ·
  TU-B second user/attacker · TU-C personalisation contrast, seeded
  in `tests/fixtures/users/` (content marked TEST in the seed itself).
  Under accounts they mint as `sec-pace-{a,b,c}@example.com` in the
  TEST project at P2; credentials live only in the running desk's
  handling, never in repos or chat.

## Pace wiring (v1)

- Button in the Calendar panel header area (icon i-calplus + label),
  hidden in demo sessions.
- Guide step 3's offer line + a Settings row ("Bring my calendar in")
  pointing at the same sheet.
- state.imports registry added to schema + normalize (array of plain
  objects; repaired like everything else).
- privacy.html gains one paragraph: what import reads, that it is
  read-only, that imported data lives on the device like everything
  else. Store Review gets the heads-up for Data Safety wording.
- SW: calendar-import.js + vendor/ical/* join the shell; cache bump.

## Proof battery (before any gate)

Fixtures: Google-export ICS (timed + all-day + RRULE weekly +
EXDATE), Apple ICS (VTIMEZONE-heavy), Outlook ICS (fortnightly —
expands), a monthly RRULE (expands), an UNTIL-bounded daily (expands),
a malicious/odd file (no VEVENTs, broken lines) → counted skips, no
crash. Browser end-to-end: file import via the sheet with counts;
re-import → 0 added, dupes counted; edited-import protection;
registry written; data survives reload.
