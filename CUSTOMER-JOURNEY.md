# Pace Calendar — customer journey plan and QA status

## What Pace is for

Pace helps people turn a busy day into a manageable plan. Customers want to start without signing in, choose a pace for the day, add or import tasks, keep loose to-dos nearby, and carry their own data between devices if they choose to sign in. They also need clear limits for reminders, speech, and stored audio.

## Planned customer journeys

1. **Fresh start:** open Pace, see an empty calendar, skip or take the welcome guide, and reach Today without an account.
2. **Plan a day:** choose Low/Steady/Full energy, add a task in one sentence, view it in the calendar, mark it done, reorder it, and carry it over.
3. **Bring a calendar:** import an `.ics` file without changing the original, review imported events, then export an `.ics` file. Test recurring and all-day items; disclose that timed exports use floating local times because Pace does not retain source time zones.
4. **Capture a thought:** write or dictate a note, optionally record and play an audio note, close/reopen the task, and check that the note remains.
5. **Use reminders:** choose reminder settings, grant permission only when asked, schedule, edit, cancel, and check how the app behaves while closed.
6. **Use an account:** create an account, sync data, sign out, sign back in, and confirm a second account on the same device cannot see the first account's tasks.
7. **Fresh-device check:** open the app with clean local storage, sign in, and confirm the account's data returns without another first-run guide.
8. **Recover from failure:** try empty and malformed inputs, offline mode, rejected permissions, interrupted sign-in, and sync errors; each must explain what happened and what to do next.
9. **Small-screen access:** check a 320 CSS-pixel width, keyboard focus, labels, and touch targets of at least 44 CSS pixels.

## QA status (28 October 2026)

- **Passed in browser:** fresh guest start was empty; guide setup and every tab/menu stop were visited; first-task action opened the task form and resumed at calendar import after saving; skip, close, and Settings replay worked; the energy choice changed Today; the guide had no horizontal overflow at 320 CSS pixels and action targets measured at least 44 CSS pixels.
- **Passed with two new QA accounts:** email account creation, sign-out, sign-in, and same-device isolation were exercised. Account A's test task returned after signing in from a fresh localhost origin with no stored session, and account B's data was empty rather than showing A's task. The account records were left in place; no accounts were deleted. This is a browser/origin simulation, not a physical second device.
- **Calendar:** `.ics` import/export round-trip tests cover recurrence, all-day dates, exclusions, and notes; an export download was inspected in the browser. Timed exports remain floating local wall-clock time.
- **Notes/audio:** written-note persistence and the 45-second audio helper tests passed. Real iPhone microphone capture, transcription, and playback remain unverified.
- **Passed in a mock reminder harness:** permission-request wiring plus future check-in, digest, and task nudges; changing the lead-in canceled and replanned nudges; pausing for today removed today's nudge while retaining tomorrow's. Five checks passed with a stubbed Capacitor Local Notifications plugin. No real OS permission or notification was triggered.
- **Passed offline browser smoke:** after the service worker controlled the app, an isolated browser context went offline, reloaded the app shell, and added a local task without page errors. This does not verify physical-iPhone offline behavior.
- **Passed account restoration simulation:** Account A's task returned from a fresh localhost origin with no prior session. Both QA browser sessions were signed out at wrap-up. Account A and B remain in Firebase; neither was deleted. This is not a physical second-device test.
- **Not verified:** actual iPhone notification delivery or permission; Google OAuth; Apple sign-in on web (disabled in Firebase config); native Google/Apple sign-in on a physical iPhone; password-reset email delivery (not sent); physical-iPhone offline recovery; full rejected-permission, malformed-input, interrupted-login, and sync-error journeys. Real iPhone microphone capture, speech recognition, and audio playback also remain unverified.
- **Automated coverage:** `tests/guide-check.mjs` (15 pass), `tests/i18n-check.mjs` (3 pass), `tests/run-tests.mjs` (58 pass), `tests/audio-check.mjs` (10 pass), `tests/export-check.mjs` (16 pass), `tests/import-check.mjs` (28 pass), `tests/import-realistic-check.mjs` (26 pass), and `tests/import-isolation-check.mjs` (8 pass). The mock reminder harness passed 5 checks. Browser scripts that import `/home/hatch/.../playwright-core` cannot run in this Mac checkout; do not count them as executed.

See `~/Apps/_qa/pace-ux-notes.md` for the full evidence and remaining release checks.
