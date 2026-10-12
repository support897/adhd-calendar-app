# ADHD Calendar App — Phase 1 Research

Researched 12 Oct 2026. Real sources only; gaps are marked "could not verify", never filled with guesses. No building has started.

Her prompt: PROMPT.md (Fantastical-style calendar; morning 3-level feeling check-in that adapts the day; talk-to-it sidebar turning journal/voice/handwriting/notes into a to-do list; progress sidebar; Apple iPhone intuitive; drag and drop; notifications like Meal Prep, user-chosen; multiple views; computer + phone views; Home Screen install. Her bar: "Best calendar app ever.")

## The short answer
- Fantastical's magic is a layout, not a colour palette: a DayTicker strip on top, synced both ways with the event list below, a month grid one pull away, and one-sentence natural-language entry. Exact fonts/hex values are not published anywhere: could not verify, and none are claimed here.
- The psychology is clear on the shape: externalise memory and time, break everything into small steps, show very little at once, make progress visible, and never shame. The headline feature (feeling level automatically shrinking the day) is a sound design hypothesis built on that evidence, but no RCT proves it yet: the report says so plainly.
- No open-source Fantastical/DayTicker clone exists, and no single app does what her prompt asks. Best base, verified live on GitHub: FullCalendar (MIT, 20,682 stars) as the calendar engine, inside the Meal Prep app's proven PWA + notification shell, with feeling-logic patterns from Momo (MIT) and touch patterns from Planly (MIT), plus chrono-node for natural-language dates, Tesseract.js for handwriting, Web Speech API for voice, and dnd-kit for dragging.

## Contents
1. Fantastical anatomy (§1)
2. ADHD and overwhelm psychology (§2)
3. GitHub base hunt (§3)
4. The phased plan (§4)

---

# §1 Fantastical anatomy

# Fantastical — Aesthetic & Interaction Anatomy (Phase 1 Research)

**Scope / version warning:** Fantastical has changed across v1 (2012) → v2 → v3/v4 (current, v4.2.2 on the App Store listing fetched). Gestures and layout differ by version. Below, **[Current]** = Flexibits official help / App Store today; **[Historical]** = reputable launch reviews. Where they conflict, both are noted — do not copy historical behaviour blindly.
Sources are paraphrased, not quoted.

---

## 1. Layout — the core structure

### 1.1 iPhone: two stacked, synchronised zones **[Current + Historical]**
- Top zone: **DayTicker** (or, pulled down, the month Calendar view). Bottom zone: a **vertically scrolling, chronological event + task list** (the "agenda / list").
- This list is the primary window onto the schedule — early Fantastical had *no* separate day/week/month grid as its home; the list *was* the app. Free time is not shown as empty slots in list view; only events/tasks appear.
  - https://www.macworld.com/article/219839/review-fantastical-for-iphone-shines-despite-ios-caused-limitations.html
  - https://www.macworld.com/article/228683/the-best-calendar-apps-for-iphone-and-ipad.html

### 1.2 DayTicker — the signature strip
- A **horizontally scrolling, effectively infinite strip of days** at the top. In v1 it showed **5 days at once — today centred, 2 before + 2 after** — with today slightly magnified / emphasised so the eye lands on it without searching.
  - https://www.engadget.com/2012-11-29-fantastical-for-iphone-a-fast-good-looking-alternative-to-calen.html
  - https://readwrite.com/fantastical-fixes-the-iphones-calendar/
- **Current official description:** each day in the ticker carries its events as **coloured pills, positioned/sized to show approximately when in the day each event occurs**. Swipe the ticker to move into past/future; it is *connected to the schedule below* — changing the ticker date changes the list.
  - https://flexibits.com/fantastical-ios/help/calendar-views
- Historical v1 detail: under each date there were **colour-coded dots for which calendar an event belongs to, plus duration indicators beneath the date (timed vs all-day)**; the current date was circled, with a red accent border in the v1 design language.
  - https://www.engadget.com/2012-11-29-fantastical-for-iphone-a-fast-good-looking-alternative-to-calen.html
- A secondary description of the ticker notes an **all-day event is shown as a line in the calendar's colour** across that day. Source is a low-authority republication of a review — treat as *review-reported, not official*.
  - https://duwafozadujazak.weebly.com/uploads/1/3/1/3/131380008/dabonotiratokew.pdf

### 1.3 Ticker ⇄ List synchronisation (the key interaction to copy)
Bidirectional, in both directions:
- Swipe/scrub the DayTicker → the list below jumps to that day's events.
- Scroll the event list up/down through days → the DayTicker scrolls horizontally along with it and centres the day currently at the top of the list.
- **Tap the title/header bar (showing month + year) at any time → instantly snap both back to today.**
  - https://www.macworld.com/article/219839/review-fantastical-for-iphone-shines-despite-ios-caused-limitations.html
  - https://9to5mac.com/2012/11/29/review-fantastical-for-iphone-the-calendar-upgrade-ios-6-is-missing/
  - https://www.imore.com/fantastical-comes-iphone-makes-appointment-entry-ridiculously-easy

**Copy spec for the ADHD app:** implement this as one shared `selectedDate` state: ticker scroll, list scroll, and month-grid tap all write to it; all three views re-render from it. Never let ticker and list disagree.

---

## 2. Multiple calendar views — full verified set, and how switching works

### 2.1 The full view set **[Current, official]**

Fantastical today has **two families** of views:

**A. List views (ticker/calendar on top + agenda list below)** — 3 options:
1. **DayTicker view** — ticker strip + list below.
2. **Calendar view** — month grid on top + list below.
3. **Task view** — all tasks in a single view (no ticker).

**B. Full-screen views** — 5 options:
4. **Day** — one day, hour grid, single screen.
5. **Week** — one week, day columns with hour blocks.
6. **Month** — one month, single screen.
7. **Quarter** — 3 months, single screen.
8. **Year** — whole year, single screen, shown as a **heat map** (see §3).

Plus: **Agenda/List is not a separate named full-screen view — it is the list half of DayTicker view and Calendar view**, configurable in Settings (review-reported for v3) to show *all events, only the selected day, or selected day + next day*.
- https://flexibits.com/fantastical-ios/help/calendar-views
- https://apps.apple.com/us/app/fantastical-calendar/id718043190
- https://uploads.strikinglycdn.com/files/7de3fd71-0381-465b-9b09-9ff20d230e03/fantastical_2_review.pdf

### 2.2 How view switching works on iPhone **[Current, official]**
A vertical "pull ladder" from the top zone, plus a menu for the full-screen type:
- **Swipe up on the DayTicker → Task view.**
- **Pull down on the DayTicker → Calendar (month) view** revealed underneath.
- **Pull down again on the Calendar view → the currently selected Full-screen view.**
- **Which full-screen view appears is chosen separately:** tap the **menu icon in the bottom-left** and pick Day / Week / Month / Quarter / Year as the full-screen option.
- **Swipe the month calendar left/right → previous/next month**, synchronised with the list below.
- **Rotate iPhone to landscape → Week view at any time**, regardless of the above.
- Fantastical 3 also added swiping up/down on the top area to cycle DayTicker → Month → full-screen vertical views.
  - https://flexibits.com/fantastical-ios/help/calendar-views
  - https://techcrunch.com/2020/01/29/flexibits-launches-major-fantastical-update/

Historical v1/v2 differences (do **not** copy as current): pull-down *part-way* revealed Search; a second swipe down toggled back to the ticker rather than onward to full-screen.
- https://www.engadget.com/2012-11-29-fantastical-for-iphone-a-fast-good-looking-alternative-to-calen.html
- https://readwrite.com/fantastical-fixes-the-iphones-calendar/

