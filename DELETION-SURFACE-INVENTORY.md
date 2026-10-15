# Pace — DELETION SURFACE INVENTORY (accounts wave, per MULTIUSER §10)

Every code path that can remove data, traced to its authority.
An untraceable or system-initiated delete is a FAIL on sight.

## Server-side (Firestore / Auth)
1. **Account deletion sweep** — Settings → Account → Delete my
   account. The user's own deliberate act, password re-checked at
   the door. Deletes, in order: `users/{uid}/data/state`, the
   `users/{uid}` spine, then the Firebase Auth user. IRREVERSIBLE
   and labelled so on the sheet. This is the ONLY whole-account
   door in the system, and the store-required one (§6 of the
   design).
2. Nothing else in the app issues a Firestore DELETE. `_owner`,
   `_comp`, `subscriptions`, `reviews`, `outreach`, `groups` are
   client-read-only or denied outright (firestore.rules) — their
   writes happen at the console/desk, outside the app entirely.

## Device-local
3. **Remove my cached data from this device** — Settings button,
   shown to a signed-out user whose account cache still sits on
   the device. Removes only the local `calmcal-v1:<uid>` copy.
   The account itself is untouched. The user's choice is the only
   deletion (design §4).
4. **Guest pot reset on a consumed upload** — when the §5 door's
   "Bring my things in" succeeds, the shared guest slot is set to
   a fresh guest state. The data is not deleted: it MOVED into
   the account (and its cache). The frozen legacy backup key
   (`calmcal-v1`, pre-accounts builds) is never written or
   removed by any code path.
5. **User content deletes inside the app** (task / to-do / habit
   deletes, clear-done, photo remove) — the user's own hand on
   their own content, each carrying Undo (Law B2), syncing as
   ordinary state writes, never as document deletes.

## By construction absent
- No admin/system/scheduled deletion of user data exists.
- Normalise-on-load REPAIRS (Law B) — including the entry-level
  string heal for todos added in this wave; it converts, never
  drops.
- Sign-out deletes nothing (the cache stays, by design §4).
