#!/bin/bash
# Pace finished-build drive — DESK side orchestrator.
# Syncs the finished tree to the Mac, then runs the stages
# in order, re-seeding the twin between write-proof groups
# and running each REST verify as its group lands. Every
# stage's logs are pulled into proofs/ at the end.
# Usage: tools/drive-all.sh [from-stage]
#   stages: build door p3 p4 p5 p6p7 full
set -u
cd ~/workspace/pace-native || exit 1
MAC=~/workspace/home-mac-bridge/my-side/mac-ssh.sh
FROM="${1:-build}"
ORDER="build door p3 p4 p5 p6p7 full"
run=0
[ "$FROM" = "build" ] && run=1

echo "== sync tree to Mac"
rsync -az --delete --exclude __pycache__ --exclude DerivedData \
  --exclude '*.log' --exclude '*.xcresult' \
  -e "ssh -i /home/hatch/.ssh/id_ed25519 -o IdentitiesOnly=yes -o ProxyCommand='node /home/hatch/workspace/home-mac-bridge/my-side/proxy-connect.js %h %p' -o UserKnownHostsFile=/home/hatch/workspace/home-mac-bridge/my-side/known_hosts -o ConnectTimeout=25" \
  ./ ilseplacencia@100.83.104.2:pace-native-build/ || { echo "SYNC FAILED"; exit 1; }
$MAC 'chmod +x ~/pace-native-build/tools/drive-stage-mac.sh'

stage() {
  echo "== STAGE $1"
  $MAC "cd ~/pace-native-build && rm -f drive-$1.log && nohup ./tools/drive-stage-mac.sh $1 >/dev/null 2>&1 &"
  # Poll the stage log until its DONE line stands.
  for i in $(seq 1 240); do
    sleep 30
    if $MAC "grep -q 'STAGE $1 DONE' ~/pace-native-build/drive-$1.log 2>/dev/null" 2>/dev/null; then
      echo "== STAGE $1 DONE"
      $MAC "tail -30 ~/pace-native-build/drive-$1.log"
      return 0
    fi
  done
  echo "== STAGE $1 TIMED OUT (log tail follows)"
  $MAC "tail -30 ~/pace-native-build/drive-$1.log"
  return 1
}

for s in $ORDER; do
  if [ "$s" = "$FROM" ]; then run=1; fi
  [ $run -eq 0 ] && continue
  case "$s" in
    build) stage build || exit 1 ;;
    door)  stage door || exit 1 ;;
    p3)
      TZ=Australia/Sydney python3 tools/seed-team-leg.py || exit 1
      stage p3 || exit 1
      TZ=Australia/Sydney python3 tools/verify-writes.py ;;
    p4)
      TZ=Australia/Sydney python3 tools/seed-team-leg.py || exit 1
      stage p4 || exit 1
      TZ=Australia/Sydney python3 tools/verify-writes-p4.py ;;
    p5)
      TZ=Australia/Sydney python3 tools/seed-team-leg.py || exit 1
      TZ=Australia/Sydney python3 tools/seed-team2.py || exit 1
      stage p5 || exit 1
      TZ=Australia/Sydney python3 tools/verify-writes-p5.py ;;
    p6p7)
      TZ=Australia/Sydney python3 tools/seed-team-leg.py || exit 1
      stage p6p7 || exit 1
      TZ=Australia/Sydney python3 tools/verify-writes-p6.py ;;
    full)
      TZ=Australia/Sydney python3 tools/seed-team-leg.py || exit 1
      TZ=Australia/Sydney python3 tools/seed-team2.py || exit 1
      stage full || exit 1 ;;
  esac
done

echo "== pull logs into proofs/"
mkdir -p proofs
for f in p3-drive.log drive-build.log drive-door.log drive-p3.log drive-p4.log \
         drive-p5.log drive-p6p7.log drive-full.log build-final.log \
         tests-autofill.log tests-door.log tests-p3.log tests-p4.log \
         tests-p5.log tests-p6p7.log tests-full.log; do
  $MAC "cat ~/pace-native-build/$f" > "proofs/final-$f" 2>/dev/null && echo "pulled $f"
done
echo "DRIVE-ALL DONE"