### 2.3 Inside the full-screen views
- **Day / Week:** tap-hold-drag an event to reschedule it; tap-hold an event to reveal **drag handles that resize its duration**.
- **Month:** tap-hold-drag to reschedule also supported.
- **Quarter:** no drag behaviour is stated in official help — **could not verify**.
- **Year:** tap any day to instantly jump to it.
  - https://flexibits.com/fantastical-ios/help/calendar-views

---

## 3. Event list / agenda, colour coding: dots vs pills vs bars vs heat map

Four different marks are used, in four different places — this distinction is the anatomy:

| Place | Mark | Meaning |
|---|---|---|
| DayTicker day cell | **Coloured pill(s)** | An event; pill position/length ≈ its time/duration within the day **[Current official]** |
| Month (Calendar) view day cell | **Coloured dot(s)** | Events exist that day; dot colour = the calendar's colour; number of dots conveys how many events **[Current official]** |
| Year view day cell | **Heat-map shading** | Darker = more events that day, lighter = fewer **[Current official]** |
| Event list row | **Calendar colour on the item** + title, location, start/end time; day breaks separate days **[Historical reviews + current task behaviour]** |

- https://flexibits.com/fantastical-ios/help/calendar-views

Other list rules:
- **Colour always comes from the calendar the event belongs to** (inherited from iCloud/Google/Exchange etc.), not chosen per event by default. **Custom per-event colours are a Premium feature**, as are custom alert sounds and custom home-screen icons.
  - https://apps.apple.com/us/app/fantastical-calendar/id718043190
- **Events and dated tasks are interleaved in the same main list.** A task with only a date sits at the **top of that day (like an all-day event)**; a task with a specific time sits **at that time** in the day.
  - https://flexibits.com/blog/2021/06/user-stories-get-your-tasks-in-fantastical/
- **Availability indicators** (separate from calendar colour, in event detail): solid dot = others see you as "busy"; open circle = "free"; forbidden sign = "unavailable"; dotted circle = "tentative / might be available". Not all calendar services support all four.
  - https://flexibits.com/fantastical-ios/help/calendar-views
- Conference-call events get a **one-tap Join button in the list** when a Zoom/Meet/Webex/Teams link is detected (Premium-era feature).
  - https://techcrunch.com/2024/10/29/popular-calendar-app-fantastical-lands-on-windows/

**Copy spec for the ADHD app:** keep the four-mark system, but re-map colour meaning: pill/dot colour = the app's own category/feeling colour (per Ilse's prompt: auto-assigned colour), *not* a source-calendar colour, since there are no external calendars in v1. Keep Year = heat map by task count — it doubles as a low-shame "busy-ness" overview.

---

## 4. Colours, typography, spacing, themes, backgrounds

**Honest gaps first — could not verify from any official/reputable source:**
- Fantastical's exact **font name, type sizes/weights, hex colour values, or spacing/grid numbers**: **could not verify**. Flexibits publishes no design spec. Any exact pt/hex figure for Fantastical itself would be invented.
- The v1 **red accent** (red border, today circled in red) is verified only for the 2012 design; whether the current app uses the same red as its primary accent: **could not verify**.
  - https://www.engadget.com/2012-11-29-fantastical-for-iphone-a-fast-good-looking-alternative-to-calen.html

**What is verified:**
- **Dark and light themes** exist on iOS; on Mac/Windows the Appearance setting is explicit and 3-way, set **independently for system Light Mode and system Dark Mode**: `Fantastical` = dark sidebar + light calendar, `Light` = light sidebar + light calendar, `Dark` = dark sidebar + dark calendar. Whether iOS uses those same three named options: **could not verify**.
  - https://apps.apple.com/us/app/fantastical-calendar/id718043190
  - http://flexibits.com/fantastical/help/settings
- Reviewers consistently describe the design only in qualitative terms — flat, clean, sharper/brighter colours after the v2 flattening — with **no numeric spec**.
  - https://www.imore.com/fantastical-2-mac-review
- Backgrounds follow the theme (light calendar ground in Light/Fantastical, dark ground in Dark); the early iPhone version put the event list on a **dark background** under the ticker. Current default background per view: **could not verify** beyond the theme rule above.
  - https://9to5mac.com/2012/11/29/review-fantastical-for-iphone-the-calendar-upgrade-ios-6-is-missing/

**Practical implication (our judgement, not a Fantastical fact):** since Ilse's standing rule is "Apple = iPhone brand", use the system font stack (`-apple-system` / SF), iOS semantic colours and a calm type ladder from Apple HIG conventions, and treat Fantastical as a *layout/interaction* reference, not a colour/type specimen. Do not claim any hex/pt is "Fantastical's".

---

## 5. Natural-language input — the parser (UX anatomy)

**[Current, official — Flexibits iOS help "Adding Events and Tasks"]**
- https://flexibits.com/fantastical-ios/help/adding-events-and-tasks

Flow:
1. Tap **`+` (bottom-right in current iOS help**; it was top-right in v1 reviews) → one single text field, **no form, no date pickers, no spinners**.
2. Type (or dictate) **one sentence as you would speak it** → tap **Add**.

What the parser extracts from that one sentence:
- **Title** = whatever is left after all recognised phrases are removed.
- **Date:** today/tomorrow, weekday names and abbreviations (e.g. "fri"), explicit dates, ranges ("from August 9-18"), "in two weeks", holidays (review-reported).
- **Time & duration:** "at 5pm", ranges "5-6pm", "for two hours / for 15 minutes" (review examples); a bare time implies a default 1-hour event in review examples.
- **Recurrence, expressively:** "every Tuesday", "every weekday", "third Thursday of every month", "every weekend", "last weekday of the month", bounded repeats ("Tuesdays and Thursdays … from 1/21 to 2/23", "every Tuesday until 2/5").
- **Location:** phrase after **"at"** → location field, with previous/suggested locations offered.
- **Invitees:** phrase after **"with"** + first letters of a contact name → invitee.
- **Target calendar / task list:** **`/name`** anywhere in the sentence — `/h` selects the "Home" calendar, `/work` the "Work" calendar (prefix matching).
- **Alerts:** trailing phrases like "alert 30 minutes", "alert 1 hour before", "alarm 3PM", "remind me tomorrow at 3PM".
- **Task vs event:** default is an event; start the sentence with **`task` / `todo` / `reminder` / `remind me to`** → a task instead, or flip the event/task toggle switch on the entry screen.
- **Task priority:** trailing exclamation marks — more `!` = higher priority ("…by Thursday!!!").
- **Escape hatch:** wrap text in **quotation marks** to force it into the title and stop the parser eating it (e.g. a title that itself contains a weekday name).
- **URLs pasted into the sentence are auto-extracted** into the event's URL field (MacStories, v1→v2).
  - https://www.macstories.net/reviews/fantastical-2-review/

Live feedback while typing (historical, v1, Macworld):
- The app generated a **live visual preview of the event as interpreted**, and you could drag sideways in the preview to see adjacent appointments, shown as bubbles sized by their duration. Whether the current version's preview looks the same: **could not verify** from official help (the help page documents the sentence rules, not the preview UI).
  - https://www.macworld.com/article/219839/review-fantastical-for-iphone-shines-despite-ios-caused-limitations.html

Premium layer on the parser: **autocomplete recommendations** for invitees, locations, and calendars/task lists while typing.
- https://apps.apple.com/us/app/fantastical-calendar/id718043190

