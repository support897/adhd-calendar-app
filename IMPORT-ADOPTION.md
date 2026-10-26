# Adopting "Bring my calendar in" — the shared import module

One shared step, identical in every app (Ilse's order, 14 Oct 2026).
Pace designed and proved it; your desk adopts it, it does not redesign
it. Design of record: `IMPORT-DESIGN.md` (in the Pace repo).

## What you take, unchanged

- `calendar-import.js` — the house layer (parse → plan → apply).
- `vendor/ical/ical.min.js` + `vendor/ical/LICENSE.txt` — the proven
  parser (ical.js 1.5.0 UMD, MPL-2.0; 2.x is ESM-only, do not "upgrade"
  it — the UMD build is deliberate).
- The step's shape: ONE button on the calendar → ONE sheet → counts.
- The fences (non-negotiable): read-only against the source, declared
  in plain words at the button · imported data is the user's own under
  Law B · re-import dedupes by event UID + start in the importing
  user's own state, never doubles, never overwrites · repeats map live ONLY when your repeat model can say
  them truthfully, everything else expands · window −30d → +12mo ·
  demo sessions: the entry points do not exist · the guide offers it
  once at setup, never forced · Empty Start untouched.

## What you wire (about an hour)

1. State: add `imports: []` to your schema + normalise-on-load
   (array of { key, source, at, count } — repair, never drop).
2. Copy the two vendored files + `calendar-import.js`; load order:
   parser, then module, then your app script. Add both to your
   service-worker shell; bump the cache.
3. Entry points: a button in the calendar header (icon + "Bring my
   calendar in"), a Settings row, and the guide's offer on its last
   step. Hide all three in demo sessions.
4. The sheet: source buttons (Google · Apple/iCloud · Outlook · file)
   with the per-source one-line guidance from Pace's sheet verbatim,
   a link field, a file picker, one result line for counts.
5. `shapeToTask`: map the module's shapes onto YOUR task fields.
   Notes + location must land somewhere the user can SEE (Pace folds
   them into the task's words/original text). Categorise with your
   own categoriser.
6. Privacy page: one paragraph — what import reads, read-only, data
   stays on the device. Send Store Review the heads-up for Data
   Safety wording with your delta.
7. Proof: run Pace's fixture battery against your wiring
   (`tests/import-check.mjs` is host-free; write the equivalent of
   `tests/import-ui-check.mjs` for your sheet: counts shown, registry
   written, reload persistence, re-import = 0 added, demo hidden,
   guide offer). Gates as standard.
8. REPEAT-LESS HOSTS: if your app has no repeat model (or cannot say
   Pace's five repeat strings truthfully), pass
   `repeatModel: "none"` in the planImport opts — every RRULE expands
   into instances inside the window and nothing is promised as a
   live repeat. Never fake a live repeat your app cannot honour:
   a single first-occurrence shape silently loses the series.
9. ISOLATION (Security NS-2 — a fence, not a suggestion): the module
   is handed ONLY the importing user's own space, ever. Dedupe never
   crosses users; the registry lives in the importer's space; a
   malformed file writes nothing anywhere. Your adoption proof must
   include Pace's two-user isolation battery shape
   (`tests/import-isolation-check.mjs`, TU cast in
   `tests/fixtures/users/`): import into B leaves A and C
   byte-identical, and B still receives the full set even when A
   already holds the same calendar.

## The Google sign-in slot

`CI.parseICS` is the only door in v1; the Google OAuth adapter is a
named slot in the design that activates when Ilse creates the OAuth
client — until then the Google source routes to its iCal-link line,
exactly as Pace ships. Do not build your own sign-in.

## Questions

To the Pace desk (this chat) — never a per-app fork. If the module
can't say something truthfully, that's a module fix for everyone.
