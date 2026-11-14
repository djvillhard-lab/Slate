#!/bin/sh
# Prints the export (signing) logs into the Xcode Cloud build log, so a failed
# TestFlight export shows its real reason without downloading artifacts.
for d in /Volumes/workspace/tmp/*-export-archive-logs; do
  [ -d "$d" ] || continue
  echo "===== $d ====="
  for f in "$d"/*.log; do
    [ -f "$f" ] || continue
    echo "--- $(basename "$f") (error lines) ---"
    grep -iE "error|fail|no profile|provisioning|certificate|entitlement|not found|denied|unable" "$f" | grep -v "^\s*$" | tail -n 40
  done
done
exit 0
