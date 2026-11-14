#!/usr/bin/env python3
"""REST read-back proof for P6, after the seed + P6UITests:
  talk parse:  a task "Call mum" stands with tomorrow's
               date, time 15:00, durationMin 20, source
               "capture" — read from her words on device
  kind 11:     settings.profileName == "Team Renamed" and
               settings.appearance.theme == "dark"
Usage: TZ=Australia/Sydney python3 tools/verify-writes-p6.py
"""
import json
import os
import re
import sys
import urllib.request
from datetime import date, timedelta

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
    state = json.loads(doc["fields"]["stateJson"]["stringValue"])
    ok = True

    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    mums = [t for t in state.get("tasks", []) if t.get("title") == "Call mum"]
    print("talk task stands:", len(mums) == 1)
    ok = ok and len(mums) == 1
    if mums:
        t = mums[0]
        print("  date/time/duration/source:", t.get("date"), t.get("time"),
              t.get("durationMin"), t.get("source"))
        ok = ok and t.get("date") == tomorrow and t.get("time") == "15:00" \
            and t.get("durationMin") == 20 and t.get("source") == "capture"

    settings = state.get("settings", {})
    print("kind11 profileName:", settings.get("profileName"))
    ok = ok and settings.get("profileName") == "Team Renamed"
    theme = (settings.get("appearance") or {}).get("theme")
    print("kind11 theme:", theme)
    ok = ok and theme == "dark"

    print("VERIFY P6:", "OK" if ok else "MISMATCH")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