Other UX properties:
- **Dictation is a first-class input** — same sentence, spoken via the keyboard mic / Siri dictation, same parser.
- **Languages parsed: 7** currently — English, French, German, Italian, Japanese, Spanish, Portuguese (v1 had 5, no Japanese/Portuguese).
  - https://apps.apple.com/us/app/fantastical-calendar/id718043190
- **"Show Details" escape:** after/instead of the sentence, a conventional edit form exists for title, location, start/end, repeat specifics, alert, calendar choice, availability, URL, notes. The sentence is the fast path, not the only path.
  - https://www.engadget.com/2012-11-29-fantastical-for-iphone-a-fast-good-looking-alternative-to-calen.html
- Newer additions: **forward an email to Fantastical and built-in extraction creates the event**; **Share Extension** — share text/a web page from another app and Fantastical parses it, auto-attaching a shared Safari URL.
  - https://flexibits.com/fantastical
  - https://flexibits.Com/fantastical-ios/help/widgets

**Copy spec for the ADHD app:** this parser *is* the direct ancestor of Ilse's "talk to it like a person" sidebar. Copy the grammar, not the code: one free-text/voice box, live preview card showing extracted title/date/time/colour before saving, `/list` and task-starter tokens, `!` priority, quote-escape, and a Details fallback. Our version must additionally split one rambling journal/voice note into *many* tasks — Fantastical parses **one sentence → one item**; multi-item splitting is our extension, not a Fantastical feature.

---

## 6. Gestures & scroll behaviours — consolidated table

| Gesture | Effect | Source status |
|---|---|---|
| Swipe DayTicker left/right | Move through days; list follows | Current official |
| Scroll event list vertically | Ticker follows and centres current day | Historical (v1 reviews), consistent with current "connected" description |
| Pull down on DayTicker | Reveal month Calendar view | Current official |
| Pull down on Calendar view | Reveal selected Full-screen view | Current official |
| Swipe up on DayTicker | Enter Task view | Current official |
| Swipe month grid left/right | Previous/next month, synced with list | Current official |
| Tap header / month name | Snap back to today (list, ticker, and full-screen views) | Historical + MacStories iPad |
| Tap a day (ticker/month/year) | Select it / jump to it; list shows that day | Current official |
| Tap-and-hold a day (ticker/month) | Start creating an event for that day | Historical (v1/v2 reviews) |
| Double-tap a day in ticker | Centre that day | Historical, v1 only — could not verify in current help |
| Tap-hold-drag event (Day/Week/Month full-screen) | Reschedule by drag-and-drop | Current official |
| Tap-hold event → handles | Drag handles to change duration | Current official (Day/Week) |
| Drag-and-drop in landscape Week / iPad week | Move events between days/times | Historical (MacStories) |
| Rotate iPhone to landscape | Enter Week view | Current official |
| Pinch in Day/Week full-screen | Zoom hour spacing in/out | Review-reported for v3 only — could not verify officially |
| Pull down part-way (v1) | Reveal Search field (search by title, location, invitees, any event text) | Historical, v1 only |
| Tap-and-hold event in list (v2) | Duplicate / move / share menu | Historical |

- https://flexibits.com/fantastical-ios/help/calendar-views
- https://www.macworld.com/article/219839/review-fantastical-for-iphone-shines-despite-ios-caused-limitations.html
- https://www.macstories.net/?p=34396
- https://uploads.strikinglycdn.com/files/7de3fd71-0381-465b-9b09-9ff20d230e03/fantastical_2_review.pdf

---

## 7. Desktop vs phone layouts

### 7.1 macOS (desktop) **[Current, official]**
Two distinct windows — there is **no DayTicker in current Mac help** (the ticker is a phone invention):
- **Mini Window:** a small popover living in the **menu bar**, summoned by a global keyboard shortcut. Contains: upcoming-events list, the natural-language input field at top, and search/edit/review tools. It can be **detached**, **re-attached**, and **anchored**. Fully keyboard-navigable. Its view is switched via a **menu button in its bottom-left corner**, offering **Day, Week, Month, Quarter, and Task** views *inside the mini window*.
- **Full Calendar Window:** Main calendar area on the right showing **Day / Week / Month / Quarter / Year**; a **left sidebar containing a mini month calendar plus a summary list of all events related to the current view**.
  - https://flexibits.com/fantastical/help/calendar-views
  - https://www.macrumors.com/2015/03/25/fantastical-2-launches-for-mac-with-yosemite-style-redesign-full-calendar-window/

### 7.2 iPhone (phone)
- **Single column only:** ticker/month on top, list below, `+` to add, bottom-left menu to choose the full-screen type. Everything is reached by the pull-ladder and swipes — no sidebar, no second pane. Portrait is the designed orientation; landscape is a bonus Week view only.
  - https://flexibits.com/fantastical-ios/help/calendar-views

### 7.3 iPad (the in-between case)
- **[Current official]** The **DayTicker does not appear on iPad at all.** Instead: the month calendar sits in the **upper-left when the sidebar is visible**, and full-screen views are switched with **Day / Week / Month / Quarter / Year buttons at the top of the screen**.
  - https://flexibits.com/fantastical-ios/help/calendar-views
- **[Historical, v2 iPad "Dashboard"]** Older iPad reviews describe a wider Dashboard with a larger DayTicker, event list bottom-left and month calendar bottom-right all on screen at once.
  - http://www.engadget.com/2014-04-03-fantastical-shines-on-the-ipads-display.html
  - https://www.macstories.net/?p=34396
- Takeaway for our web app: **the pattern that scales with width is "show more panes at once", not "stretch the phone UI"** — phone = ticker *or* month + list stacked; wide screen = sidebar (mini month + summary) + main view side by side, as in current Mac and current iPad.

### 7.4 Windows / other
Flexibits now claims feature/interface parity across Mac, Windows, iPhone, iPad, Watch and Vision Pro. Android details were not verified for this report.
- https://techcrunch.com/2024/10/29/popular-calendar-app-fantastical-lands-on-windows/

---

## 8. Widgets

### 8.1 iOS Home Screen **[Current official]**
- **16 widgets, 3 sizes: small (2×2), medium (2×4), large (4×4).**
- Families: **Icon**, **Date**, **Calendar**, **Up Next**, **Fantastical Action**, **Event List**, **Event List + Date**, **Event List + Calendar**.
  - https://flexibits.Com/fantastical-ios/help/widgets

### 8.2 iOS Lock Screen (iOS 16+) **[Current official]**
Three widget types: Up Next (Inline), Up Next (Circular/Rectangular), Calendar (Rectangular — a basic 3-week calendar), Quick Action (Circular).
  - https://flexibits.Com/fantastical-ios/help/widgets

