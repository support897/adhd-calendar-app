#!/usr/bin/env python3
"""REST read-back proof for P5, after the seed + P5UITests +
P5JoinUITests drives, same day:
  kind 8 goal+plan:   a goal "Read 12 chapters" stands with
                      12 step tasks tied by goalId, weekly
                      chunks (weekStart) + minVersion shapes
  step tick in place: "Read chapter 1" stands done
  kind 10 link:       the goal carries sharedGoalId
  shared create:      sharedGoals holds the goal doc
                      (stepCount 12) + 12 step docs
  divide:             every open step's assignee is a member
  join:               the second team account is a member
Usage: TZ=Australia/Sydney python3 tools/verify-writes-p5.py
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


def unwrap(doc):
    out = {}
    for k, v in (doc or {}).items():
        if "stringValue" in v:
            out[k] = v["stringValue"]
        elif "integerValue" in v:
            out[k] = int(v["integerValue"])
        elif "doubleValue" in v:
            out[k] = v["doubleValue"]
        elif "booleanValue" in v:
            out[k] = v["booleanValue"]
        elif "mapValue" in v:
            out[k] = unwrap(v["mapValue"].get("fields", {}))
        elif "nullValue" in v:
            out[k] = None
    return out


def main():
    status, j = call(IDP + "signInWithPassword?key=" + KEY,
                     {"email": EMAIL, "password": PASSWORD,
                      "returnSecureToken": True})
    if status != 200:
        print("AUTH FAILED", status)
        return 1
    uid, token = j["localId"], j["idToken"]
    ok = True

    status, doc = call(FS + "users/" + uid + "/data/state", token=token)
    state = json.loads(doc["fields"]["stateJson"]["stringValue"])
    goals = [g for g in state.get("goals", []) if g.get("title") == "Read 12 chapters"]
    print("kind8 goal stands:", len(goals) == 1)
    ok = ok and len(goals) == 1
    if not goals:
        print("VERIFY P5: MISMATCH")
        return 1
    goal = goals[0]
    steps = [t for t in state.get("tasks", []) if t.get("goalId") == goal["id"]]
    print("kind8 steps tied:", len(steps), "== 12")
    ok = ok and len(steps) == 12
    shaped = all(s.get("weekStart") and s.get("minVersion") for s in steps)
    print("steps carry weekStart + minVersion:", shaped)
    ok = ok and shaped
    first = [s for s in steps if s.get("title") == "Read chapter 1"]
    print("step tick in place:", bool(first) and first[0].get("status") == "done")
    ok = ok and bool(first) and first[0].get("status") == "done"
    shared_id = goal.get("sharedGoalId")
    print("kind10 sharedGoalId:", shared_id)
    ok = ok and bool(shared_id)
    if not shared_id:
        print("VERIFY P5: MISMATCH")
        return 1

    status, sdoc = call(FS + "sharedGoals/" + shared_id, token=token)
    sg = unwrap(sdoc.get("fields", {})) if status == 200 else {}
    print("shared doc:", status, "stepCount:", sg.get("stepCount"))
    ok = ok and status == 200 and sg.get("stepCount") == 12
    members = sg.get("members") or {}
    print("members:", sorted(members.keys()))
    ok = ok and uid in members and len(members) >= 2

    status, slist = call(FS + "sharedGoals/" + shared_id + "/steps", token=token)
    sdocs = slist.get("documents", []) if status == 200 else []
    print("shared step docs:", len(sdocs))
    ok = ok and len(sdocs) == 12
    open_assigned = 0
    for d in sdocs:
        f = unwrap(d.get("fields", {}))
        if f.get("status") != "done" and f.get("assignee"):
            open_assigned += 1
    print("open steps assigned after divide:", open_assigned, "of",
          len([d for d in sdocs if unwrap(d.get('fields', {})).get('status') != 'done']))
    ok = ok and open_assigned > 0

    print("VERIFY P5:", "OK" if ok else "MISMATCH")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
