#!/bin/bash
# Pace finished-build drive — runs ON the Mac, detached, one
# STAGE per call: build | door | p3 | p4 | p5 | p6p7 | full.
# Progress lands in ~/pace-native-build/drive-<stage>.log.
# Own sim "Pace Builder" — sim B is QA's, never touched.
# The desk re-seeds the twin between stages (the seed dates
# the state "today"; each write-proof group starts fresh).
STAGE="${1:?stage required}"
cd ~/pace-native-build || exit 1
exec >> "drive-$STAGE.log" 2>&1
echo "STAGE $STAGE START $(date)"

SIM=$(xcrun simctl list devices | grep "Pace Builder" | grep -o "[0-9A-F-]\{36\}" | head -1)
if [ -z "$SIM" ]; then
  SIM=$(xcrun simctl create "Pace Builder" \
    "com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro" \
    "com.apple.CoreSimulator.SimRuntime.iOS-27-2" 2>&1)
  echo "created sim: $SIM"
fi
echo "SIM=$SIM"
xcrun simctl boot "$SIM" 2>&1
xcrun simctl bootstatus "$SIM" -b 2>&1 | tail -1

wait_clear() {
  local n=0 waited=0
  while [ $waited -lt 1800 ]; do
    n=$(ps aux | grep "[x]codebuild" | wc -l | tr -d " ")
    if [ "$n" = "0" ]; then echo "clear window (waited ${waited}s)"; return 0; fi
    echo "WAITING clear window: $n xcodebuild lines, ${waited}s"
    sleep 60; waited=$((waited+60))
  done
  echo "PROCEEDING after 1800s wait with $n xcodebuild lines still live (named, not hidden)"
}

run_tests() {
  local label="$1"; shift
  wait_clear
  echo "STEP tests $label"
  xcrun simctl uninstall "$SIM" shop.ilseplacencia.pace 2>&1
  xcodebuild test-without-building -project Pace.xcodeproj -scheme Pace \
    -destination "platform=iOS Simulator,id=$SIM" \
    -derivedDataPath DerivedData CODE_SIGNING_ALLOWED=NO \
    "$@" > "tests-$label.log" 2>&1
  echo "$label exit $?"
  grep -E "Test Case '.*' (passed|failed)" "tests-$label.log" | sed 's/^ *//'
  grep -E "\*\* TEST (SUCCEEDED|FAILED)" "tests-$label.log" | tail -1
}

case "$STAGE" in
  build)
    # The P5 join test carries a placeholder where the twin's
    # public web key belongs; swap in the real key, read out
    # of PaceApp.swift's twin branch, Mac copy only.
    KEY=$(grep -o 'options.apiKey = "[^"]*"' Sources/PaceCalendar/PaceApp.swift | head -1 | sed 's/.*"\(.*\)"/\1/')
    if [ -n "$KEY" ]; then
      sed -i '' "s/AIzaSyDummyKeyReplacedAtDriveTime000000/$KEY/" Tests/PaceCalendarUITests/P5JoinUITests.swift
      echo "join-test key swapped (length ${#KEY})"
    fi
    echo "STEP xcodegen"
    ~/fitwalk/bin/xcodegen/bin/xcodegen generate > xcodegen.log 2>&1
    echo "xcodegen exit $?"
    wait_clear
    echo "STEP build-for-testing"
    xcodebuild build-for-testing -project Pace.xcodeproj -scheme Pace \
      -destination "platform=iOS Simulator,id=$SIM" \
      -derivedDataPath DerivedData CODE_SIGNING_ALLOWED=NO \
      > build-final.log 2>&1
    echo "build exit $?"
    grep -E "(BUILD|TEST BUILD) (SUCCEEDED|FAILED)" build-final.log | tail -1
    grep -E "error:" build-final.log | head -20
    ;;
  door)
    run_tests autofill -only-testing:PaceCalendarUITests/AutoFillOffTests
    run_tests door -only-testing:PaceCalendarUITests/PaceDoorUITests -resultBundlePath door-tests-final.xcresult
    ;;
  p3)
    run_tests p3 -only-testing:PaceCalendarUITests/CalendarUITests -only-testing:PaceCalendarUITests/CheckInUITests
    ;;
  p4)
    run_tests p4 -only-testing:PaceCalendarUITests/P4UITests
    ;;
  p5)
    run_tests p5 -only-testing:PaceCalendarUITests/P5UITests -only-testing:PaceCalendarUITests/P5JoinUITests
    ;;
  p6p7)
    run_tests p6p7 -only-testing:PaceCalendarUITests/P6UITests -only-testing:PaceCalendarUITests/P7UITests
    ;;
  full)
    run_tests full -resultBundlePath full-tests-final.xcresult
    ;;
esac

echo "STAGE $STAGE DONE $(date)"
