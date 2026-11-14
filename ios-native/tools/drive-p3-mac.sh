#!/bin/bash
# Pace P3 drive — runs ON the Mac, detached. Progress lands
# in ~/pace-native-build/p3-drive.log; per-run logs beside it.
# Own fresh sim "Pace Builder" — sim B is QA's, never touched.
cd ~/pace-native-build || exit 1
exec >> p3-drive.log 2>&1
echo "P3 DRIVE START $(date)"

SIM_NAME="Pace Builder"
SIM=$(xcrun simctl list devices | grep "$SIM_NAME" | grep -o "[0-9A-F-]\{36\}" | head -1)
if [ -z "$SIM" ]; then
  RT="com.apple.CoreSimulator.SimRuntime.iOS-27-2"
  DT="com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro"
  echo "STEP create sim $SIM_NAME type=$DT runtime=$RT"
  SIM=$(xcrun simctl create "$SIM_NAME" "$DT" "$RT" 2>&1)
  echo "created: $SIM"
fi
echo "SIM=$SIM"
xcrun simctl boot "$SIM" 2>&1
xcrun simctl bootstatus "$SIM" -b 2>&1 | tail -1

wait_clear() {
  # Never stack a Pace run on another desk's live xcodebuild
  # (Mac discipline of record). Cap the wait, then proceed
  # with the wait named in the log — waiting is not a state.
  local n=0 waited=0
  while [ $waited -lt 1800 ]; do
    n=$(ps aux | grep "[x]codebuild" | wc -l | tr -d " ")
    if [ "$n" = "0" ]; then echo "clear window (waited ${waited}s)"; return 0; fi
    echo "WAITING clear window: $n xcodebuild lines, ${waited}s"
    sleep 60; waited=$((waited+60))
  done
  echo "PROCEEDING after 1800s wait with $n xcodebuild lines still live (named, not hidden)"
}

echo "STEP xcodegen"
~/fitwalk/bin/xcodegen/bin/xcodegen generate > p3-xcodegen.log 2>&1
echo "xcodegen exit $?"

wait_clear
echo "STEP build-for-testing"
xcodebuild build-for-testing -project Pace.xcodeproj -scheme Pace \
  -destination "platform=iOS Simulator,id=$SIM" \
  -derivedDataPath DerivedData CODE_SIGNING_ALLOWED=NO \
  > p3-build.log 2>&1
echo "build exit $?"
grep -E "BUILD (SUCCEEDED|FAILED)" p3-build.log | tail -1
if ! grep -q "BUILD SUCCEEDED" p3-build.log; then echo "P3 DRIVE STOPPED AT BUILD"; exit 1; fi

run_tests() {
  local label="$1"; shift
  wait_clear
  echo "STEP tests $label"
  xcrun simctl uninstall "$SIM" shop.ilseplacencia.pace 2>&1
  xcodebuild test-without-building -project Pace.xcodeproj -scheme Pace \
    -destination "platform=iOS Simulator,id=$SIM" \
    -derivedDataPath DerivedData CODE_SIGNING_ALLOWED=NO \
    "$@" > "p3-tests-$label.log" 2>&1
  echo "$label exit $?"
  grep -E "Test Case '.*' (passed|failed)" "p3-tests-$label.log" | sed 's/^ *//'
  grep -E "TEST (SUCCEEDED|FAILED)" "p3-tests-$label.log" | tail -1
}

run_tests autofill -only-testing:PaceCalendarUITests/AutoFillOffTests
run_tests door -only-testing:PaceCalendarUITests/PaceDoorUITests -resultBundlePath door-tests-p3.xcresult
run_tests p3 -only-testing:PaceCalendarUITests/CalendarUITests -only-testing:PaceCalendarUITests/CheckInUITests

echo "P3 DRIVE DONE $(date)"
