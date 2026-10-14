# Pace — audit against the Fit navigation shape (house law, Ilse 14 Oct 15:43)

Audited from the live markup (index.html lines 67–72 + panel code), not
from memory. Clause by clause:

1. **Sidebar hidden on load** — HOLDS. Hidden every load, per-session
   open only (Sidebar Law build, App Checker closed).
2. **One area open at a time** — HOLDS. Six panels (Calendar, Talk to it,
   To do, Habits, Progress, Settings); exactly one is ever on screen.
   Inside Calendar, Month/Week/Day/Year are sub-tabs — one at a time.
3. **Sub-menus inside the area** — HOLDS. Calendar carries its views
   inside itself; Settings carries themes, backup copies and Help +
   privacy inside itself. Nothing outside an area leaks into another.
4. **Unneeded areas tucked away** — HOLDS by shape. Pace has no spare
   areas: all six are main areas in daily use. The low-frequency things
   (look/theme, backup, help) already live one level down in Settings —
   the tuck this law asks for.
5. **Areas GROUPED by main area** — THE ONE DELTA. The sidebar is a flat
   list of six. Six is small, but the law's point is that the eye should
   land by area, not scan a list. Adoption: quiet group labels over the
   existing items — "Plan" (Calendar, Progress), "Lists" (To do,
   Habits), "Add + app" (Talk to it, Settings). Labels only: no new
   taps, no collapsing, no behaviour change, same order.
6. **Overstimulation, beyond navigation** — Pace's standing calm kit:
   low-day mode strips a day to essentials; no badges, no counters, no
   streak pressure; gentle words ("Next", never "overdue"); the Progress
   board shows title + time only per card. Nothing in the audit asks to
   remove any of it.

Adoption sequence: the group labels ride the REBRAND build (one
visual-layer change, one delta-gate round, one AAB rebuild) rather than
their own rebuild on the sealed pace-v9. APPROVED by HQ 14 Oct 15:44 —
"the sealed v9 does not reopen for labels alone"; this audit stands as
the delta of record. Nothing else in the Fit shape is missing from Pace.
