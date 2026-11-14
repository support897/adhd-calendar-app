#!/usr/bin/env python3
"""REST read-back proof for the P4 write kinds (3-7), after
tools/seed-team-leg.py + the P4UITests drive, same day:
  kind 3 task tick:   tasks[t2 "Gym clean"].status == done,
                      doneOn == today
  kind 4 todo done:   todos[td1 "Buy milk"].done == true
  kind 5 todo add:    a todo "Water the plants" stands
  kind 6 habit tick:  habits[h1 "Stretch"].days[today] true
  kind 7 habit add:   (driven at P4 gate round if wanted;
                      not part of this drive)
Also: the doc still carries exactly the two fields.
Usage: TZ=Australia/Sydney python3 tools/verify-writes-p4.py
"""
import json
import os
import re
import sys
import urllib.request
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
APP_SWIFT = os.path.join(HERE, "..", "Sources", "PaceCalendar", "PaceApp.swift")
DOOR_TESTS = os.path.join(HERE, "..", "Tests", "PaceCalendarUITests",
                          "PaceDoorUITests.swift")
KEY = re.search(r'options\.apiKey = "([^"]+)"', open(APP_SWIFT).read()).group(1)
PASSWORD = re.search(r'static let password = "([^"]+)"', open(DOOR_TESTS).read()).group(1)
EMAIL = "pace-p2-team@example.com"
PROJECT = "pace-test-c00fa"
IDP = "https://identitytoolkit.googleapis.com/v1/accounts:"
FS = ("https://firestore.googleapis.com/v1/projects/" + PROJECT +
      "/databases/(default)/documents/")


def call(url, payload=None, token=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data,
                                 method="POST" if data else "GET")
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
    ok = sorted(fields.keys()) == ["stateJson", "updatedAt"]
    print("doc fields two of record:", ok)
    state = json.loads(fields["stateJson"]["stringValue"])
    today = date.today().isoformat()

    tasks = {t["id"]: t for t in state.get("tasks", [])}
    t2 = tasks.get("t2", {})
    print("kind3 t2 status/doneOn:", t2.get("status"), t2.get("doneOn"))
    ok = ok and t2.get("status") == "done" and t2.get("doneOn") == today

    todos = {t.get("id"): t for t in state.get("todos", [])}
    td1 = todos.get("td1", {})
    print("kind4 td1 done:", td1.get("done"))
    ok = ok and td1.get("done") is True
    added = [t for t in state.get("todos", []) if t.get("text") == "Water the plants"]
    print("kind5 todo added:", len(added) == 1)
    ok = ok and len(added) == 1

    habits = {h["id"]: h for h in state.get("habits", [])}
    h1days = (habits.get("h1", {}).get("days") or {})
    print("kind6 h1 days[today]:", h1days.get(today))
    ok = ok and h1days.get(today) is True

    print("VERIFY P4:", "OK" if ok else "MISMATCH")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