**Copy spec for the ADHD app:** a web app cannot ship OS widgets — emulate the *job* of the two most-used ones inside the app and as a PWA home-screen shortcut target: an **Up Next card** (next task only, with its feeling-level colour) and an **Event List + Calendar card** (month dots + today's list).

---

## 9. Notifications & other signature touches

- **Alerts:** default alerts auto-applied to new events; alert phrases in the parser; custom alert sounds (Premium).
  - https://apps.apple.com/us/app/fantastical-calendar/id718043190
- **Time to Leave / Travel Time:** if the next located event is **less than 3 hours away**, Fantastical sends a leave-now notification timed from your current location.
  - https://flexibits.com/blog/2021/02/stop-being-late-with-time-to-leave-notifications-and-travel-time/
- **Location-based task alerts:** tasks can fire on **geofences — "when I arrive / when I leave"** a place.
  - https://apps.apple.com/us/app/fantastical-calendar/id718043190
- **Calendar Sets** — named groups of calendars/tasks that can be toggled with one click, auto-switched on location, schedule, or iOS Focus Filter. Directly analogous to Ilse's feeling-levels: one tap (or automatic trigger) re-filters the whole calendar.
  - https://apps.apple.com/us/app/fantastical-calendar/id718043190
- **Weather, woven in:** 3-day forecast free / 10-day Premium.
  - https://apps.apple.com/us/app/fantastical-calendar/id718043190
- **Interesting Calendars**, **event/task Templates**, **Combine Duplicates**, **Hide events without deleting**, **attachments**, **Openings** and **Proposals**, **conference-link detection with Join buttons**, birthdays/anniversaries from contacts, **Handoff**, floating time zones.
  - https://apps.apple.com/us/app/fantastical-calendar/id718043190
  - https://flexibits.com/fantastical

---

## 10. Honestly copyable in a web app vs native-only

**Fully copyable in a web app:**
- DayTicker strip, Ticker ⇄ list ⇄ month three-way sync via one shared selected-date state; tap-header-to-return-to-today.
- All view types: Day, Week, Month, Quarter, Year (heat map), Task, and list/agenda.
- Dots in month view, pills in ticker, heat map in year view.
- Pull-down view ladder with touch/pointer gestures; on desktop substitute sidebar + view-switcher.
- Drag-and-drop reschedule + duration handles in Day/Week/Month.
- The natural-language parser grammar (dates, times, ranges, recurrence, `task` starters, `/list`, `!` priority, alerts, quotes) — rule-based, on-device, no server needed. Live preview card while typing.
- Calendar Sets → re-implemented as **Feeling Levels**.
- Dark/light themes; in-app "Up Next" and "Event List + Calendar" cards as widget emulations.

**Partially copyable (degraded on web):**
- Notifications: web/PWA notifications work when installed, but reliable background delivery, exact-time alarms, and lock-screen presence are weaker than native.
- Dictation: Web Speech API / OS keyboard dictation works in some browsers only — must gracefully fall back to typing.
- Geofence alerts: unreliable from a web app; treat as native-only in practice.
- Calendar sync: web version must use provider APIs rather than reading the phone's calendar database.

**Native-only (do not promise):**
- Real iOS Home Screen and Lock Screen widgets, Apple Watch app, Focus Filters, Handoff, Share Extension, menu-bar Mini Window, Dock Tile / Spotlight Quick Look, system Services menu, and EventKit access.

---

## 11. Gaps — explicitly "could not verify"
- Fantastical's exact font, type sizes/weights, hex palette, spacing values: **could not verify**
- Current version's parser live-preview appearance: **could not verify**
- Whether Quarter view supports drag-and-drop: **could not verify**
- macOS widget catalogue (names/sizes): **could not verify**
- Whether iOS themes use the Mac's 3 named Appearance options: **could not verify**
- Pinch-to-zoom hour spacing in Day/Week: review-reported for v3 only, **could not verify** officially.


---

# §2 ADHD and overwhelm psychology

# ADHD Calendar App — Phase 1 Psychology Research

Evidence key: STRONG = meta-analysis/RCT/replicated; MODERATE = single RCT/small study/consistent clinical guidance; POPULAR PRACTICE = widely used, not proven in trials; COULD NOT VERIFY = no direct evidence found.

Core thesis: the app should be an external executive function system, not a prettier list. Externalise memory, time, sequencing, motivation at the moment of action; show very little at once; capture near zero effort; adapt the day to capacity without punishment.

## 1. Executive function / working memory → external capture, low friction (STRONG)
- ADHD associated with EF deficits (working memory, inhibition, attention): 2024 systematic review/meta-analysis, Neuroscience & Biobehavioral Reviews. https://pubmed.ncbi.nlm.nih.gov/38718988/
- Cognitive Load Theory (Sweller; Paas 2014): working memory for novel info ~4 ± 1 elements, ~30s without rehearsal. A new app has no schemas, so load must be tiny at first.
- Cognitive offloading (Risko & Gilbert; Gilbert et al.): external reminders reliably improve prospective memory; people offload more under higher load. https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0240858 ; http://pmc.ncbi.nlm.nih.gov/articles/PMC11246708/
- Barkley model (MODERATE as framework): ADHD is a problem of doing at the point of performance, not knowing. Externalise info, time, rules, consequences at the place/time of action.
Design: one tap / one utterance capture everywhere (voice, photo of handwriting, journal); capture first, organise later; next action on the home/calendar surface; ONE trusted inbox only; defaults for everything; every required field is working memory tax.

## 2. Task decomposition / chunking, next action only (STRONG)
- Safren et al., JAMA 2010 RCT n=86: CBT with organisation/planning, breaking large tasks into manageable steps, calendar + task list systems beat relaxation+education. http://www.sciencedaily.com/releases/2010/08/100824161434.htm
- BMJ adult ADHD guidance: structured routine, planner/calendar, alarms/timers, break big jobs into smaller stages, reward each step. https://bestpractice.bmj.com/patient-leaflets/en-gb/download/1438269531193/ADHD%20in%20adults:%20strategies%20for%20managing%20daily%20tasks.pdf
- Implementation intentions, Gollwitzer & Sheeran 2006 meta-analysis, 94 studies, N=8,461, d=.65: "If [cue], then I will [action]" plans strongly raise goal achievement. https://www.researchgate.net/publication/37367696_Implementation_Intentions_and_Goal_Achievement_A_Meta-Analysis_of_Effects_and_Processes
Design: AI auto-decomposes dumps into 3 to 7 concrete physical steps under 30 min, verb first; show ONE next action per project in main view, full breakdown one tap away; auto-generate an if-then for step 1; if a step cannot be done in one sitting, split again; drag moves the step, parent goal stays visible in progress sidebar.

## 3. Time blindness → visual time, time blocking, estimates (STRONG deficit / MODERATE fix)
- Marx et al. 2021 meta-analysis, JAACAP, 55 studies: time discrimination (25 studies n~1,633), estimation (8, n~1,024), reproduction (26, n~2,364) deficits. Also Zheng et al. 2022. https://pmc.ncbi.nlm.nih.gov/articles/PMC9962130/
- Visual timers: 2025 Eur J Investig Health Psychol Educ study, children with higher ADHD risk benefited more from a visible Time Timer (rho=0.448, p=.013). Caveat: child, school, small sample. https://www.mdpi.com/2254-9625/15/12/243
- ADDA guidance: external time, timers, alarms, planners checked morning/midday/evening, colour coding. https://add.org/adhd-planner/
Design: time is spatial, day view = vertical timeline, blocks sized by duration, clear now line, time to next task shown; every task gets a duration estimate by default, app does the maths ("needs 20 min, you have 35"); visual countdown for current task only, gentle transition warnings; log planned vs actual quietly to improve suggestions, framed as app learning, never user being wrong (COULD NOT VERIFY strong adult trial that estimate feedback alone recalibrates estimation).

## 4. Overwhelm / choice paralysis → limit visible tasks (STRONG WM limits; MODERATE/context-dependent choice overload)
- Iyengar & Lepper 2000: 24 jams, 3% bought vs 30% with 6 jams.
- Honest counterweight: Scheibehenne et al. 2010 meta-analysis of 50 experiments, mean effect near zero; overload bites when options are unfamiliar, hard to compare, no clear winner, stakes high, unorganised. Chernev et al. 2015 (99 studies) similar moderators.
- An overwhelmed user with an unsorted high-stakes pile is exactly the moderator profile where overload bites.
Design: hard visual budget for Today at the adapted level, rest in Later/Parked (shelved, never lost); app recommends ONE thing next with one short reason; user swaps in one gesture; no settings sprawl at onboarding; app does filters/colour/grouping.

## 5. Energy / mood based planning, no shame rescheduling (POPULAR PRACTICE spoon theory; MODERATE pacing/self-compassion; COULD NOT VERIFY direct RCT of morning feeling → auto shrink list)
- Spoon Theory (Miserandino 2003, lupus): limited daily energy units, tasks cost spoons. Cleveland Clinic describes it as self pacing. No RCT of spoon based scheduling found. https://health.clevelandclinic.org/spoon-theory-chronic-illness
- Self-compassion: ADHD adults report lower self-compassion, partly from higher perceived criticism (Beaton et al., Mindfulness 2020). https://link.springer.com/article/10.1007/s12671-020-01464-w
- Self-Determination Theory: autonomy, competence, relatedness predict motivation; controlling designs undermine it. https://www.tandfonline.com/doi/abs/10.1080/17437199.2020.1718529
Design (her spec exactly): 3 levels, 3 colours, settable check-in time, changeable any time, re-adapts instantly. Plain non-medical names, user renamable (Low / Steady / Full), never "Bad day" in red as judgement.
Default logic before user teaches anything:
- Low: bare minimum only, time-critical plus one tiny completable step; everything else auto-parked with a kind line ("Parked, not dropped."); no decisions needed to shrink the day.
- Steady: normal planned day, visible set capped, breaks included.
- Full: full list available, app may OFFER one stretch item, never push.
Teach-my-levels: user can define own bare minimum vs full versions per recurring task; store a minimum viable version for every recurring task; on Low days the task shrinks to that version instead of vanishing.
Rescheduling is guilt-free: drag to tomorrow/week, or "Not today", zero penalty UI, no overdue counter, no broken chain icon. Language describes capacity, never character.

## 6. Motivation, reward, visible progress, safe streaks (STRONG progress/small wins; MODERATE-STRONG immediate reward; documented HARM from punitive streaks)
- Progress Principle (Amabile & Kramer): ~12,000 diary entries, 238 professionals, 7 companies: progress in meaningful work was the strongest driver of positive inner work life; setbacks hit disproportionately hard.
- Delay aversion / dual pathway (Sonuga-Barke): preference for small-sooner rewards, delay itself aversive. Immediate concrete feedback pulls behaviour; distant abstract payoff does not. https://acamh.onlinelibrary.wiley.com/doi/10.1111/j.1469-7610.2006.01619.x
- Body doubling: POPULAR PRACTICE, weak early evidence (Ara et al. 2025 preprint n=12 VR). Optional only, never a core claim. https://arxiv.org/pdf/2509.12153
- Streak harm: qualitative research documents obsessive attachment, distress and complete abandonment after streak loss (e.g. quitting after losing a 110 day streak). https://arxiv.org/pdf/2203.16175
Design: progress sidebar foregrounds DONE, completed steps stay visible (softly struck through) for the rest of the day instead of vanishing; instant visual confirmation on every completion; count total days/steps done ever and "days you showed up", never an unbroken chain; Low days count as showing up (checking in IS the behaviour); no leaderboards, no XP loss, no avatar damage; weekly look-back = "look what got done", percentages if shown are against the ADAPTED plan, never the ideal full list.

## 7. Morning check-in / affect labelling (MODERATE-STRONG lab/clinic; COULD NOT VERIFY direct ADHD evidence)
- Kircanski, Lieberman & Craske 2012, Psychological Science: labelling emotion in words down-regulates affect; spider-fearful labelling group showed reduced skin conductance at 1 week vs reappraisal/distraction/exposure (self-reported fear did not differ). Lieberman et al. 2007: labelling reduced amygdala response. https://pubmed.ncbi.nlm.nih.gov/22902568/
Design: check-in = one tap on one of 3 colours, optional one word/voice note; mandatory journaling would be skipped on Low days; ask once at user-set time; silent re-check-in any time with no friction; pair the label with the day visibly re-shaping in front of the user; never use check-in data to scold; pattern feedback opt-in and neutral only.

## 8. Voice / brain dump capture (MODERATE expressive writing; STRONG offloading; COULD NOT VERIFY direct ADHD trial of voice dump → auto to-do list)
- Ramirez & Beilock 2011; Park, Ramirez & Beilock 2014: writing about worries improved performance for highly anxious students, interpreted as offloading worry from working memory.
Design: talk-to-it sidebar is a brain dump, not a form: big voice button, journal paste/upload, photo of handwriting/notes, typing, all into ONE inbox, no title/date/category required at capture. AI decomposes, assigns colour/time/duration, caps and orders, phrases non-shaming. Results shown as editable drag-and-drop cards with "here is what I made from that, fix any of it". Originals stay attached to generated tasks so the user can check what they actually said. Tone: warm, brief, progress focused; no toxic positivity, no clinical language.

## 9. What to AVOID (negative design spec)
- Red OVERDUE piles / growing debt counters → neutral Parked/Waiting, resurface one at a time, age shown neutrally if at all, never days-late in red.
- Shame language ("failed, missed, lazy, you still haven't") → capacity + next step only: "Not today, moved to tomorrow." "Here is a smaller version."
- Punitive streaks, hearts/lives, avatar damage, loss badges → cumulative totals, rest-inclusive counts, silent resets.
- Whole list / whole month at once → capped Today, one next action, rest shelved but findable.
- Too many choices per task/screen → app infers colour/time/duration; internal rule of thumb max 3 choices on any routine screen (design rule, not a study finding).
- All-or-nothing days ("0% today") → score the day against the adapted plan for that feeling level; a Low day where bare minimum got done is a SUCCESS.
- Forced positivity / patronising praise → plain specific acknowledgement of real progress.

## 10. Notifications (addendum: user chooses their own, gentle system offered on first open)
Evidence:
- STRONG: external reminders improve prospective memory (offloading literature, §1).
- IMPORTANT NULL: Frontiers in Digital Health 2022, n=109 adults with self-reported ADHD: an extra weekly SMS reminder did NOT improve module completion, logins, or coping practice. More of the same ping is not the answer. https://www.frontiersin.org/article/10.3389/fdgth.2022.821031 → Reminders must be specific, timed to the action, and carry the action inside them, not "You have tasks waiting!".
- MODERATE: Fitz, Kushlev et al. 2019, Computers in Human Behavior, RCT n=237: notifications batched 3x/day → more attentive, productive, better mood, more in control, less stressed vs as-usual; NO notifications gave few benefits and raised anxiety/FOMO. https://www.prosocialdesign.org/library/batching-notifications
- MODERATE: JITAI literature (Hardeman et al. 2019 systematic review): context-aware in-the-moment messages perceived as more timely and followed more than random timed; users liked short graded goals and explanations of why a message fired; disliked frequent inactivity nags and being disturbed. Physical activity, not ADHD: transfer plausible, not proven. https://link.springer.com/article/10.1186/s12966-019-0792-7
- STRONG in clinical systems: alert fatigue, clinicians ignore/override 49% to 96% of alerts in literature summarised by Phansalkar et al. Every low value ping taxes every high value ping.
- Time vs location vs routine: Place-Its (Sohn et al., UbiComp 2005), location reminders useful for most (8/10), false triggers occurred; Brewer, Morris & Lindley 2017 (Microsoft Research): many remembered things fit neither simple time nor location reminders; users prefer routine based reminders, poorly supported by most systems. COULD NOT VERIFY head-to-head ADHD evidence location beats time.
Design: offer 3 trigger kinds, user chosen: (1) time, (2) routine anchor ("after breakfast", "when I get home"), (3) location, OPT-IN ONLY with clear privacy wording. Default time + routine anchor.
Gentle starter set offered on first open, each line independently on/off, each time editable, one screen, plain words:
1. Morning check-in at user's chosen time, once only; if ignored it waits quietly on Today, no repeat ping.
2. Start-of-next-task nudge, only for time-blocked tasks, short lead-in, contains the specific next action + duration.
3. Batched later-today digest, 1 to 2 user-picked windows (default midday + late afternoon): ONE bundled notification, not one ping per task.
4. End-of-day done note, OPT-IN (off in gentlest default): progress framed ("3 steps done, rest parked"), never a list of undone.
Hard rules: total user control in one plain settings screen; "Pause all for today/this week" with no guilt copy; snooze = Done / In 10 min / Later today / Not today, and "Not today" is a full respected answer (no re-ping that task today; cap one snooze follow-up per task per day, design judgement not a tested number); NEVER notify about parked items, Low-day-removed items, overdue age, streak risk, social activity, or re-engagement ("We miss you!"); badge count if enabled = Today items at adapted level only, never total outstanding; gentle default sound with silent-visual option first; if a notification type is repeatedly dismissed, ask once if they want it off/weekly, otherwise quietly reduce frequency, never escalate volume.

## 10 non-negotiables for Phase 2 design
1. Externalise everything: capture, time, sequence, next action outside the head, visible at point of performance. (STRONG)
2. Auto-decompose every dump into small physical steps; one next action; if-then cue on step 1. (STRONG)
3. Time visual and spatial: sized blocks, now line, countdown, durations on everything. (STRONG deficit / MODERATE fix)
4. Cap the visible day; park the rest safely and kindly; app orders and recommends, user overrides in one gesture. (MODERATE, caveated)
5. 3-level check-in drives real adaptation; Low = bare minimum/minimum versions only, scored as success; defaults work day one, user can teach their own versions. (labelling MODERATE; adaptation = untested innovation, say so)
6. Progress is the reward: done stays visible, totals accumulate, nothing punitive can be lost. (STRONG)
7. Brain dump capture in any form; AI does decomposition/colour/time; originals retained; results editable drag-and-drop cards. (mechanism STRONG, pipeline untested)
8. No shame anywhere: language, colours, counters, rescheduling. Rescheduling is a success verb.
9. Body doubling / focus companion: optional extra only, popular practice, weak evidence, never a core claim.
10. Notifications: user-chosen on first open from a gentle batched starter set; specific and actionable; routine/time anchored, location opt-in; one respectful snooze path; strict budget; zero nagging about parked/undone items.

## Explicit gaps: could not verify
- Any RCT of mood/energy adaptive task list shrinking in ADHD (the headline feature).
- Any ADHD RCT of voice brain dump → auto task lists, or JITAI reminders for everyday ADHD task management.
- Any RCT of spoon theory based scheduling (metaphor only).
- Strong adult evidence estimate feedback recalibrates ADHD time estimation.
- Head-to-head ADHD evidence location vs time reminders.


---

# §3 GitHub base hunt

# GitHub Base Hunt — verified live via GitHub public API + raw README/manifest reads, 12 Oct 2026

All stars, forks, licences, languages and pushed_at dates copied from API output. Features not found in repo/README/manifest are marked Not found / could not verify, never assumed.

Scored against: Fantastical look + DayTicker, month/week/day/agenda views, drag and drop desktop + mobile touch, two sidebars (talk-to-it capture; progress done vs left), morning 3-level feeling check-in re-adapting the day, journal/voice/handwriting/notes to auto to-do list with colour + time, Apple iPhone intuitive. Addendum: PWA installable, responsive computer + phone, notifications.

## Shortlist, verified data
| Repo | Stars / Forks | Licence | Last push | Stack | Open issues |
|---|---|---|---|---|---|
| fullcalendar/fullcalendar | 20,682 / 3,718 | MIT (standard bundle; Timeline/Resource views are paid Premium) | 2026-10-06 | TypeScript library | 1,142 |
| jp1337/momo | 10 / 0 | MIT | 2026-10-12 | TypeScript, Next.js 16, React 19, PostgreSQL/Drizzle, Docker | 6 |
| drkokorev/Planly | 6 / 1 | MIT | 2026-10-09 | HTML / vanilla JS, single file, no backend | 0 |
| schedule-x/schedule-x | 2,598 / 182 | MIT | 2026-10-10 | TypeScript library, React/Vue/Svelte/Angular | 57 |
| Illyism/sidejot | 104 / 17 | MIT | 2026-09-06 | TypeScript, Next.js 15, Dexie/IndexedDB, Tailwind | 0 |

## Fit scores (5 = verified present, 0 = absent)
- FullCalendar (library, not an app): Views 5 (dayGrid month, timeGrid day/week, list day/week/month/year = agenda, all MIT core). Drag desktop + touch 5 (built in, resize, long-press delay configurable; external drag-in from a sidebar list is a documented pattern). Sidebar/tasks: none built in, ours to build (an advantage: exactly her two sidebars, no foreign layout to fight). Mood: none, ours. NLP/AI capture: none, pair with chrono. Progress: none, ours from same event store. PWA: 0 in library, 5 achievable with Meal Prep shell. Responsive 4 (phone agenda = list view). Notifications: 0 built in, use Meal Prep checker or Web Push. Adaptation cost LOW to MED: library drop-in, no backend, no auth, static/local-first. Main work = Fantastical/iPhone styling + DayTicker strip.
- Momo (full app): Views 1 (no calendar grid; dashboard/topics/focus; tasks export as iCal feed). Drag 2 (reorders tasks inside a topic only). Sidebar/tasks 5 (topics + subtasks, sequential topics: only first open task eligible, very ADHD; templates break big jobs into steps). Mood/energy 5, CLOSEST MATCH IN THE HUNT: permanent check-in card, high/medium/low energy auto-swaps the Daily Quest for a better matching task, with Undo; topics can set energy levels. NLP/AI 1 (templates/manual). Progress 5 (completion rate per topic, streaks, energy trend chart, level progress, best weekdays). PWA 5 verified (manifest.json display standalone, 192/512 icons, shortcuts; installable, works offline). Responsive 5 (mobile bottom nav; specific fix so task form renders full-height above mobile nav). Notifications 5, BEST IN HUNT: real Web Push (VAPID, no third party) + ntfy option, Daily Quest reminder + opt-in due-today reminder, onboarding step enables notifications. Adaptation cost HIGH as a fork (Next.js 16 + PostgreSQL 18 + Drizzle + Auth.js + Docker, accounts/login); MED as a pattern source (energy logic, push, progress: copy ideas, not stack).
- Planly (full app): Views 2 (day vertical timeline + same-day list, month view on tap; no week or agenda verified). Drag 5, BEST TOUCH PROOF (drag block to new time, pull bottom edge to resize, drag tasks between priorities; touch-oriented). Sidebar/tasks 4 (untimed tasks in user folders, 4 priorities, notes, archive). Mood: none. Progress 3. PWA 5 verified (manifest display standalone + display_override, 192/512 + maskable icons; sw.js versioned offline cache). Responsive 4 (iPhone style, -apple-system, #f2f2f7, portrait, Home Screen install; full desktop layout could not verify, phone-first single file). Notifications 0 (none found). Adaptation cost LOW, leanest real app fork: one HTML file, no accounts, offline-first, optional sync via one access code (Cloudflare KV); rises to MED once week/agenda, feeling logic and talk-to-it sidebar are added.
- Schedule-X (library): Views 3 (month grid, week, day + date picker; no agenda/list verified). Drag 4 (drag, resize, create; touch long-press could not verify as explicitly as FullCalendar). Responsive 5 claimed (README headline). PWA 0 in library, achievable. Notifications 0. Cost MED: cleaner modern look out of the box (easier Fantastical styling) but smaller ecosystem, no agenda, some features are add-on plugins.
- Sidejot (full app): Views 0 (no calendar; today plan + Pomodoro list). Drag 0. Tasks 4 (planner, local-first, tasks broken into 25-min chunks, low cognitive load UI, but no feeling check-in). AI capture 5, BEST AI BREAKDOWN PATTERN: Gemini 2.5 Flash via OpenRouter turns vague goals into specific Pomodoro tasks. Progress 3. PWA 0 (manifest files 404, no service worker evidence). Responsive 3. Notifications 0 found. Cost MED as pattern, HIGH as fork: no calendar at all, AI needs user-supplied OpenRouter API key (paid/key dependency).

## Other candidates checked, why they lost
| Repo | Stars/Forks | Licence | Last push | Why not |
|---|---|---|---|---|
| nhn/tui.calendar | 12,693 / 1,355 | MIT | 2024-06-24 | Solid month/week/day + drag but stale since 2024, heavier older styling |
| bigcalendar/react-big-calendar | 8,761 / 2,301 | MIT | 2026-06-01 | Month/week/day/agenda + drag add-on, but React only, older Google look, drag needs separate add-on |
| manuelernestog/weektodo | 2,182 / 240 | GPL-3.0 | 2025-07-20 | Week-only, Electron focus, GPL copyleft poor fit for possible commercial use |
| mhss1/MyBrain | 2,218 / 193 | GPL-3.0 | 2026-10-03 | Native Android (Kotlin), wrong platform, GPL |
| thatsjet/nudge-app | 23 / 3 | MIT | 2026-03-25 | No calendar/PWA, desktop Electron only. Valuable PATTERN: calm conversational AI for ADHD, ideas filed with energy/size/tags, "what does starting look like?" first step, no badges/streaks/red dots/guilt. Needs Anthropic/OpenAI key |
| ran2207/adhd-planner-ai | 8 / 2 | MIT | 2026-02-06 | Telegram bot demo, not an app: proactive check-ins, chunking, energy tracking (/energy 1-5, low = easy tasks) via Claude API. Borrow feeling-logic wording only |
| wojtekmaj/react-calendar | 3,788 / 529 | MIT | 2026-10-07 | Date picker / month tile component only, no events/tasks/drag/views |
| nagwahoumid/adhd-planner | 2 / 0 | NONE | 2025-12-28 | No licence = no legal right to copy. Excluded on that alone |
Also searched: calendar app (33,343 results), adhd planner (305), adhd task manager (108), mood tracker task planner (38), day planner, calendar PWA planner. One curiosity: shoubhiksaha/AI-PLANNER, 12 stars, MIT, pushed 2026-10-01, privacy-first AI PWA parsing handwritten planner pages/journals into Google Calendar + Notion; too small to base on, pattern look for handwriting flow only.

## Fantastical / DayTicker specific check
No open-source Fantastical clone or DayTicker UI exists to copy. Verified: GitHub search "fantastical calendar" = 42 results, all integrations (MCP servers, Alfred workflows, MailMate bundles; top aplaceforallmystuff/mcp-fantastical, 18 stars, MIT). "DayTicker" = 2 results, both unrelated MQ messaging repos, 0 stars. "dayticker calendar" = 0 results. "fantastical clone" = 64 results, none a calendar UI. DayTicker is Flexibits proprietary: horizontal scrolling date strip centred on today with per-day appointment marks, infinitely scrolling event list below, plus full day/week/month/year views and natural-language creation.
Implication: DayTicker must be hand-built, but it is a THIN layer (horizontal date strip + list) sitting naturally on FullCalendar list/timeGrid views. Budget as original UI on a reused engine. Do not copy Fantastical code or assets (proprietary); re-creating the interaction pattern is the plan.

## Notifications: the Meal Prep pattern to mirror, and honest limits
Read locally at ~/workspace/meal-prep-app/, verified on disk:
- manifest.webmanifest: name/short_name Meal Prep, start_url ., display standalone, white background/theme, SVG icon sizes any.
- service-worker.js: cache mealprep-v1, pre-caches app files on install, skipWaiting + clients.claim, cache-first fetch = offline + fast open.
- app.js registers the service worker (silently caught).
- Offer: on FIRST OPEN, welcome modal has Turn on notifications / Not now; plus a Notifications settings section with status, Turn on, Send a test.
- Permission: Notification.requestPermission(), stored as state.notifications (granted/denied/off); denied shows plain guidance to browser settings.
- Timing maths: logic.js reminderTime(eatTime, cookMinutes, setupMinutes) = eating time minus cook time minus setup time (5 min default). Tested example: eat 6:30pm, cook 30, setup 5 → start 5:55pm.
- Firing: checker every 30 seconds; if now is between start and eat time and not already sent (de-dupe map), fires the Notification.
- Honest limit recorded in its BUILD-LOG.md: "Web notifications fire while the app is installed or open on the device. True background push needs a server and is not included."
Mirror for this app: same manifest + service worker shape; offer on first open; reminders = user-set morning check-in time, plus per task: start = task time minus estimated duration/prep minus setup buffer (default 5 min, same formula shape); same 30-second checker + de-dupe while open/installed.
Honest limits (do not oversell):
1. Local Notification + timer only fires while page/app is open or recently alive; a closed phone app will not reliably wake at 8am.
2. Reliable closed-app reminders need real Web Push: small server holding push subscription + VAPID keys, sending at the right time. Momo already implements this (VAPID, no third party, plus ntfy). Guaranteed morning prompts = Momo push pattern, at the cost of a tiny server.
3. On iPhone, web push requires the PWA installed to Home Screen first (iOS requirement).

## Reusable libraries
| Library | Stars/Forks | Licence | Last push | Use |
|---|---|---|---|---|
| wanasit/chrono (chrono-node) | 5,291 / 392 | MIT | 2026-10-12 | Natural language dates ("tomorrow at 3", "next Monday") for the talk-to-it sidebar. Free, on-device |
| clauderic/dnd-kit | 17,708 / 920 | MIT | 2026-09-12 | Drag and drop toolkit, pointer + touch sensors, for sidebar/day/progress dragging beyond FullCalendar's built-in event drag. Avoid hello-pangea/dnd / react-beautiful-dnd for new work (licence NOASSERTION reported) |
| naptha/tesseract.js | 38,761 / 2,398 | Apache-2.0 | 2026-05-17 | Handwriting/notes photo to text, 100% in-browser OCR, 100+ languages, no server/key. Handwriting accuracy imperfect: needs confirm/correct step |
| Browser Web Speech API (built in) | n/a | n/a | n/a | Voice to text free via SpeechRecognition where supported (Chrome/Android strong; Safari partial, could not verify universal free on-device path) |
| huggingface/transformers.js | 16,342 / 1,200 | Apache-2.0 | 2026-10-11 | Whisper speech-to-text in browser, no server; voice fallback (heavier download). Server-side openai/whisper (110,370 stars, MIT) is NOT free to run (backend/GPU) |
AI task breakdown (journal/rambling to structured to-dos with colour + time): no free key-less solution verified. Proven patterns: Sidejot (Gemini via OpenRouter, user key) and Nudge (Anthropic/OpenAI key). A no-key v1 can do rule-based splitting (one sentence/line = one task) + chrono for times, with the LLM step added when a key is chosen. This is a DECISION POINT for Ilse, not a solved item.

## Recommendation ranking
1. RECOMMENDED: FullCalendar (MIT core) + Meal Prep PWA/notification shell, patterns mined from Momo + Planly. Mirrors the Meal Prep precedent: proven engine, self-contained, no server/keys blocking day one. Only route scoring full marks on views AND desktop + touch drag in one base. Sidebars, DayTicker, feeling logic and progress view are original work on a stable foundation, which they would be in every option because no repo contains them as specified.
2. Momo: best feature-pattern source; fork only if accounts/sync wanted. Closest in spirit (energy check-in auto-swapping the day, real Web Push, PWA, progress stats). HIGH fork cost, no calendar grid.
3. Planly: leanest true app fork. Verified PWA, best touch drag/resize proof, iPhone styling, zero backend. Loses on views (no week/agenda), no mood/AI/notifications.
4. Schedule-X: modern-looking alternative engine; use only if its default look gets closer to Fantastical with less CSS work; gives up agenda view and ecosystem maturity.
5. Sidejot: pattern only (AI breakdown flow). No calendar, no PWA found, needs OpenRouter key.
Avoid as bases: WeekToDo + MyBrain (GPL-3.0), nagwahoumid/adhd-planner (no licence), Nudge + adhd-planner-ai (no calendar/PWA, patterns only).

Bottom line for Phase 2: FullCalendar MIT core inside a Meal Prep-style static PWA shell (manifest, service worker, first-open notification offer, start = task time minus duration minus 5 min setup checker); chrono-node for natural language capture; Tesseract.js for handwriting; Web Speech API for voice (Transformers.js/Whisper fallback); dnd-kit for sidebar/progress dragging; logic patterns from Momo (3-level energy adaptation + Web Push upgrade path) and Planly (touch timeline interactions), with attribution where code is reused; hand-build the DayTicker, because no open-source version exists.


---

# §4 The plan

# The Plan — phases, each with a concrete end result

Her bar: "Best calendar app ever." Base decision (from §3): FullCalendar MIT core in a Meal Prep-style static PWA shell; patterns from Momo (feeling logic, Web Push upgrade) and Planly (touch timeline); chrono-node, Tesseract.js, Web Speech API, dnd-kit. Data on device first (local storage), no server, no keys, no cost for v1. Each phase is finished and tested before the next starts. Anything user-facing passes BOTH gates (Quality for good, Efficiency for lean) before it is called done.

## Phase 2 — Skeleton that runs
Copy the Meal Prep shell pattern into this repo: static app, PWA manifest + service worker (Home Screen install, standalone, offline), FullCalendar MIT core wired in with month / week / day / list (agenda) views, one shared selected-date state. Sample tasks seeded so every view can be proved.
End result: app installs to Home Screen, opens offline, all 4 views show the same sample day correctly on phone width and computer width. Proof: screenshots both widths + view-switch test.

## Phase 3 — Fantastical skin + DayTicker
Hand-build the DayTicker strip (horizontal infinite date strip, today centred, coloured pills per day) synced both ways with the list and month grid; tap header returns to today. Apple iPhone design language throughout (system font, flat grounds, hairline rows, filled-circle today marker, segmented view control). Desktop view = sidebar + main view side by side; phone view = ticker/month on top, list below (never a shrunk desktop).
End result: the app looks and moves like Fantastical's anatomy in §1, judged against it screenshot by screenshot. No AI look.

## Phase 4 — Tasks, drag and drop, progress sidebar
Task model (title, steps, colour, date/time, duration estimate, minimum version, full version). Drag and drop everywhere: events/tasks dragged between days and times in day/week/month, tasks dragged in from the sidebar, duration resized by handles (desktop mouse + phone touch, dnd-kit where FullCalendar drag is not enough). Progress sidebar: tasks grouped by progress (to do / doing / done), done stays visible for the day, totals accumulate, nothing punitive can be lost.
End result: a full day can be planned, rearranged by dragging on phone and computer, and progress is visible at a glance. Proof: drag test on both widths, progress counts match the calendar.

## Phase 5 — Morning check-in + feeling adaptation (the heart)
Check-in at the user's set time: "How are you feeling today?", 3 levels, 3 colours, plain renamable names (Low / Steady / Full by default). Default logic from §2: Low = bare minimum only (time-critical + one tiny step, the rest parked kindly, tasks shrink to their minimum version where one exists); Steady = capped normal day with breaks; Full = full list + one offered stretch item. Changeable any time of day, day re-adapts instantly and visibly. Teach-my-levels: user can set their own minimum vs full version per recurring task.
End result: changing the feeling visibly re-shapes the day in under a second, scored against the adapted plan, with zero shame language anywhere. Proof: same test day shown at all 3 levels.

## Phase 6 — Talk-to-it sidebar (brain dump capture)
One inbox, many doors: typing, voice (Web Speech API, typing fallback), journal paste/upload, photo of handwriting/notes (Tesseract.js OCR with a confirm/correct step; original always kept attached). Rule-based splitting (one line/sentence = one task) + chrono-node natural-language dates/times ("tomorrow at 3", "every Tuesday"), Fantastical grammar copied (task starters, ! priority, /list, live preview card). Auto colour, auto duration estimate, auto decomposition of big vague items into 3 to 7 small verb-first steps with an if-then cue on step 1. Results land as editable cards the user can drag, fix, or delete before/after saving.
Honest limit built into this phase: the smart LLM breakdown (Sidejot/Nudge pattern) needs an AI key and costs money. v1 ships rule-based, which is free and private. The LLM upgrade is a decision for Ilse, filed as a [TASK] in #hq-bridge when this phase starts, never assumed.
End result: speaking or uploading a messy dump produces a clean, coloured, timed to-do list the user can correct in seconds. Proof: 3 real dumps (voice, journal text, handwriting photo) end to end.

## Phase 7 — Notifications, user-chosen
Mirror Meal Prep exactly in shape: offered on first open (Turn on / Not now), one plain settings screen, per-type on/off, per-type times editable. Gentle starter set from §2.10: morning check-in (once, no repeat ping), start-of-next-task nudge (contains the actual next step; start = task time minus duration minus 5 min setup default), batched later-today digest (1 to 2 user-picked windows), end-of-day done note (opt-in, progress framed only). Snooze = Done / In 10 min / Later today / Not today, and Not today is final for that day. 30-second checker + de-dupe while the app is open/installed.
Honest limit stated in the app and here: closed-app guaranteed wake-ups need real Web Push (Momo's VAPID pattern, a tiny server). That is Phase 7b, only if Ilse wants it, filed as a [TASK].
End result: notifications fire on time in a real phone test for the open/installed case, settings change them immediately, and nothing ever pings about parked or undone items.

## Phase 8 — Polish, gates, deploy
Full check against PROMPT.md + her additions, item by item. No-shame language sweep (no failed/missed/overdue-red anywhere), Apple iPhone look final pass, computer + phone proof, accessibility basics (tap targets, contrast). Quality Supervisor gate + Efficiency gate packages sent; fixes looped until both PASS. Deploy live (Vercel, like Meal Prep) and verify the live build matches the gated build.
End result: live link, both gates passed, receipts file (BUILD-LOG.md) in the repo.

## Open decisions for Ilse (filed as [TASK]s in #hq-bridge at the right phase, never blocking earlier phases)
1. Phase 6: AI key for the smart LLM breakdown, or stay rule-based/free?
2. Phase 7b: tiny push server for guaranteed closed-app morning prompts, or Meal Prep-style local notifications enough?
3. Later: external calendar sync (Google/Apple) is native-hard on web (§1.10); v1 is its own calendar. Sync is a future phase only if she asks.
