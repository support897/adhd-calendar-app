#!/usr/bin/env python3
"""Second team account on the twin pace-test-c00fa, for the
P5 join drive: pace-p5-team2@example.com with a minimal
same-shape state (profileName "Second Tester"). Same REST
shape and clock cure as seed-team-leg.py (spine stamps
backdated 120s; spine written only when missing).
Usage: TZ=Australia/Sydney python3 tools/seed-team2.py
"""
import json
import sys
import time
import urllib.request
from datetime import date

KEY = None  # read from PaceApp.swift, as verify-writes.py does
import os
import re
HERE = os.path.dirname(os.path.abspath(__file__))
APP_SWIFT = os.path.join(HERE, "..", "Sources", "PaceCalendar", "PaceApp.swift")
KEY = re.search(r'options\.apiKey = "([^"]+)"', open(APP_SWIFT).read()).group(1)

PROJECT = "pace-test-c00fa"
EMAIL = "pace-p5-team2@example.com"
# The one team test password of record stands in the door
# test file; read it from there, never a second copy.
DOOR_TESTS = os.path.join(HERE, "..", "Tests", "PaceCalendarUITests",
                          "PaceDoorUITests.swift")
PASSWORD = re.search(r'static let password = "([^"]+)"',
                     open(DOOR_TESTS).read()).group(1)
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


def fields(obj):
    out = {}
    for k, v in obj.items():
        if isinstance(v, str):
            out[k] = {"stringValue": v}
        elif isinstance(v, bool):
            out[k] = {"booleanValue": v}
        elif isinstance(v, (int, float)):
            out[k] = {"doubleValue": v}
        elif v is None:
            out[k] = {"nullValue": None}
        else:
            out[k] = {"stringValue": str(v)}
    return {"fields": out}


def main():
    status, j = call(IDP + "signUp?key=" + KEY,
                     {"email": EMAIL, "password": PASSWORD,
                      "returnSecureToken": True})
    if status != 200:
        status, j = call(IDP + "signInWithPassword?key=" + KEY,
                         {"email": EMAIL, "password": PASSWORD,
                          "returnSecureToken": True})
    if status != 200:
        print("AUTH FAILED", status, json.dumps(j)[:200])
        return 1
    uid, token = j["localId"], j["idToken"]
    print("team2 uid:", uid)

    today = date.today().isoformat()
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    now_ms = int(time.time() * 1000)
    spine_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ",
                              time.gmtime(time.time() - 120))
    state = {
        "tasks": [], "dayOrder": {}, "feelings": {}, "sent": {},
        "todos": [], "habits": [], "goals": [],
        "settings": {
            "checkinTime": "08:00", "wakeTime": "07:00", "windTime": "22:00",
            "names": {"low": "Bad", "steady": "Ok", "full": "Great"},
            "notif": {"perm": "granted", "checkin": True, "start": True,
                      "setup": 5, "digest": False,
                      "digestTimes": ["12:30", "16:30"], "done": False,
                      "doneTime": "20:00"},
            "pausedDate": None,
            "appearance": {"theme": "white", "cute": True, "photo": None,
                           "photoMode": "cover", "bgChoice": "white"},
            "sidebarCollapsed": False,
            "profileName": "Second Tester",
            "guideDone": True,
        },
        "welcomed": True, "imports": [], "updatedAt": now_ms,
    }
    state_json = json.dumps(state)
    s0, _ = call(FS + "users/" + uid, token=token)
    # Spine stamps go as real Firestore timestamps: the twin's
    # v2.6 freshCreate fence requires a timestamp type (proven
    # 2026-11-15: stringValue creates 403; the standing team
    # spine carries timestampValue stamps).
    spine_fields = {"fields": {
        "createdAt": {"timestampValue": spine_iso},
        "lastActiveAt": {"timestampValue": spine_iso},
        "deletedByUser": {"booleanValue": False}}}
    if s0 == 404:
        s1, _ = call(FS + "users/" + uid, spine_fields,
                     token, method="PATCH")
    else:
        s1 = s0
    print("spine write:", s1, "(existed)" if s0 == 200 else "")
    s2, _ = call(FS + "users/" + uid + "/data/state",
                 fields({"stateJson": state_json, "updatedAt": now_iso}),
                 token, method="PATCH")
    print("state write:", s2)
    print("today:", today)
    return 0 if (s1 == 200 and s2 == 200) else 1


if __name__ == "__main__":
    sys.exit(main())
