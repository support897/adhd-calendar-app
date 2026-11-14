#!/usr/bin/env python3
"""Team-leg seed for Pace native P2 — TWIN ONLY (pace-test-c00fa).

Creates the team test account over REST (the web battery's proven
route, pace-b39/tests/accounts-live-api.mjs) and writes the spine +
a same-shape seeded state doc: users/{uid}/data/state holding
{stateJson, updatedAt} exactly as the shipped app writes them.

TEST account on the TEST project: pace-p2-team@example.com.
Nothing here touches the production project pace-app-calendar.

Run BEFORE the team-leg UI drive, the same day — the seeded
tasks stand on "today" (local date at run time).
Prints uid + today for the build note; verifies by read-back.
"""
import json
import sys
import time
import urllib.request
import urllib.error
from datetime import date, timedelta

KEY = "AIzaSyDtzBATSYj-pbQiBipcj4rZ6G6lx66TRhg"
PROJ = "pace-test-c00fa"
EMAIL = "pace-p2-team@example.com"
PASSWORD = "Pace-Team-2026!"
IDP = "https://identitytoolkit.googleapis.com/v1/accounts:"
FS = ("https://firestore.googleapis.com/v1/projects/" + PROJ +
      "/databases/(default)/documents/")


def call(url, body=None, token=None, method=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method or
                                 ("POST" if data else "GET"))
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def fields(obj):
    out = {}
    for k, v in obj.items():
        if isinstance(v, str):
            out[k] = {"stringValue": v}
        elif isinstance(v, bool):
            out[k] = {"booleanValue": v}
        else:
            out[k] = {"integerValue": str(v)}
    return {"fields": out}


def main():
    status, j = call(IDP + "signUp?key=" + KEY,
                     {"email": EMAIL, "password": PASSWORD,
                      "returnSecureToken": True})
    if status != 200:
        # Already created on an earlier run — sign in instead.
        status, j = call(IDP + "signInWithPassword?key=" + KEY,
                         {"email": EMAIL, "password": PASSWORD,
                          "returnSecureToken": True})
    if status != 200:
        print("AUTH FAILED", status, json.dumps(j)[:200])
        return 1
    uid, token = j["localId"], j["idToken"]
    print("team uid:", uid)

    today = date.today().isoformat()
    end_g1 = (date.today() + timedelta(weeks=8)).isoformat()
    end_g2 = (date.today() + timedelta(weeks=12)).isoformat()
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    now_ms = int(time.time() * 1000)
    # Spine creates are fenced by the twin's freshCreate rule:
    # createdAt must be <= the server's request.time and at most
    # 5 minutes old. This box's clock runs ahead of Google's, so
    # a "now" stamp lands in the server's future and the create
    # is refused (proven 14 Nov: 403 at "now", 200 at -120s).
    # The web client stamps with the server clock and is
    # unaffected. Backdate the spine stamps inside the window.
    spine_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ",
                              time.gmtime(time.time() - 120))

    def task(**kw):
        base = {"steps": [], "skipDates": [], "doneDates": [],
                "remind": None, "repeat": None, "icon": "",
                "status": "todo", "priority": 0, "essential": False,
                "source": "manual", "minVersion": "", "fullVersion": "",
                "originalText": ""}
        base.update(kw)
        return {k: v for k, v in base.items() if v is not None or k in
                ("remind", "repeat")}

    state = {
        "tasks": [
            task(id="t1", title="Morning shift at the café", date=today,
                 time="09:00", durationMin=240, category="work",
                 color="#5B6BD5"),
            task(id="t2", title="Gym clean", date=today, time="13:15",
                 durationMin=45, category="clean", color="#F0A868"),
            task(id="t3", title="Read two chapters", date=today,
                 time=None, durationMin=25, category="other",
                 color="#AEB8EC", goalId="g1", source="goal"),
        ],
        "dayOrder": {today: ["t1", "t2", "t3"]},
        "feelings": {},
        "sent": {},
        "todos": [{"id": "td1", "text": "Buy milk", "done": False,
                   "calTaskId": None}],
        "habits": [
            {"id": "h1", "name": "Stretch", "icon": "star", "days": {},
             "plan": "", "tiny": ""},
            {"id": "h2", "name": "Vitamins", "icon": "star", "days": {},
             "plan": "", "tiny": ""},
        ],
        "goals": [
            {"id": "g1",
             "title": "Learn French so I can chat with locals in Paris next spring",
             "start": today, "end": end_g1, "pace": "daily"},
            {"id": "g2", "title": "Save for a little campervan",
             "start": today, "end": end_g2, "pace": "daily"},
        ],
        "settings": {
            "checkinTime": "08:00", "wakeTime": "07:00",
            "windTime": "22:00",
            "names": {"low": "Bad", "steady": "Ok", "full": "Great"},
            "notif": {"perm": "granted", "checkin": True, "start": True,
                      "setup": 5, "digest": False,
                      "digestTimes": ["12:30", "16:30"], "done": False,
                      "doneTime": "20:00"},
            "pausedDate": None,
            "appearance": {"theme": "white", "cute": True, "photo": None,
                           "photoMode": "cover", "bgChoice": "white"},
            "sidebarCollapsed": False,
            "profileName": "Team Tester",
            "guideDone": True,
        },
        "welcomed": True,
        "imports": [],
        "updatedAt": now_ms,
    }
    state_json = json.dumps(state)

    # The app's exact first writes (battery-proven shapes).
    # createdAt is write-once under the rules, so only write the
    # spine when it is missing (a re-run's fresh stamp would be
    # refused by the write-once fence — by design, not a fault).
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

    s3, doc = call(FS + "users/" + uid + "/data/state", token=token)
    ok = (s3 == 200 and
          doc.get("fields", {}).get("stateJson", {}).get("stringValue")
          == state_json)
    print("read-back verify:", "OK" if ok else "MISMATCH", s3)
    print("today:", today)
    return 0 if (s1 == 200 and s2 == 200 and ok) else 1


if __name__ == "__main__":
    sys.exit(main())
