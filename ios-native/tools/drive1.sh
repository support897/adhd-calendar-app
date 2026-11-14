#!/bin/bash
# Pace P2 drive step 1: install on sim B, launch check, AutoFill OFF prep.
# Runs detached on the Mac; progress lands in drive1.log.
cd ~/pace-native-build || exit 1
B=76379A40-DEE1-47C5-9140-3B314C7BBDCC
A=C87E70CF-201A-4659-AB69-7D8F51F47BD5
echo "STEP shutdown A (frees load; A is this desk's spare sim)"
xcrun simctl shutdown "$A" 2>&1
echo "STEP install B"
xcrun simctl install "$B" DerivedData/Build/Products/Debug-iphonesimulator/PaceCalendar.app 2>&1
echo "install exit $?"
echo "STEP launch B"
xcrun simctl launch "$B" shop.ilseplacencia.pace 2>&1
echo "launch exit $?"
xcrun simctl terminate "$B" shop.ilseplacencia.pace 2>&1
echo "STEP autofill test"
xcodebuild test -project Pace.xcodeproj -scheme Pace \
  -destination "platform=iOS Simulator,id=$B" \
  -only-testing:PaceCalendarUITests/AutoFillOffTests \
  -derivedDataPath DerivedData CODE_SIGNING_ALLOWED=NO \
  > autofill-test.log 2>&1
echo "autofill exit $?"
grep -E "TEST (SUCCEEDED|FAILED)" autofill-test.log | tail -1
echo "DRIVE1 DONE"
