#!/usr/bin/env python3
"""REST read-back proof for the P3 write kinds (the twin half
of the write ruling): after the in-app drives have run on the
twin pace-test-c00fa, sign in as the team user over REST and
verify, on the server document itself:
  1. the document still carries EXACTLY the two fields of
     record (stateJson, updatedAt);
  2. feelings[today] == "full" (the check-in drive's last
     answer);
  3. the two events added through the app's own sheet stand
     in tasks ("Dentist check", "Long paperwork");
  4. the seeded things still stand (nothing dropped by the
     whole-document writes — the raw round trip held).
Run AFTER the UI drives, the same day as the seed.
Usage: TZ=Australia/Sydney python3 tools/verify-writes.py
"""
import json
import sys
import time
import urllib.request
from datetime import date

# The twin's WEB config of record stands in PaceApp.swift's
# twin branch; the team password stands in the door test
# file. Both are read from those files of record here, so
# this script carries no second copy of either value.
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
APP_SWIFT = os.path.join(HERE, "..", "Sources", "PaceCalendar", "PaceApp.swift")
DOOR_TESTS = os.path.join(HERE, "..", "Tests", "PaceCalendarUITests",
                          "PaceDoorUITests.swift")
KEY = re.search(r'options\.apiKey = "([^"]+)"',
                open(APP_SWIFT).read()).group(1)
EMAIL = "pace-p2-team@example.com"
PASSWORD = re.search(r'static let password = "([^"]+)"',
                     open(DOOR_TESTS).read()).group(1)
PROJECT = "pace-test-c00fa"

IDP = "https://identitytoolkit.googleapis.com/v1/accounts:"
FS = ("https://firestore.googleapis.com/v1/projects/" + PROJECT +
      "/databases/(default)/documents/")


def call(url, payload=None, token=None, method=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method or
                                 ("POST" if data else "GET"))
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def main():
    status, j = call(IDP + "signInWithPassword?key=" + KEY,
                     {"email": EMAIL, "password": PASSWORD,
                      "returnSecureToken": True})
    if status != 200:
        print("AUTH FAILED", status)
        return 1
    uid, token = j["localId"], j["idToken"]

    status, doc = call(FS + "users/" + uid + "/data/state", token=token)
    if status != 200:
        print("READ FAILED", status)
        return 1
    fields = doc.get("fields", {})
    names = sorted(fields.keys())
    print("doc fields:", names)
    ok = names == ["stateJson", "updatedAt"]

    state = json.loads(fields["stateJson"]["stringValue"])
    today = date.today().isoformat()
    feeling = (state.get("feelings") or {}).get(today)
    print("feelings[%s]:" % today, feeling)
    ok = ok and feeling == "full"

    titles = [t.get("title") for t in state.get("tasks", [])]
    print("task titles:", titles)
    for want in ["Dentist check", "Long paperwork",
                 "Morning shift at the café", "Gym clean",
                 "Read two chapters"]:
        present = want in titles
        print("  task stands:", want, present)
        ok = ok and present

    added = [t for t in state["tasks"] if t.get("title") == "Dentist check"]
    if added:
        t = added[0]
        shape_ok = (t.get("date") == today and t.get("status") == "todo"
                    and t.get("skipDates") == [] and t.get("doneDates") == []
                    and t.get("source") == "manual")
        print("added task shape of record:", shape_ok)
        ok = ok and shape_ok

    stamp = state.get("updatedAt")
    print("state updatedAt (epoch ms):", stamp,
          "is number:", isinstance(stamp, (int, float)))
    ok = ok and isinstance(stamp, (int, float))
    print("VERIFY:", "OK" if ok else "MISMATCH")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
