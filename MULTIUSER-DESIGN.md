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
request.auth.uid == userId; }` — shipped with the explicit catch-all the
other apps carry, `match /{document=**} { allow read, write: if false; }`
(Firestore denies unmatched paths by default anyway; the line is there so
a reader sees the wall is complete). A request carrying user A's token against
user B's document is denied by the database itself, not by app code. Why
one document and not per-task collections: the app's proven unit of truth
IS the document — its repair pass, its save(), its exports all speak it.
Splitting it up would rewrite the most trusted code in the app for no
isolation gain; the rules isolate documents either way. The app talks to
Firebase over its plain REST endpoints with the user's own ID token — no
SDK, no new dependency, in keeping with the app's build-free shape. There
is no master key in the client, ever; the rules are the wall.
The ceiling, named (Security desk PC-3): Firestore caps a document at
~1 MiB. Today's measured Pace state is 3,306 bytes seeded (8 tasks) — a
heavy year of real use lands around 100–300 KB, so the ceiling is roughly
2,000+ full task records away. The sync layer carries a size watch (a
quiet Settings note past ~800 KB), and the named answer for a heavy user's
far-off day is the slices path — feelings history splits into
`users/{uid}/slices/{yyyy}` documents under the same rules — designed on
paper here, built only if the watch ever fires.

## 4. localStorage becomes the per-account cache
- Keys: `calmcal-v1:guest` signed-out; `calmcal-v1:<uid>` per account.
  Switching accounts switches documents — nothing bleeds across.
- On sign-in: fetch the user's document → if it exists, it becomes the
  working document (cached locally); if none exists yet, the guest-upload
  door in §5 decides what happens — never a silent upload. A brand-new
  account with no local data starts EMPTY (Empty-Start Law).
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

## 5. Migration — the guest-upload door (Never-Delete Law + Security PC-1)
The guest document is a shared pot on a shared device, so the upload door
is narrow by design — the standard's shape (ILSE-STANDARD S5.4, as Meal
Prep's design carries it):
- The offer appears ONLY when all three hold: the account has no server
  document yet; a guest document with content exists on this device; and
  this device carries no consumed stamp from an earlier import.
- It is an explicit yes: "Bring your things into your account?" — never
  automatic, never pre-ticked.
- On success the pot is CONSUMED: the upload lands in the account (and
  stays on the device as that account's own cache), the guest slot is
  cleared to a fresh empty guest state, and a consumed stamp is written on
  the device. The next person who signs in on this device is offered
  nothing and starts empty — user A's things can never become user B's
  starting state. Nothing of A's is lost: the data lives in A's account;
  the clearing empties only the shared guest pot A just claimed.
- On failure (offline, server error) the pot stays fully intact and the
  offer can be retried safely — the stamp is written only after the
  server confirms the write.
- Ilse's own first sign-in runs through this same door: counts proven
  before/after (tasks, todos, habits, feelings) in the build report.
- The repair pass runs on the server copy on the way in, same as on load:
  wrong shapes are repaired, never dropped (the string-todo heal included).

## 6. Account deletion + export (the user's own choices)
- Settings → Download my data: the document as a JSON file (it already
  exists in memory; this is a button, not a project).
- Settings → Delete my account: Firestore has no cascade, so deletion is
  a built sweep — delete the state document, the `users/{uid}` spine,
  the aggregate shards (`aggSignups/{uid}`, `aggImports/{uid}` — the
  v2.2 carve-out: erasure takes the shard, Security ruling 15 Oct),
  then the auth user (Firebase requires a recent sign-in for that
  call; the sheet asks for the password). `aggSubs` stays out — a
  payment-path record under its own retention policy. The stores
  require this door; the Never-Delete Law allows exactly this — the
  user's own hand on their own data.

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
- P2 — Data layer: the users/{uid} shape + Security Rules. Proof, per the
  amended standard v1.1 (Security desk PC-2 — the emulator route does not
  run in this environment): an auditor static review of the exact rules
  text, plus the live battery on a dedicated TEST project (the six
  standard attacks, two real accounts, all denied).
- P3 — App wiring: cache keys, sync, migration (the §5 door, consumed
  stamp included), sign-in UI, §6 buttons.
- P4 — Gates: Security desk (645b2144) end-to-end attacks WITH QA — the
  two-account battery (UI, direct API, edited-id attempts), the
  guest-upload battery (after A's import, a fresh B on the same device is
  offered nothing and starts empty), offline/online sync conflicts,
  migration counts, and a rules-diff step (the shipped rules text diffed
  against the P2-reviewed text — byte-identical, or the phase re-opens);
  then Quality + Efficiency; then QA's verdict on the exact build.
- THE SEAL (HQ standing gate, Ilse's order 14 Oct 14:45): the accounts
  phase seals ONLY on the passed multi-user battery, all three legs —
  (1) Security's two-account separation battery above; (2) the saved-data
  leg: each account's data proven intact after sign-out/sign-in round
  trips AND through the repair path (a poisoned account document heals on
  load, never drops) — counts in == counts out, per account; (3) QA's
  multi-user end-to-end journeys on the exact build. No partial seal.
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

## §10 — The standing test cast (Security spec, 14 Oct 2026)

Three synthetic users + the demo session, per Security's TEST-PLAN:
TU-A (content-rich — the victim in attack cases) · TU-B (second user /
attacker) · TU-C (personalisation contrast). Identities under accounts:
sec-pace-a@example.com / sec-pace-b@example.com / sec-pace-c@example.com,
display names "Test User A/B/C" — plainly synthetic, never real people,
never real data. Residency for Pace: standing accounts in the TEST
project, minted at P2 when HQ calls the build; credentials are created
through the app's own doors and live only in the running desk's
handling — never in repos, reports, or chat. The demo session is the
fourth identity (anonymous auth, its own users/{uid} space, excluded
from the SAVED leg by recorded decision).

Build-side preparation (done 14 Oct, ahead of the build): the cast's
seeded states live in tests/fixtures/users/ (tu-a/b/c.state.json —
content marked TEST in the seed itself; A holds tasks + an import
registry, B is sparse, C carries the contrast look). The import
isolation battery (tests/import-isolation-check.mjs, 8 checks, NS-2)
runs against them today at the module level; the PZ legs (own world /
no bleed / server-side choices) execute against the real accounts when
the phase lands, with QA's journey halves driving TU-C. The accounts
phase also files Pace's DELETION SURFACE INVENTORY (DSI): every code
path that can delete server-side data, each traced to a user's own
deliberate action — the store-required account deletion (the §5 sweep)
is the only whole-account door; an untraceable or system-initiated
delete path is a FAIL on sight, per the standard.
