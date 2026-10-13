# Pace — Multi-User design (accounts phase)

Designed 14 Oct 2026 under HQ's Multi-User order (Ilse, 13 Oct 23:56) and the
auth standard in ILSE-STANDARD §5, confirmed by HQ's correction (Ilse's
pick, 13 Oct 23:59, correction relayed 14 Oct): **Firebase Authentication**
— email + code, Google, Apple; the Firebase user id keys every record;
isolation enforced per user. Design only. The build sequences after the
current feature/logo/store line, on HQ's go.

> AMENDED 14 Oct: an earlier draft of this plan named Supabase Auth (from a
> relayed order). HQ's correction withdrew that — Firebase Authentication is
> the service, as §5 has it. The data shape, cache design, migration and
> test battery were vendor-neutral and stand unchanged.

## 1. Where Pace stands today
One document in localStorage (`calmcal-v1`): tasks, feelings, settings,
welcomed, sent, todos, habits — healed by a normalise-on-load repair pass,
never deleted by the system. No server, no accounts. The accounts phase
keeps that engine exactly as it is and gives the document an owner.

## 2. Accounts (Firebase Authentication)
- A NEW Firebase project for Pace alone (projects never mix). Free Spark
  tier covers this scale — $0.
- Sign-in set: **email + code**, **Google**, **Apple** (Apple's rule:
  offering Google means offering Apple on iOS). One honest note on the
  email door: Firebase's built-in passwordless email sign-in is a LINK,
  not a typed code — the plan wires the link door in as route 1. A true
  typed-code email flow needs a small cloud function, which needs the
  Blaze plan + a card on file — Ilse's decision if she ever wants it,
  named here so nobody promises it silently.
- Guest mode stays forever: the app works fully signed-out. Sign-in is
  offered (Settings + the guide), never forced. Store review and Ilse's own
  use both depend on that.

## 3. Data shape — one document per user, Security Rules as the wall
Cloud Firestore, one document per user at `users/{uid}`:
- the document IS the whole Pace state (tasks, feelings, settings, todos,
  habits), exactly the shape the app already heals on load
- `updatedAt` rides inside it, as the app already stamps

Firestore Security Rules allow a read or write only when the signed-in
user's id equals the document's id — ownership is the address:
`match /users/{userId} { allow read, write: if request.auth != null &&
request.auth.uid == userId; }`. A request carrying user A's token against
user B's document is denied by the database itself, not by app code. Why
one document and not per-task collections: the app's proven unit of truth
IS the document — its repair pass, its save(), its exports all speak it.
Splitting it up would rewrite the most trusted code in the app for no
isolation gain; the rules isolate documents either way. The app talks to
Firebase over its plain REST endpoints with the user's own ID token — no
SDK, no new dependency, in keeping with the app's build-free shape. There
is no master key in the client, ever; the rules are the wall.

## 4. localStorage becomes the per-account cache
- Keys: `calmcal-v1:guest` signed-out; `calmcal-v1:<uid>` per account.
  Switching accounts switches documents — nothing bleeds across.
- On sign-in: fetch the user's row → if it exists, it becomes the working
  document (cached locally); if none exists yet, the current document is
  uploaded as their starting state (see §5) — a brand-new account with no
  local data starts EMPTY (Empty-Start Law).
- On every save: write the cache immediately (the app stays instant and
  offline-true), then a debounced write of the document to Firestore when signed in and
  online. Offline changes sync on reconnect; the document carries its own
  updated-at stamp, newest wins. Honest limit: two devices editing the
  same account offline at once resolve last-write-wins at document level
  — acceptable for one person's planner, stated rather than hidden.
- On sign-out: back to the guest document; the account's cache stays on the
  device under its own key (it is that user's own data on their own
  device) — and a "Remove my cached data from this device" button in
  Settings clears it on request (user's choice = the only deletion).

## 5. Migration — nobody loses anything (Never-Delete Law)
- Ilse's existing data: on HER first sign-in, her current document uploads
  as her account's state. Counts proven before/after (tasks, todos,
  habits, feelings) in the build report; the local copy is NOT deleted —
  it stays as the guest document and the cache.
- Same path serves every future user who used Pace signed-out first:
  "Bring your things into your account?" — a copy, never a move.
- The repair pass runs on the server copy on the way in, same as on load:
  wrong shapes are repaired, never dropped (the string-todo heal included).

## 6. Account deletion + export (the user's own choices)
- Settings → Download my data: the document as a JSON file (it already
  exists in memory; this is a button, not a project).
- Settings → Delete my account: Firestore has no cascade, so deletion is
  a built sweep — delete the `users/{uid}` document, then the auth user
  (Firebase requires a recent sign-in for that call; the sheet asks for
  one if needed). The sweep is proven in P4. The stores require this
  door; the Never-Delete Law allows exactly this — the user's own hand
  on their own data.

## 7. What changes in the app (and what does not)
Changes: a sign-in sheet (three doors, icons + short labels, per the
visual law), a Settings account section, the sync layer behind save(),
per-account cache keys, the two Settings buttons in §6, and — in the same
release, not before — the store privacy answers (data now leaves the
device for account holders; the listing must say so).
Does not change: every feature, the local engine, the repair pass, guest
mode, the store package's shape (accounts ship as an app update on top).

## 8. Phases (each ends proven)
- P1 — Project + auth doors: Firebase project created — Needs Ilse: this
  one is hers (the project lives under her Google account; one guided
  sitting, flagged when reached). Email link door + Google live; Apple
  configured (needs the Apple Developer account — pending Ilse's $99;
  Android/web can prove the design before iOS accounts ship).
- P2 — Data layer: the users/{uid} shape + Security Rules; isolation
  proven two ways — rules unit tests in the Firebase emulator (the six
  standard attacks all denied) and live two-account attempts.
- P3 — App wiring: cache keys, sync, migration, sign-in UI, §6 buttons.
- P4 — Gates: Security desk (645b2144) end-to-end attacks WITH QA — the
  two-account battery (UI, direct API, edited-id attempts), offline/online
  sync conflicts, migration counts; then Quality + Efficiency; then QA's
  verdict on the exact build.
- P5 — Store truth: privacy policy + data-safety answers updated, listing
  notes refreshed, resubmission pack. (Submission itself still waits on
  Ilse's developer accounts + keystore, as before.)

## 9. Honest flags
- Apple sign-in cannot be switched on before the Apple Developer account
  exists — P1 proves email + Google first; iOS accounts follow the $99.
- The typed-code email door is the one §5 tension: Firebase's own
  passwordless door is a link. Route 1 (the link, wired into the shell)
  ships on Spark; a true code flow is a Blaze-plan decision for Ilse,
  never a silent substitution.
- Spark limits: Firestore free reads 50k/day, writes 20k/day — writes are
  the binding limit, and the debounced whole-document write is sized for
  it (one write per save burst, not per keystroke). Free projects do not
  pause. The app keeps working offline from cache regardless.
- QA's named seed rides into this phase (from the full-gate verdict,
  14 Oct): a bare-string ENTRY inside the todos array is still dropped by
  the load filter (the field-level string heals). The accounts build adds
  the entry-level heal (string entry → item) with its pinning test.
