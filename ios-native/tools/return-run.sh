#!/bin/bash
# Return-list drive — single-test runner, runs ON the Mac.
# Mirrors tools/drive-stage-mac.sh run_tests' flags exactly
# (ad-hoc trio, DerivedData, uninstall first, wait_clear),
# but runs ONE -only-testing spec with a KEPT result bundle.
# Usage: return-run.sh <label> <only-testing> <bundle-name>
LABEL="$1"; ONLY="$2"; BUNDLE="$3"
cd ~/pace-native-build || exit 1
exec >> "return-$LABEL-driver.log" 2>&1
echo "RETURN RUN $LABEL START $(date)"
SIM=743AC4C3-EC56-4154-8BE9-D64AFE94DA42
n=0
while [ $n -lt 1800 ]; do
  c=$(ps aux | grep "[x]codebuild" | wc -l | tr -d " ")
  if [ "$c" = "0" ]; then echo "clear window (waited ${n}s)"; break; fi
  echo "WAITING: $c xcodebuild lines, ${n}s"
  sleep 60; n=$((n+60))
done
rm -rf "$BUNDLE"
xcrun simctl uninstall "$SIM" shop.ilseplacencia.pace 2>&1
xcodebuild test-without-building -project Pace.xcodeproj -scheme Pace \
  -destination "platform=iOS Simulator,id=$SIM" \
  -derivedDataPath DerivedData CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGNING_REQUIRED=NO \
  -only-testing:"$ONLY" -resultBundlePath "$BUNDLE" > "tests-return-$LABEL.log" 2>&1
echo "$LABEL exit $?"
grep -E "Test Case '.*' (passed|failed)" "tests-return-$LABEL.log" | sed 's/^ *//'
grep -E "\*\* TEST (SUCCEEDED|FAILED)" "tests-return-$LABEL.log" | tail -1
echo "RETURN RUN $LABEL DONE $(date)"
