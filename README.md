# Pace Calendar

Pace is a calm day planner for people who want a clear next step. It combines a calendar, a separate to-do list, goals that become one small step a day, habits with a weekly view and forgiving streaks, energy check-ins, searchable task icons and colours, calendar import/export, task notes, optional audio notes, speech-to-text, and reminder settings.

## Your data

When you use Pace without signing in, your calendar and settings stay in local app storage on this device. When you sign in, Pace saves your data under your account in Google Firebase so it can sync to another device. This includes task notes and optional audio notes. Sign-in and sync need an internet connection.

Pace does not use advertising or analytics. Speech-to-text uses the browser or device speech service. Audio notes are optional and limited to 45 seconds; the app blocks a recording if saving it would make the calendar too large to sync.

## Limits to know

- Timed iCalendar exports use floating local wall-clock times. Pace does not retain an event's original time zone, so an imported event may shift when opened in a different time zone.
- The repository includes a Capacitor Local Notifications bridge, but real iPhone scheduling and closed-app delivery still need device testing.
- Web Apple sign-in is not enabled in the current Firebase config. Native Apple sign-in is configured in the iOS wrapper, but has not been verified on a physical iPhone.
- Real microphone recording/playback and speech recognition on iPhone are not verified here.

## Project files

`index.html`, `styles.css`, `app.js`, `logic.js`, `calendar-import.js`, `calendar-export.js`, and `audio-notes.js` contain the app. `store/` holds the Capacitor iOS wrapper. Tests and sample calendar files are in `tests/`.

The customer-journey plan and current QA results are in `CUSTOMER-JOURNEY.md` and `~/Apps/_qa/pace-ux-notes.md`.
